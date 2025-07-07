import { createChart } from 'lightweight-charts';

const chart = createChart(document.getElementById('chart'), {
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
    crosshair: {
        mode: 0,
    },
    timeScale: {
        timeVisible: true,
        secondsVisible: false,
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
        const response = await fetch('https://btc-spread-test-pipeline.onrender.com/output.json'); // UPDATE THIS
        const data = await response.json();

        const candles = data.map(item => ({
            time: item.time,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
        }));

        const ma50 = data.map(item => ({ time: item.time, value: item.sma_50 }));
        const ma100 = data.map(item => ({ time: item.time, value: item.sma_100 }));
        const ma200 = data.map(item => ({ time: item.time, value: item.sma_200 }));

        candleSeries.setData(candles);
        line50.setData(ma50);
        line100.setData(ma100);
        line200.setData(ma200);

    } catch (err) {
        document.getElementById('error').textContent = 'Failed to load data.';
        console.error('Fetch error:', err);
    }
}

fetchData();
