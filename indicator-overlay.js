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

  // Ensure dedicated invisible series for A and B markers so both can render on the same bar
  function getOrCreateOverlaySeries(key){
    const chart = window.chart || null;
    if (!chart) return null;
    const storeKey = key === 'A' ? '__overlaySeriesA' : '__overlaySeriesB';
    if (window[storeKey]) return window[storeKey];
    try {
      const s = chart.addLineSeries({
        color: 'transparent',
        lineWidth: 0,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      window[storeKey] = s;
      return s;
    } catch (e) {
      log('failed to create overlay series', e);
      return null;
    }
  }

  function setSeriesMarkers(markersA, markersB){
    const sA = getOrCreateOverlaySeries('A');
    const sB = getOrCreateOverlaySeries('B');
    let ok = false;
    try { if (sA && typeof sA.setMarkers === 'function') { sA.setMarkers(markersA || []); ok = true; } } catch(_) {}
    try { if (sB && typeof sB.setMarkers === 'function') { sB.setMarkers(markersB || []); ok = true; } } catch(_) {}
    if (ok) return true;
    // Fallback: single-series (might drop duplicates on same bar)
    const s = window.__priceSeries || window.seriesPrice || window.priceSeries || (window.series && window.series.price) || null;
    if (s && typeof s.setMarkers === 'function') {
      const merged = ([]).concat(markersA || [], markersB || []);
      s.setMarkers(merged);
      try { s._markers = merged; } catch(_) {}
      return true;
    }
    log('no series available to set markers');
    return false;
  }

  async function drawOnce(){
    const { ex, sym } = getChartState();
    if (!ex || !sym) { log("missing chart state"); return; }
    let data;
    try { data = await fetchIndicators(ex, sym); }
    catch(e){ log("fetch failed:", e); return; }

    const markersA = ENABLED.A ? toMarkers(data.A, STYLE.A) : [];
    const markersB = ENABLED.B ? toMarkers(data.B, STYLE.B) : [];

    const ok = setSeriesMarkers(markersA, markersB);
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