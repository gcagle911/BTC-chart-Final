async function drawMA() {
  try {
    const res = await fetch("https://btc-spread-logger.onrender.com/output.json");
    const data = await res.json();

    const ma50 = data.filter(d => d.ma_50 != null);
    const ma100 = data.filter(d => d.ma_100 != null);
    const ma200 = data.filter(d => d.ma_200 != null);

    log(`✅ JSON fetched, ma50: ${ma50.length}, ma100: ${ma100.length}, ma200: ${ma200.length}`);

    // Canvas setup
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.7;
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = 10;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    // Scaling logic
    const values = data.flatMap(d => [d.ma_50, d.ma_100, d.ma_200].filter(v => v != null));
    const min = Math.min(...values);
    const max = Math.max(...values);

    const scaleY = val => {
      const amplified = val * 1_000_000;
      return canvas.height - ((amplified - min * 1_000_000) / ((max - min) * 1_000_000)) * canvas.height;
    };

    const scaleX = (index, total) => (index / total) * canvas.width;

    function drawLine(points, color) {
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      points.forEach((pt, i) => {
        const x = scaleX(i, points.length);
        const y = scaleY(pt);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw all three MAs
    drawLine(ma50.map(d => d.ma_50), "white");
    drawLine(ma100.map(d => d.ma_100), "gold");
    drawLine(ma200.map(d => d.ma_200), "hotpink");

    // ✅ Debug Box
    const logDiv = document.createElement("div");
    logDiv.style.position = "absolute";
    logDiv.style.bottom = "0";
    logDiv.style.left = "0";
    logDiv.style.background = "black";
    logDiv.style.color = "lime";
    logDiv.style.fontSize = "12px";
    logDiv.style.padding = "4px";
    logDiv.innerText = `✅ Lines drawn\nma100: ${ma100.length}, ma50: ${ma50.length}`;
    document.body.appendChild(logDiv);

  } catch (e) {
    console.error("❌ Error drawing MAs:", e);
  }
}

drawMA();
