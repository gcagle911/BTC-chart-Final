window.addEventListener("load", async () => {
  const canvas = document.querySelector("canvas");

  if (!canvas) {
    const err = document.createElement("div");
    err.textContent = "❌ Canvas not found";
    err.style.position = "absolute";
    err.style.bottom = "10px";
    err.style.left = "10px";
    err.style.color = "red";
    err.style.fontSize = "16px";
    document.body.appendChild(err);
    return;
  }

  const ctx = canvas.getContext("2d");

  try {
    const res = await fetch("https://btc-spread-logger.onrender.com/output.json");
    const data = await res.json();
    console.log("✅ JSON fetched", data);

    const ma50 = data.filter(d => d.ma_50 != null);
    const ma100 = data.filter(d => d.ma_100 != null);
    const ma200 = data.filter(d => d.ma_200 != null);

    // Get min/max for scaling
    const values = data.flatMap(d => [d.ma_50, d.ma_100, d.ma_200].filter(v => v != null));
    const min = Math.min(...values);
    const max = Math.max(...values);

    const scaleY = val => {
      const amplified = val * 1_000_000;
      return canvas.height - ((amplified - min * 1_000_000) / ((max - min) * 1_000_000)) * canvas.height;
    };
    const scaleX = (index, total) => (index / total) * canvas.width;

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

    // ✅ Visual debug
    const info = document.createElement("div");
    info.textContent = `✅ MAs drawn — ma50: ${ma50.length}, ma100: ${ma100.length}, ma200: ${ma200.length}`;
    info.style.position = "absolute";
    info.style.bottom = "10px";
    info.style.left = "10px";
    info.style.color = "green";
    info.style.background = "black";
    info.style.padding = "4px";
    info.style.fontSize = "14px";
    document.body.appendChild(info);

  } catch (err) {
    const fail = document.createElement("div");
    fail.textContent = `❌ MA overlay error: ${err.message}`;
    fail.style.position = "absolute";
    fail.style.bottom = "10px";
    fail.style.left = "10px";
    fail.style.color = "red";
    fail.style.fontSize = "16px";
    document.body.appendChild(fail);
    console.error("Overlay script failed:", err);
  }
});
