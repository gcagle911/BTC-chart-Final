const chart = LightweightCharts.createChart(document.getElementById('chart'), {
  layout: { background: { color: '#000' }, textColor: '#ccc' },
  grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' }},
  timeScale: { timeVisible: true, secondsVisible: true },
});

const candleSeries = chart.addCandlestickSeries();
const ma50 = chart.addLineSeries({ color: 'white', lineWidth: 2 });
const ma100 = chart.addLineSeries({ color: 'gold', lineWidth: 2 });
const ma200 = chart.addLineSeries({ color: 'pink', lineWidth: 2 });

async function loadPriceAndMA() {
  // 1. Get candlestick data from Coinbase
  const res = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60');
  const rawCandles = await res.json();

  const candles = rawCandles.map(c => ({
    time: c[0],
    open: c[3],
    high: c[2],
    low: c[1],
    close: c[4],
  })).reverse();

  candleSeries.setData(candles);

  // 2. Get your MAs from Render
  const maRes = await fetch('https://btc-spread-test-pipeline.onrender.com/output.json');
  const maJson = await maRes.json();

  const ma50Data = [];
  const ma100Data = [];
  const ma200Data = [];

  maJson.forEach(entry => {
    const timestamp = Math.floor(new Date(entry.time).getTime() / 1000);
    if (entry.ma_50 !== null) ma50Data.push({ time: timestamp, value: entry.ma_50 });
    if (entry.ma_100 !== null) ma100Data.push({ time: timestamp, value: entry.ma_100 });
    if (entry.ma_200 !== null) ma200Data.push({ time: timestamp, value: entry.ma_200 });
  });

  ma50.setData(ma50Data);
  ma100.setData(ma100Data);
  ma200.setData(ma200Data);
}

loadPriceAndMA();
