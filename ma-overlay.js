window.addEventListener("load", async () => {
  // Wait a bit for TradingView chart to render
  await new Promise(resolve => setTimeout(resolve, 2000));

  const tvChart = document.getElementById("tradingview_chart");
  if (!tvChart) {
    console.error("❌ TradingView chart not found.");
    return;
  }

  // Create transparent overlay canvas
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.top = "0";
  overlayCanvas.style.left = "0";
  overlayCanvas.style.pointerEvents = "none";
  overlayCanvas.style.zIndex = "1000";
  overlayCanvas.width = tvChart.clientWidth;
  overlayCanvas.height = tvChart.clientHeight;
  tvChart.appendChild(overlayCanvas);

  const ctx = overlayCanvas.getContext("2d");

  // Resize if window changes
  window.addEventListener("resize", () => {
    overlayCanvas.width = tvChart.clientWidth;
    overlayCanvas.height = tvChart.clientHeight;
  });

  try {
    const res = await fetch("https://btc-spread-logger.onrender.com/output.json");
    const data = await res.json();

    const ma50 = data.filter(d => d.ma_50 != null);
    const ma100 = data.filter(d => d.ma_100 != null);
    const ma200 = data.filter(d => d.ma_200 != null);

    const values = data.flatMap(d => [d.ma_50, d.ma_100, d.ma_200].filter(v => v != null));
    const min = Math.min(...values);
    const max = Math.max(...values);

    const scaleY = val => {
      const amplified = val * 1_000_000;
      return overlayCanvas.height - ((amplified - min * 1_000_000) / ((max - min) * 1_000_000)) * overlayCanvas.height;
    };
    const scaleX = (index, total) => (index / total) * overlayCanvas.width;

    const drawLine = (points, color) => {
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(scaleX(0, points.length), scaleY(points[0]));
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(scaleX(i, points.length), scaleY(points[i]));
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawLine(ma50.map(d => d.ma_50), "white");
    drawLine(ma100.map(d => d.ma_100), "gold");
    drawLine(ma200.map(d => d.ma_200), "pink");

    const label = document.createElement("div");
    label.textContent = `✅ MAs drawn (50/100/200)`;
    label.style.position = "absolute";
    label.style.bottom = "10px";
    label.style.left = "10px";
    label.style.color = "lime";
    label.style.fontSize = "14px";
    label.style.background = "black";
    label.style.padding = "3px 6px";
    tvChart.appendChild(label);

  } catch (err) {
    const fail = document.createElement("div");
    fail.textContent = `❌ MA draw error: ${err.message}`;
    fail.style.position = "absolute";
    fail.style.bottom = "10px";
    fail.style.left = "10px";
    fail.style.color = "red";
    fail.style.fontSize = "14px";
    tvChart.appendChild(fail);
    console.error("Overlay draw failed", err);
  }
});
