(() => {
  const API_BASE = (window.__INDICATOR_API_BASE || "https://indicator-api-yw8m.onrender.com").replace(/\/+$/,"");
  const BACKFILL_DAYS = window.__IND_DAYS || 10;
  const STYLE = {
    A: { shape: "circle", color: "#3B82F6", position: "belowBar", text: "A" },
    B: { shape: "square", color: "#8B5CF6", position: "aboveBar", text: "B" },
  };

  let ENABLED = { A: true, B: true };

  function log(...args){ if (window.__AB_DEBUG) console.debug("[overlay]", ...args); }

  function getChartState() {
    const st = window.__chartState || {};
    const ex  = st.ex  || window.API_EXCHANGE || window?.tfMgr?.rawData?.[0]?.exchange || "coinbase";
    const sym = st.sym || (window.manager && window.manager.currentSymbol) || window?.tfMgr?.rawData?.[0]?.asset || "BTC";
    const tf  = st.tf  || (window.manager && window.manager.currentTimeframe) || "1m";
    return { ex, sym, tf };
  }

  async function fetchIndicators(ex, sym) {
    const url = `${API_BASE}/api/indicators?ex=${encodeURIComponent(ex)}&sym=${encodeURIComponent(sym)}&ind=AB&days=${BACKFILL_DAYS}`;
    log("fetch:", url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    const obj = json.AB || json;
    return { A: obj.A || [], B: obj.B || [] };
  }

  function toMarkers(tsList, style){
    return (tsList || []).map(t => ({
      time: Number(t), position: style.position, shape: style.shape, color: style.color, text: style.text
    }));
  }

  function setSeriesMarkersAnchored(markersA, markersB){
    const s =
      window.__priceSeries ||
      window.seriesPrice ||
      window.priceSeries ||
      (window.series && window.series.price) || null;
    if (!s || typeof s.setMarkers !== 'function') {
      log('price series not ready');
      return false;
    }
    const byTime = new Map();
    for (const m of (markersA || [])) byTime.set(m.time, { A: m, B: null });
    for (const m of (markersB || [])) {
      const cur = byTime.get(m.time);
      if (cur) cur.B = m; else byTime.set(m.time, { A: null, B: m });
    }
    const merged = [];
    for (const [t, pair] of byTime.entries()) {
      if (pair.A && pair.B) {
        merged.push({
          time: t,
          position: 'inBar',
          shape: 'text',
          color: '#e0e7ff',
          text: 'A·B',
        });
      } else if (pair.A) {
        merged.push(pair.A);
      } else if (pair.B) {
        merged.push(pair.B);
      }
    }
    merged.sort((a,b) => a.time - b.time);
    s.setMarkers(merged);
    try { s._markers = merged; } catch(_) {}
    return true;
  }

  async function drawOnce(){
    const { ex, sym } = getChartState();
    if (!ex || !sym) { log("missing chart state"); return; }
    let data;
    try { data = await fetchIndicators(ex, sym); }
    catch(e){ log("fetch failed:", e); return; }

    const markersA = ENABLED.A ? toMarkers(data.A, STYLE.A) : [];
    const markersB = ENABLED.B ? toMarkers(data.B, STYLE.B) : [];
    const ok = setSeriesMarkersAnchored(markersA, markersB);
    log("markers set:", ok ? (markersA.length + markersB.length) : 0);
  }

  window.__IndicatorOverlay = {
    refresh: () => drawOnce(),
    setEnabled: (flags={}) => {
      if (typeof flags.A === "boolean") {
        ENABLED.A = flags.A;
        log("A enabled:", flags.A);
      }
      if (typeof flags.B === "boolean") {
        ENABLED.B = flags.B;
        log("B enabled:", flags.B);
      }
      log("Current state:", ENABLED);
    },
    getEnabled: () => ({ ...ENABLED }),
    startPolling: async (ms=60000) => { while(true){ await drawOnce(); await new Promise(r=>setTimeout(r, ms)); } }
  };

  setTimeout(drawOnce, 500);
})();