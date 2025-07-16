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

// Add crossover indicator series
const crossoverIndicator = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#00ff00',
  lineWidth: 3,
  visible: false, // Initially hidden
});

// MA crossover state tracking
let crossoverState = {
  lastCrossover: null, // 'bull' or 'bear'
  confirmationCount: 0,
  confirmedCrossover: null,
  ma50History: [],
  ma100History: [],
  ma200History: [],
  allMAsAt003: false
};

// Configuration
let CONFIRMATION_CANDLES = 20;
const MA_THRESHOLD = 0.03;

// Function to update confirmation candles from UI
function updateConfirmationCandles() {
  const input = document.getElementById('confirmationInput');
  const newValue = parseInt(input.value);
  if (newValue && newValue > 0 && newValue <= 100) {
    CONFIRMATION_CANDLES = newValue;
    console.log(`Confirmation candles updated to: ${CONFIRMATION_CANDLES}`);
    // Reset crossover state when changing confirmation period
    crossoverState.lastCrossover = null;
    crossoverState.confirmationCount = 0;
    crossoverState.confirmedCrossover = null;
    updateStatusUI();
  }
}

// Function to update the status UI
function updateStatusUI() {
  const crossoverStatusEl = document.getElementById('crossoverStatus');
  const confirmationStatusEl = document.getElementById('confirmationStatus');
  const ma003StatusEl = document.getElementById('ma003Status');
  const confirmedCrossoverEl = document.getElementById('confirmedCrossover');
  
  if (!crossoverStatusEl) return; // UI not ready yet
  
  // Update crossover status
  if (crossoverState.lastCrossover) {
    crossoverStatusEl.textContent = `${crossoverState.lastCrossover.toUpperCase()} crossover detected`;
    crossoverStatusEl.className = 'status-item status-pending';
  } else {
    crossoverStatusEl.textContent = 'No active crossover';
    crossoverStatusEl.className = 'status-item';
  }
  
  // Update confirmation status
  if (crossoverState.lastCrossover && crossoverState.confirmationCount > 0) {
    confirmationStatusEl.textContent = `Confirmation: ${crossoverState.confirmationCount}/${CONFIRMATION_CANDLES} candles`;
    confirmationStatusEl.className = 'status-item status-pending';
  } else {
    confirmationStatusEl.textContent = '-';
    confirmationStatusEl.className = 'status-item';
  }
  
  // Update 0.03 threshold status
  if (crossoverState.allMAsAt003) {
    ma003StatusEl.textContent = 'All MAs ≥ 0.03 ✅';
    ma003StatusEl.className = 'status-item status-active';
  } else {
    ma003StatusEl.textContent = 'MAs < 0.03 threshold';
    ma003StatusEl.className = 'status-item';
  }
  
  // Update confirmed crossover
  if (crossoverState.confirmedCrossover) {
    confirmedCrossoverEl.textContent = `Confirmed: ${crossoverState.confirmedCrossover.toUpperCase()} crossover ✅`;
    confirmedCrossoverEl.className = 'status-item status-active';
  } else {
    confirmedCrossoverEl.textContent = 'No confirmed crossover';
    confirmedCrossoverEl.className = 'status-item';
  }
}

function toUnixTimestamp(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

let lastTimestamp = 0;
let isFullDataLoaded = false;

// Function to detect MA crossover and confirmation
function detectCrossover(ma50Val, ma100Val, ma200Val, timestamp) {
  // Store MA values in history (keep only what we need for confirmation)
  crossoverState.ma50History.push({time: timestamp, value: ma50Val});
  crossoverState.ma100History.push({time: timestamp, value: ma100Val});
  crossoverState.ma200History.push({time: timestamp, value: ma200Val});
  
  // Keep only the last 25 candles (extra buffer)
  const maxHistory = CONFIRMATION_CANDLES + 5;
  if (crossoverState.ma50History.length > maxHistory) {
    crossoverState.ma50History = crossoverState.ma50History.slice(-maxHistory);
    crossoverState.ma100History = crossoverState.ma100History.slice(-maxHistory);
    crossoverState.ma200History = crossoverState.ma200History.slice(-maxHistory);
  }
  
  // Need at least 2 data points to detect crossover
  if (crossoverState.ma50History.length < 2) return;
  
  const prev50 = crossoverState.ma50History[crossoverState.ma50History.length - 2].value;
  const prev100 = crossoverState.ma100History[crossoverState.ma100History.length - 2].value;
  const curr50 = ma50Val;
  const curr100 = ma100Val;
  
  // Detect crossover between MA50 and MA100
  let newCrossover = null;
  if (prev50 <= prev100 && curr50 > curr100) {
    newCrossover = 'bull'; // MA50 crosses above MA100
  } else if (prev50 >= prev100 && curr50 < curr100) {
    newCrossover = 'bear'; // MA50 crosses below MA100
  }
  
  // If new crossover detected, reset confirmation
  if (newCrossover && newCrossover !== crossoverState.lastCrossover) {
    crossoverState.lastCrossover = newCrossover;
    crossoverState.confirmationCount = 1;
    crossoverState.confirmedCrossover = null;
    console.log(`New ${newCrossover} crossover detected, starting confirmation...`);
    updateStatusUI();
  }
  
  // If we're tracking a crossover, check if it stays on the correct side of MA200
  if (crossoverState.lastCrossover && crossoverState.confirmationCount < CONFIRMATION_CANDLES) {
    let isValidPosition = false;
    
    if (crossoverState.lastCrossover === 'bull') {
      // For bull crossover, both MA50 and MA100 should be above MA200
      isValidPosition = (curr50 > ma200Val && curr100 > ma200Val);
    } else if (crossoverState.lastCrossover === 'bear') {
      // For bear crossover, both MA50 and MA100 should be below MA200
      isValidPosition = (curr50 < ma200Val && curr100 < ma200Val);
    }
    
    if (isValidPosition) {
      crossoverState.confirmationCount++;
      console.log(`Confirmation ${crossoverState.confirmationCount}/${CONFIRMATION_CANDLES} for ${crossoverState.lastCrossover} crossover`);
      updateStatusUI();
    } else {
      // Reset if position is invalidated
      console.log(`${crossoverState.lastCrossover} crossover invalidated, resetting...`);
      crossoverState.lastCrossover = null;
      crossoverState.confirmationCount = 0;
      updateStatusUI();
    }
    
    // If we've confirmed for required candles, register the crossover
    if (crossoverState.confirmationCount >= CONFIRMATION_CANDLES) {
      crossoverState.confirmedCrossover = crossoverState.lastCrossover;
      console.log(`✅ ${crossoverState.lastCrossover} crossover CONFIRMED after ${CONFIRMATION_CANDLES} candles!`);
      crossoverState.lastCrossover = null; // Reset to avoid re-confirmation
      updateStatusUI();
    }
  }
  
  // Check if all MAs are at or above the 0.03 threshold
  const allMAsAt003 = (ma50Val >= MA_THRESHOLD && ma100Val >= MA_THRESHOLD && ma200Val >= MA_THRESHOLD);
  
  if (allMAsAt003 !== crossoverState.allMAsAt003) {
    crossoverState.allMAsAt003 = allMAsAt003;
    if (allMAsAt003) {
      console.log('🟢 All MAs hit 0.03 threshold! Indicator turning bright green.');
      // Update all MA series to bright green
      ma50.applyOptions({ color: '#00ff00' });
      ma100.applyOptions({ color: '#00ff00' });
      ma200.applyOptions({ color: '#00ff00' });
    } else {
      console.log('Restoring original MA colors');
      // Restore original colors
      ma50.applyOptions({ color: '#ffffff' });
      ma100.applyOptions({ color: '#ffd700' });
      ma200.applyOptions({ color: '#ff69b4' });
    }
    updateStatusUI();
  }
}

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
    if (d.ma_50 !== null) {
      ma50Data.push({ time: t, value: d.ma_50 });
      
      // Run crossover detection for new data
      if (d.ma_100 !== null && d.ma_200 !== null) {
        detectCrossover(d.ma_50, d.ma_100, d.ma_200, t);
      }
    }
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
    
    // Reset crossover state when loading complete dataset
    crossoverState = {
      lastCrossover: null,
      confirmationCount: 0,
      confirmedCrossover: null,
      ma50History: [],
      ma100History: [],
      ma200History: [],
      allMAsAt003: false
    };
    updateStatusUI();
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

// Initialize UI when page loads
window.addEventListener('load', function() {
  setTimeout(updateStatusUI, 100); // Small delay to ensure DOM is ready
});

