(() => {
  // Which series are shown (controlled by UI toggles in chart.js)
  let ENABLED = { A: true, B: true };

  const API_BASE = (window.__INDICATOR_API_BASE || "https://indicator-api-yw8m.onrender.com").replace(/\/+$/,"");

  const STYLE = {
    A: { shape: 'diamond', color: '#3B82F6', position: 'belowBar', text: 'A' },
    B: { shape: 'square',  color: '#8B5CF6', position: 'aboveBar', text: 'B' }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const toMarkers = (tsList, style) => (tsList || []).map(t => ({
    time: Number(t), position: style.position, color: style.color, shape: style.shape, text: style.text
  }));

  async function fetchIndicators(ex, sym, tf) {
    const url = `${API_BASE}/api/indicators?ex=${encodeURIComponent(ex)}&sym=${encodeURIComponent(sym)}&ind=AB`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }

  function mergeABMarkers(existing, AB) {
    const base = Array.isArray(existing) ? existing.filter(m => !(m && (m.text === 'A' || m.text === 'B'))) : [];
    const out = [...base];
    if (ENABLED.A) out.push(...toMarkers(AB.A, STYLE.A));
    if (ENABLED.B) out.push(...toMarkers(AB.B, STYLE.B));
    return out;
  }

  async function drawOnce() {
    const s = window.__priceSeries;
    const st = window.__chartState;
    if (!s || !st || !st.ex || !st.sym) return;

    try {
      const data = await fetchIndicators(st.ex, st.sym, st.tf);
      const merged = mergeABMarkers(s._markers || [], data || {});
      if (typeof s.setMarkers === 'function') {
        s.setMarkers(merged);
        s._markers = merged;
      }
      if (window.__AB_DEBUG) console.debug('[overlay] markers set:', merged.length);
    } catch (e) {
      if (window.__AB_DEBUG) console.warn('[overlay] fetch/draw failed:', e);
    }
  }

  window.__IndicatorOverlay = {
    refresh: () => drawOnce(),
    setEnabled: (flags = {}) => {
      if (typeof flags.A === 'boolean') ENABLED.A = flags.A;
      if (typeof flags.B === 'boolean') ENABLED.B = flags.B;
    },
    startPolling: async (ms = 60000) => {
      while (true) { await drawOnce(); await sleep(ms); }
    }
  };

  if (window.__priceSeries && window.__chartState) {
    drawOnce();
  }
})();