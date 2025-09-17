(() => {
  const colorA = '#4AB8FF'; // Blue diamond
  const colorB = '#B366FF'; // Purple square

  const markerShapeA = 'diamond';
  const markerShapeB = 'square';

  let enabled = { A: true, B: true };
  let markers = [];

  function getChartContext() {
    const ex = window?.tfMgr?.rawData?.[0]?.exchange;
    const sym = window?.tfMgr?.rawData?.[0]?.asset;
    return { ex, sym };
  }

  async function fetchIndicatorData() {
    const { ex, sym } = getChartContext();
    if (!ex || !sym) return {};

    const url = `/api/indicators?ex=${ex}&sym=${sym}&ind=AB&days=10`;
    const res = await fetch(url);
    const json = await res.json();
    return json?.AB || {};
  }

  function drawMarkers(data) {
    markers.length = 0;

    const add = (ts, color, shape, label) => {
      markers.push({
        time: ts,
        position: 'aboveBar',
        shape,
        color,
        id: `${label}_${ts}`,
        text: label
      });
    };

    for (const t of (data.A || [])) if (enabled.A) add(t, colorA, markerShapeA, 'A');
    for (const t of (data.B || [])) if (enabled.B) add(t, colorB, markerShapeB, 'B');

    if (window?.setMarkers) window.setMarkers(markers);
  }

  async function refresh() {
    const data = await fetchIndicatorData();
    drawMarkers(data);
  }

  function setEnabled(e) {
    enabled = { ...enabled, ...e };
    refresh();
  }

  // Wire globally
  window.__IndicatorOverlay = { refresh, setEnabled };
})();
