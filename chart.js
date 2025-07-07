const mainChart = LightweightCharts.createChart(document.getElementById('main-chart'), {
  layout: { background: { color: '#000' }, textColor: '#DDD' },
  grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
  timeScale: { timeVisible: true, secondsVisible: false },
  crosshair: { mode: 0 },
});
const zChart = LightweightCharts.createChart(document.getElementById('zscore-chart'), {
  layout: { background: { color: '#000' }, textColor: '#DDD' },
  grid: { vertLines: { color: '#222' }, horzLines: { color: '#222' } },
  timeScale: { timeVisible: true, secondsVisible: false },
  crosshair: { mode: 0 },
});

// Candle chart
const candleSeries = mainChart.addCandlestickSeries();
const ma50 = mainChart.addLineSeries({ color: 'white', lineWidth: 2 });
const ma100 = mainChart.addLineSeries({ color: 'gold', lineWidth: 2 });
const ma200 = mainChart.addLineSeries({ color: 'pink', lineWidth: 2 });

// Z-score (bottom panel)
const zSeries = zChart.addLineSeries({ color: 'cyan', lineWidth: 2 });

fetch('https://btc-spread-test-pipeline.onrender.com/output.json')
  .then(response => response.json())
  .then(data => {
    const candles = [];
    const line50 = [];
    const line100 = [];
    const line200 = [];
    const zscore = [];

    data.forEach(entry => {
      const timestamp = Math.floor(new Date(entry.time).getTime() / 1000);
      const price = entry.price;

      // Fake OHLC from price (flat candle for now)
      candles.push({
        time: timestamp,
        open: price,
        high: price,
        low: price,
        close: price,
      });

      line50.push({ time: timestamp, value: entry.ma_50 });
      line100.push({ time: timestamp, value: entry.ma_100 });
      line200.push({ time: timestamp, value: entry.ma_200 });

      // Optional: z-score = (spread - ma_200) / std (placeholder)
      const z = (entry.spread_avg_L20_pct - entry.ma_200) / 0.0025;
      zscore.push({ time: timestamp, value: z });
    });

    candleSeries.setData(candles);
    ma50.setData(line50);
    ma100.setData(line100);
    ma200.setData(line200);
    zSeries.setData(zscore);
  })
  .catch(err => {
    console.error('Failed to load data:', err);
  });
