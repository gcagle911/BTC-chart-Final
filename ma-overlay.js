// Create the canvas and overlay it on top of the chart
const canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = "9999";
document.body.appendChild(canvas);  // ✅ Attach to body, not chart div

const ctx = canvas.getContext("2d");

// Async function to fetch and draw MAs
async function drawMA() {
  try {
    const res = await fetch("https://btc-spread-test-pipeline.onrender.com/output.json");
    const data = await res.json();

    // Filter out bad values
    const ma50 = data.filter(d => d.ma_50 !== null && d.ma_50 !== undefined);
    const ma100 = data.filter(d => d.ma_100 !== null && d.ma_100 !== undefined);
    const ma200 = data.filter(d => d.ma_200 !== null && d.ma_200 !== undefined);

    // Clear old lines
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rescale Y based on value (adjust multiplier if needed)
    const scaleY = (val) => canvas.height - (val * 100000); // adjust for visual height
    const scaleX = (index, total) => (index / total) * canvas.width;

    // Generic line drawer
    function drawLine(data, key, color) {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;

      data.forEach((point, i) => {
        const x = scaleX(i, data.length);
        const y = scaleY(point[key]);
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw all 3 lines
    drawLine(ma50, "ma_50", "white");
    drawLine(ma100, "ma_100", "gold");
    drawLine(ma200, "ma_200", "deeppink");

  } catch (err) {
    console.error("Error drawing MAs:", err);
  }
}

// Redraw every minute
setInterval(drawMA, 60000);
window.addEventListener("resize", drawMA);
drawMA();  // Initial call
