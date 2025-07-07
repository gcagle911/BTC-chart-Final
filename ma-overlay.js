console.log("🟡 Fetching overlay data...");

fetch("https://btc-spread-test-pipeline.onrender.com/output.json")
  .then((res) => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  })
  .then((data) => {
    console.log("🟢 Data received", data);

    const canvas = document.createElement("canvas");
    canvas.id = "ma-overlay";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "99";
    document.body.appendChild(canvas);

    const ctx = canvas.getContext("2d");

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    const values = data.map((d) => d.ma_50);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const scaleY = (val) => {
      const amplified = val * 1_000_000;
      return (
        canvas.height -
        ((amplified - min * 1_000_000) / ((max - min) * 1_000_000)) *
          canvas.height
      );
    };

    const scaleX = (index, total) => {
      return (index / total) * canvas.width;
    };

    const drawLine = (color, key) => {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
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
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawLine("white", "ma_50");
      drawLine("gold", "ma_100");
      drawLine("pink", "ma_200");
    };

    window.addEventListener("resize", resize);
    resize();
  })
  .catch((err) => {
    console.error("🟥 Overlay draw failed:", err);
    const fail = document.createElement("div");
    fail.textContent = `❌ MA draw error: ${err.name} - ${err.message}`;
    fail.style.position = "absolute";
    fail.style.bottom = "0";
    fail.style.left = "0";
    fail.style.color = "red";
    fail.style.fontSize = "14px";
    fail.style.fontFamily = "monospace";
    document.body.appendChild(fail);
  });
