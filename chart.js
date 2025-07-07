const chart = LightweightCharts.createChart(document.getElementById('chart'), {
  width: window.innerWidth,
  height: window.innerHeight,
  layout: {
    backgroundColor: '#000000',
    textColor: '#ffffff',
  },
  grid: {
    vertLines: { color: '#444' },
    horzLines: { color: '#444' },
  },
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
  },
});

async function fetchData() {
  try {
    const response = await fetch('https://btc-spread-test-pipeline.onrender.com/output.json');
    const data = await response.json();

    const priceSeries = chart.addLineSeries({ color: '#00ffff', lineWidth: 2 });
    const ma50Series = chart.addLineSeries({ color: '#ffffff', lineWidth: 1 });
    const ma100Series = chart.addLineSeries({ color: '#ffd700', lineWidth: 1 });
    const ma200Series = chart.addLineSeries({ color: '#ff69b4', lineWidth: 1 });

    const formattedPrice = data.map(item => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      value: item.price,
    }));
    const formattedMA50 = data.map(item => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      value: item.ma_50,
    }));
    const formattedMA100 = data.map(item => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      value: item.ma_100,
    }));
    const formattedMA200 = data.map(item => ({
      time: Math.floor(new Date(item.time).getTime() / 1000),
      value: item.ma_200,
    }));

    priceSeries.setData(formattedPrice);
    ma50Series.setData(formattedMA50);
    ma100Series.setData(formattedMA100);
    ma200Series.setData(formattedMA200);
  } catch (error) {
    document.getElementById('error').textContent = 'Error loading data: ' + error;
  }
}

fetchData();
