async function fetchData() {
  const response = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
  return await response.json();
}

function toUnixTimestamp(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function setupChart(data) {
  const chart = LightweightCharts.createChart(document.getElementById('chart'), {
    layout: {
      background: { color: '#131722' },
      textColor: '#D1D4DC',
    },
    grid: {
      vertLines: { color: '#2B2B43' },
      horzLines: { color: '#2B2B43' },
    },
    rightPriceScale: {
      visible: true,
    },
    leftPriceScale: {
      visible: true,
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
    }
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

  const priceData = data.map(d => ({
    time: toUnixTimestamp(d.time),
    value: d.price,
  }));

  const ma50Data = data.map(d => ({
    time: toUnixTimestamp(d.time),
    value: d.ma_50,
  }));

  const ma100Data = data.map(d => ({
    time: toUnixTimestamp(d.time),
    value: d.ma_100,
  }));

  const ma200Data = data.map(d => ({
    time: toUnixTimestamp(d.time),
    value: d.ma_200,
  }));

  priceSeries.setData(priceData);
  ma50.setData(ma50Data);
  ma100.setData(ma100Data);
  ma200.setData(ma200Data);
}

fetchData().then(setupChart);
