const canvas = document.createElement("canvas");
canvas.style.position = "absolute";
canvas.style.top = "0";
canvas.style.left = "0";
canvas.style.width = "100%";
canvas.style.height = "100%";
canvas.style.pointerEvents = "none";
canvas.style.zIndex = "9999";
document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

async function drawMA() {
  const res = await fetch("https://btc-spread-test-pipeline.onrender.com/output.json");
  const data = await res.json();

  const ma50 = data.filter(d => d.ma_50 !== null);
  const ma100 = data.filter(d => d.ma_100 !== null);
  const ma200 = data.filter(d => d.ma_200 !== null);

  function scaleY(val) {
  return canvas.height - (val * 100000); 
}  // Adjust to compress/spread line scale
  }

  function scaleX(index, total) {
    return (index / total) * canvas.width;
  }

  function drawLine(data, key, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    data.forEach((point, i) => {
      const x = scaleX(i, data.length);
      const y = scaleY(point[key]);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawLine(ma50, "ma_50", "white");
  drawLine(ma100, "ma_100", "gold");
  drawLine(ma200, "ma_200", "deeppink");
  // TEMP: Show test line to verify canvas is drawing
const testData = [
  { ma_50: 0.001 },
  { ma_50: 0.0015 },
  { ma_50: 0.002 },
  { ma_50: 0.0017 },
  { ma_50: 0.0019 },
];
drawLine(testData, "ma_50", "white");
}

setInterval(drawMA, 60000); // redraw every minute
window.addEventListener("resize", () => drawMA());
drawMA();
