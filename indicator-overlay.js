(() => {
  // Which series are shown (controlled by UI toggles)
  let ENABLED = { A: true, B: true };

  const API_BASE = (window.__INDICATOR_API_BASE || "https://indicator-api-yw8m.onrender.com").replace(/\/+$/,"");

  const STYLE = {
    A: { shape: 'diamond', color: '#3B82F6', position: 'belowBar', text: 'A' },   // blue
    B: { shape: 'square',  color: '#8B5CF6', position: 'aboveBar', text: 'B' }    // purple
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const toMarkers = (tsList, s) => (tsList || []).map(t => ({
    time: Number(t), position: s.position, color: s.color, shape: s.shape, text: s.text
  }));

  async function fetchIndicators(ex, sym, tf) {
    const url = `${API_BASE}/api/indicators?ex=${encodeURIComponent(ex)}&sym=${encodeURIComponent(sym)}&ind=AB&days=30`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json(); // { A: [...], B: [...] } or { AB: [...] } depending on backend
  }

  function mergeMarkers(existing, data) {
    // accept either {A,B} or {AB}
    const AB = data.A || data.AB || [];
    const base = Array.isArray(existing) ? existing.filter(m => !(m && (m.text === 'A' || m.text === 'B'))) : [];
    const out = [...base];
    if (Array.isArray(AB) && AB.length && (!data.A && !data.B)) {
      // older backend: single AB list -> show as A by default
      if (ENABLED.A) out.push(...toMarkers(AB, STYLE.A));
      return out;
    }
    if (ENABLED.A && Array.isArray(data.A)) out.push(...toMarkers(data.A, STYLE.A));
    if (ENABLED.B && Array.isArray(data.B)) out.push(...toMarkers(data.B, STYLE.B));
    return out;
  }

  async function drawOnce() {
    const s = window.__priceSeries;
    const st = window.__chartState;
    if (!s || !st || !st.ex || !st.sym) return;
    try {
      const data = await fetchIndicators(st.ex, st.sym, st.tf);
      const merged = mergeMarkers(s._markers || [], data || {});
      if (typeof s.setMarkers === 'function') {
        s.setMarkers(merged);
        s._markers = merged;
      }
      if (window.__AB_DEBUG) console.debug('[overlay] markers set:', merged.length);
    } catch (e) {
      if (window.__AB_DEBUG) console.warn('[overlay] fetch/draw failed:', e);
    }
  }

  // Public API for chart.js / UI
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

  // Initial draw if chart already exposed hooks
  if (window.__priceSeries && window.__chartState) drawOnce();
})();