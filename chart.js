window.chart = LightweightCharts.createChart(document.getElementById('chart'), {
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
let isFullDataLoaded = false;

// Helper function to process and set chart data
function processAndSetData(data, isUpdate = false) {
  const priceData = [];
  const ma50Data = [];
  const ma100Data = [];
  const ma200Data = [];

  data.forEach(d => {
    const t = toUnixTimestamp(d.time);
    
    // For updates, only add new data
    if (isUpdate && t <= lastTimestamp) return;
    
    priceData.push({ time: t, value: d.price });
    if (d.ma_50 !== null) ma50Data.push({ time: t, value: d.ma_50 });
    if (d.ma_100 !== null) ma100Data.push({ time: t, value: d.ma_100 });
    if (d.ma_200 !== null) ma200Data.push({ time: t, value: d.ma_200 });
    
    if (t > lastTimestamp) lastTimestamp = t;
  });

  if (isUpdate) {
    // Add new data points
    priceData.forEach(p => priceSeries.update(p));
    ma50Data.forEach(p => ma50.update(p));
    ma100Data.forEach(p => ma100.update(p));
    ma200Data.forEach(p => ma200.update(p));
  } else {
    // Set complete dataset
    priceSeries.setData(priceData);
    ma50.setData(ma50Data);
    ma100.setData(ma100Data);
    ma200.setData(ma200Data);
  }
}

// TradingView-style hybrid initialization
async function initializeChart() {
  try {
    console.log('🚀 Starting TradingView-style chart initialization...');
    
    // Phase 1: Load recent data first (instant chart display)
    console.log('⚡ Loading recent data for fast startup...');
    const recentRes = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
    const recentData = await recentRes.json();
    
    // Display recent data immediately (fast user experience)
    processAndSetData(recentData);
    console.log(`✅ Chart loaded with ${recentData.length} recent data points`);
    
    // Phase 2: Load complete historical data in background
    console.log('📚 Loading complete historical data...');
    const historicalRes = await fetch('https://btc-spread-test-pipeline.onrender.com/historical.json');
    const historicalData = await historicalRes.json();
    
    // Replace with complete dataset (full historical context)
    processAndSetData(historicalData);
    isFullDataLoaded = true;
    console.log(`🎉 Chart updated with complete ${historicalData.length} historical data points`);
    
  } catch (err) {
    console.error('❌ Error during chart initialization:', err);
    
    // Fallback to old endpoint if new system fails
    console.log('🔄 Falling back to legacy endpoint...');
    try {
      const fallbackRes = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
      const fallbackData = await fallbackRes.json();
      processAndSetData(fallbackData);
      console.log('✅ Fallback successful');
    } catch (fallbackErr) {
      console.error('❌ Fallback also failed:', fallbackErr);
    }
  }
}

// Updated fetch function - uses recent data for performance
async function fetchAndUpdate() {
  try {
    // Use recent endpoint for fast updates (last 24 hours)
    const res = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
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

    // Only update if we have new data
    if (newPrice.length > 0) {
      newPrice.forEach(p => priceSeries.update(p));
      new50.forEach(p => ma50.update(p));
      new100.forEach(p => ma100.update(p));
      new200.forEach(p => ma200.update(p));
      
      console.log(`📈 Updated chart with ${newPrice.length} new data points`);
    }

  } catch (err) {
    console.error('❌ Fetch/update error:', err);
    
    // Fallback to old endpoint
    try {
      const res = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
      const data = await res.json();
      processAndSetData(data, true);
    } catch (fallbackErr) {
      console.error('❌ Update fallback failed:', fallbackErr);
    }
  }
}

// Refresh full historical data every hour (like the backend)
async function refreshHistoricalData() {
  if (!isFullDataLoaded) return; // Skip if initial load hasn't completed
  
  try {
    console.log('🔄 Refreshing historical data (hourly)...');
    const res = await fetch('https://btc-spread-test-pipeline.onrender.com/historical.json');
    const data = await res.json();
    processAndSetData(data);
    console.log(`✅ Historical data refreshed: ${data.length} total points`);
  } catch (err) {
    console.error('❌ Historical refresh failed:', err);
  }
}

// Initialize chart with hybrid loading
initializeChart();

// Update with recent data every 15 seconds (fast)
setInterval(fetchAndUpdate, 15000);

// Refresh complete historical data every hour (like backend updates)
setInterval(refreshHistoricalData, 3600000); // 1 hour = 3600000ms

function set1Min() {
  console.log("1m clicked");
  const range = chart.timeScale().getVisibleLogicalRange();
  if (range) {
    chart.timeScale().setVisibleLogicalRange({
      from: range.from,
      to: range.from + 60 // show 60 bars (~1 hour of 1m data)
    });
  }
}

function set5Min() {
  console.log("5m clicked");
  const range = chart.timeScale().getVisibleLogicalRange();
  if (range) {
    chart.timeScale().setVisibleLogicalRange({
      from: range.from,
      to: range.from + 300 // show 300 bars (~5 hours of 1m data)
    });
  }
}

