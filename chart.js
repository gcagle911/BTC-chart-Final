async function fetchData() {
  const res = await fetch("https://btc-spread-test-pipeline.onrender.com/output.json");
  if (!res.ok) throw new Error("Failed to load JSON");
  return await res.json();
}

function showError(msg) {
  document.getElementById("error").textContent = msg;
}

fetchData().then(data => {
  const chart = LightweightCharts.createChart(document.getElementById("chart"), {
    layout: { background: { color: 'black' }, textColor: 'white' },
    grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
    timeScale: { timeVisible: true, secondsVisible: false },
    rightPriceScale: { borderColor: "#71649C" },
  });

  const candlestickSeries = chart.addCandlestickSeries();
  const ma50 = chart.addLineSeries({ color: "white", lineWidth: 2 });
  const ma100 = chart.addLineSeries({ color: "gold", lineWidth: 2 });
  const ma200 = chart.addLineSeries({ color: "pink", lineWidth: 2 });

  // Prepare the candle and line data
  const candles = [];
  const ma50Data = [];
  const ma100Data = [];
  const ma200Data = [];

  for (const d of data) {
    const t = Math.floor(new Date(d.time).getTime() / 1000);

    // Mock candle from single price point
    candles.push({
      time: t,
      open: d.price,
      high: d.price,
      low: d.price,
      close: d.price
    });

    ma50Data.push({ time: t, value: d.ma_50 });
    ma100Data.push({ time: t, value: d.ma_100 });
    ma200Data.push({ time: t, value: d.ma_200 });
  }

  candlestickSeries.setData(candles);
  ma50.setData(ma50Data);
  ma100.setData(ma100Data);
  ma200.setData(ma200Data);
})
.catch(err => showError(err.message));
