const chart = LightweightCharts.createChart(document.getElementById('chart'), {
    width: window.innerWidth,
    height: window.innerHeight,
    layout: {
        background: { color: '#000000' },
        textColor: '#ffffff',
    },
    grid: {
        vertLines: { color: '#444' },
        horzLines: { color: '#444' },
    },
    timeScale: {
        timeVisible: true,
    },
});

const candleSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
});

const line50 = chart.addLineSeries({ color: 'white', lineWidth: 2 });
const line100 = chart.addLineSeries({ color: 'gold', lineWidth: 2 });
const line200 = chart.addLineSeries({ color: 'hotpink', lineWidth: 2 });

async function fetchData() {
    try {
        const response = await fetch('https://btc-spread-test-pipeline.onrender.com/output.json'); // Replace this
        const data = await response.json();

        const candles = data.map(d => ({
            time: d.time,
            open: d.open,
            high: d.high,
            low: d.low,
            close: d.close,
        }));

        const ma50 = data.map(d => ({ time: d.time, value: d.sma_50 }));
        const ma100 = data.map(d => ({ time: d.time, value: d.sma_100 }));
        const ma200 = data.map(d => ({ time: d.time, value: d.sma_200 }));

        candleSeries.setData(candles);
        line50.setData(ma50);
        line100.setData(ma100);
        line200.setData(ma200);
    } catch (e) {
        document.getElementById('error').textContent = 'Failed to load chart data.';
        console.error(e);
    }
}

fetchData();
