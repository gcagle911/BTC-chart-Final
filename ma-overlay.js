// Add overlay canvas
const canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = "9999";
document.getElementById("tradingview_chart").appendChild(canvas);

const ctx = canvas.getContext("2d");

// ⬇️ Add screen logging (mobile-friendly)
function log(msg) {
  const logDiv = document.createElement("div");
  logDiv.style.position = "absolute";
  logDiv.style.bottom = "0";
  logDiv.style.left = "0";
  logDiv.style.color = "lime";
  logDiv.style.fontSize = "12px";
  logDiv.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
  logDiv.style.padding = "4px";
  logDiv.innerText = msg;
  document.body.appendChild(logDiv);
}

// Draw MAs from JSON
async function drawMA() {
  try {
    log("🟡 Fetching JSON...");
    const res = await fetch("https://btc-spread-test-pipeline.onrender.com/output.json");
    const data = await res.json();
    log("✅ JSON fetched");

    const ma50 = data.filter(d => d.ma_50 != null);
    const ma100 = data.filter(d => d.ma_100 != null);
    const ma200 = data.filter(d => d.ma_200 != null);
    log(`📊 ma50: ${ma50.length}, ma100: ${ma100.length}, ma200: ${ma200.length}`);

    // Dynamically scale based on min/max of all MAs
const values = data.flatMap(d => [d.ma_50, d.ma_100, d.ma_200]).filter(v => v != null);
const min = Math.min(...values);
const max = Math.max(...values);

const scaleY = val => {
  const amplified = val * 1_000_000;
return canvas.height - ((amplified - min * 1_000_000) / ((max - min) * 1_000_000)) * canvas.height;

    const scaleX = (index, total) => {
      return (index / total) * canvas.width;
    };

    // Drawing function
    function drawLine(points, color) {
      if (points.length === 0) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      points.forEach((pt, i) => {
        const x = scaleX(i, points.length);
        const y = scaleY(pt.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
    }

    // Convert each MA array to drawable format
    const ma50Points = ma50.map(d => ({ value: d.ma_50 }));
    const ma100Points = ma100.map(d => ({ value: d.ma_100 }));
    const ma200Points = ma200.map(d => ({ value: d.ma_200 }));

    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawLine(ma50Points, "white");
    drawLine(ma100Points, "gold");
    drawLine(ma200Points, "hotpink");
    log("✅ Lines drawn");

  } catch (err) {
    log("❌ Error loading JSON or drawing: " + err.message);
  }
}

// Wait for TradingView to fully render, then draw
setTimeout(drawMA, 3000);
