const chart = LightweightCharts.createChart(document.getElementById('chart'), {
  layout: {
    background: { color: '#131722' },
    textColor: '#D1D4DC',
  },
  grid: {
    vertLines: { color: '#2B2B43' },
    horzLines: { color: '#2B2B43' },
  },
  rightPriceScale: { visible: true },
  leftPriceScale: { visible: true },
  timeScale: { timeVisible: true, secondsVisible: false },
});

const priceSeries = chart.addLineSeries({
  priceScaleId: 'right',
  color: '#00ffff',
  lineWidth: 2,
});

const ma50 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ffffff',
  lineWidth: 1,
});

const ma100 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ffd700',
  lineWidth: 1,
});

const ma200 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ff69b4',
  lineWidth: 1,
});

function toUnixTimestamp(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

let lastTimestamp = 0;

async function fetchAndUpdate() {
  try {
    const res = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
    const data = await res.json();

    const newPrice = [];
    const new50 = [];
    const new100 = [];
    const new200 = [];

    data.forEach(d => {
      const t = toUnixTimestamp(d.time);
      if (t > lastTimestamp) {
        newPrice.push({ time: t, value: d.price });
        if (d.ma_50 !== null) new50.push({ time: t, value: d.ma_50 });
        if (d.ma_100 !== null) new100.push({ time: t, value: d.ma_100 });
        if (d.ma_200 !== null) new200.push({ time: t, value: d.ma_200 });
        lastTimestamp = t;
      }
    });

    newPrice.forEach(p => priceSeries.update(p));
    new50.forEach(p => ma50.update(p));
    new100.forEach(p => ma100.update(p));
    new200.forEach(p => ma200.update(p));

  } catch (err) {
    console.error('Fetch/update error:', err);
  }
}

// Initial load (sets all historical data)
async function initializeChart() {
  const res = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
  const data = await res.json();

  const priceData = [];
  const ma50Data = [];
  const ma100Data = [];
  const ma200Data = [];

  data.forEach(d => {
    const t = toUnixTimestamp(d.time);
    priceData.push({ time: t, value: d.price });
    if (d.ma_50 !== null) ma50Data.push({ time: t, value: d.ma_50 });
    if (d.ma_100 !== null) ma100Data.push({ time: t, value: d.ma_100 });
    if (d.ma_200 !== null) ma200Data.push({ time: t, value: d.ma_200 });
    if (t > lastTimestamp) lastTimestamp = t;
  });

  priceSeries.setData(priceData);
  ma50.setData(ma50Data);
  ma100.setData(ma100Data);
  ma200.setData(ma200Data);
}

initializeChart();
setInterval(fetchAndUpdate, 15000); // every 15 seconds
