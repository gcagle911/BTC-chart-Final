// Simplified Bitcoin Chart - Clean Interface
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// Chart configuration with LEFT/RIGHT dual y-axis and massive zoom range
window.chart = LightweightCharts.createChart(document.getElementById('main-chart'), {
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
    scaleMargins: {
      top: 0.05,
      bottom: 0.05,
    },
    borderVisible: false,
    autoScale: true,
    entireTextOnly: false,
    ticksVisible: true,
    mode: LightweightCharts.PriceScaleMode.Normal,
  },
  leftPriceScale: { 
    visible: true, // LEFT y-axis for Bid Spread MAs
    scaleMargins: {
      top: 0.05,
      bottom: 0.05,
    },
    borderVisible: false,
    autoScale: true,
    entireTextOnly: false,
    ticksVisible: true,
    mode: LightweightCharts.PriceScaleMode.Normal,
    alignLabels: false,
  },
  timeScale: { 
    timeVisible: true, 
    secondsVisible: false,
    borderVisible: false,
    rightOffset: 50,
    barSpacing: 12, // Increased spacing for thicker candlestick bodies
    minBarSpacing: 0.1, // MUCH tighter for extreme zoom out
    fixLeftEdge: false,
    fixRightEdge: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
  },
  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
    horzTouchDrag: true,
    vertTouchDrag: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
    axisPressedMouseMove: {
      time: true,
      price: true,
    },
    axisDoubleClickReset: {
      time: true,
      price: true,
    },
  },
  kineticScroll: {
    touch: true,
    mouse: false,
  },
});

// Price series on RIGHT y-axis
const priceSeries = chart.addCandlestickSeries({
  priceScaleId: 'right', // RIGHT y-axis for price
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: true,
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  wickVisible: true,
});

// Bid Spread Moving Averages on LEFT y-axis (separate scale!)
const ma20 = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#00BFFF',
  lineWidth: 0.5,
  title: 'MA20',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma50 = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#FF6B6B',
  lineWidth: 0.5,
  title: 'MA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma100 = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#4ADF86',
  lineWidth: 0.5,
  title: 'MA100',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma200 = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#FFD700',
  lineWidth: 0.5,
  title: 'MA200',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Cumulative Average of ALL L20 spread data
const cumulativeMA = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#FFFFFF',
  lineWidth: 0.5,
  title: 'Cumulative Avg',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Real-time L20 spread line (MA1 - raw data) - REMOVED

// Restored proper timeframe manager
class TimeframeManager {
  constructor() {
    this.currentTimeframe = '1m';
    this.rawData = [];
    this.lastTimestamp = 0;
    this.isFullDataLoaded = false;
    this.updateInterval = null;
    this.refreshInterval = null;
    
    this.timeframes = {
      '1m': { seconds: 60, label: '1 Minute' },
      '5m': { seconds: 300, label: '5 Minutes' },
      '15m': { seconds: 900, label: '15 Minutes' },
      '1h': { seconds: 3600, label: '1 Hour' },
      '4h': { seconds: 14400, label: '4 Hours' },
      '1d': { seconds: 86400, label: '1 Day' }
    };
  }

  toUnixTimestamp(dateStr) {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  }

  // Aggregate data maintaining full MA technical accuracy
  aggregateData(data, timeframeSeconds) {
    // For 1-minute data, create synthetic OHLC from single price points
    if (timeframeSeconds === 60) {
      return data.map(item => ({
        ...item,
        open: item.price,
        high: item.price,
        low: item.price,
        close: item.price
      }));
    }

    const aggregated = [];
    const buckets = new Map();

    // Sort data by timestamp to ensure proper ordering
    const sortedData = data.sort((a, b) => new Date(a.time) - new Date(b.time));

    sortedData.forEach(item => {
      const timestamp = this.toUnixTimestamp(item.time);
      const bucketTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime,
          dataPoints: []
        });
      }

      buckets.get(bucketTime).dataPoints.push({
        timestamp: timestamp,
        price: item.price,
        ma_50: item.ma_50,
        ma_100: item.ma_100,
        ma_200: item.ma_200,
        spread_avg_L20_pct: item.spread_avg_L20_pct
      });
    });

    // Convert buckets - Create proper OHLC from multiple price points
    for (const [bucketTime, bucket] of buckets) {
      if (bucket.dataPoints.length > 0) {
        // Sort by timestamp
        bucket.dataPoints.sort((a, b) => a.timestamp - b.timestamp);
        
        // Create OHLC from price data within the bucket
        const openPoint = bucket.dataPoints[0];
        const closePoint = bucket.dataPoints[bucket.dataPoints.length - 1];
        const highPrice = Math.max(...bucket.dataPoints.map(p => p.price));
        const lowPrice = Math.min(...bucket.dataPoints.map(p => p.price));
        
        // SOLUTION: Keep MAs from close time to maintain exact same values
        const closeMAs = closePoint;
        
        // CRITICAL: Use consistent bucket timestamp for all timeframes
        const bucketTimestamp = new Date(bucketTime * 1000).toISOString();
        
        aggregated.push({
          time: bucketTimestamp,
          // Proper OHLC data for candlestick display
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          price: closePoint.price,
          
          // Bid Spread L20 MAs STAY THE SAME - using exact values from close time
          ma_50: closeMAs.ma_50,
          ma_100: closeMAs.ma_100,
          ma_200: closeMAs.ma_200,
          
          // Keep original spread data
          spread_avg_L20_pct: closePoint.spread_avg_L20_pct,
          
          // Store bucket info for debugging
          bucketStart: bucketTime,
          dataPoints: bucket.dataPoints.length
        });
      }
    }

    return aggregated.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  // Process and set chart data (performance optimized)
  processAndSetData(data, isUpdate = false) {
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    
    // SOLUTION: Always use 1-minute data for MAs, only aggregate prices
    const rawMinuteData = this.currentTimeframe === '1m' ? data : this.rawData || data;
    const aggregatedPriceData = this.aggregateData(data, timeframeSeconds);

    const priceData = [];
    const ma20Data = [];
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];
    const cumulativeData = [];

    // Process aggregated price data for price series
    for (let i = 0; i < aggregatedPriceData.length; i++) {
      const d = aggregatedPriceData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      // CRITICAL: Create all data points with IDENTICAL timestamps
      const sharedTime = t;
      
      // Price data (main chart) - candlestick format
      priceData.push({ 
        time: sharedTime, 
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close)
      });
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    }

    // Process RAW MINUTE DATA for MAs - NEVER CHANGES regardless of timeframe
    let cumulativeSum = 0;
    let cumulativeCount = 0;
    
    for (let i = 0; i < rawMinuteData.length; i++) {
      const d = rawMinuteData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      const sharedTime = t;
      
      // MA data ALWAYS from 1-minute data - IDENTICAL across all timeframes
      
      // Calculate MA20 from L20 spread data (20-period moving average)
      if (d.spread_avg_L20_pct !== null && d.spread_avg_L20_pct !== undefined && i >= 19) {
        const recent20 = rawMinuteData.slice(i - 19, i + 1);
        const validSpreadData = recent20.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
        
        if (validSpreadData.length === 20) {
          const sum = validSpreadData.reduce((acc, item) => acc + parseFloat(item.spread_avg_L20_pct), 0);
          const ma20Value = sum / 20;
          
          ma20Data.push({
            time: sharedTime,
            value: ma20Value
          });
        }
      }
      
      if (d.ma_50 !== null && d.ma_50 !== undefined) {
        ma50Data.push({ 
          time: sharedTime, 
          value: parseFloat(d.ma_50)
        });
      }
      
      if (d.ma_100 !== null && d.ma_100 !== undefined) {
        ma100Data.push({ 
          time: sharedTime, 
          value: parseFloat(d.ma_100)
        });
      }
      
      if (d.ma_200 !== null && d.ma_200 !== undefined) {
        ma200Data.push({ 
          time: sharedTime, 
          value: parseFloat(d.ma_200)
        });
      }
      
      // Calculate cumulative average of L20 spread data
      if (d.spread_avg_L20_pct !== null && d.spread_avg_L20_pct !== undefined) {
        cumulativeSum += parseFloat(d.spread_avg_L20_pct);
        cumulativeCount++;
        const cumulativeAverage = cumulativeSum / cumulativeCount;
        
        cumulativeData.push({
          time: sharedTime,
          value: cumulativeAverage
        });
      }
    }

    // Log timestamp alignment for debugging
    if (priceData.length > 0 && ma50Data.length > 0) {
      console.log(`🕐 ${this.currentTimeframe} Data Processing:`);
      console.log(`   Candlestick Data: ${priceData.length} points (RIGHT y-axis)`);
      console.log(`   Bid Spread L20 MA Data: MA20(${ma20Data.length}), MA50(${ma50Data.length}), MA100(${ma100Data.length}), MA200(${ma200Data.length}) points (LEFT y-axis)`);
      console.log(`   Cumulative L20 Avg: ${cumulativeData.length} points (LEFT y-axis)`);
    }

    if (isUpdate) {
      // Add new data points
      if (priceData.length > 0) {
        priceData.forEach(p => priceSeries.update(p));
      }
      ma20Data.forEach(p => ma20.update(p));
      ma50Data.forEach(p => ma50.update(p));
      ma100Data.forEach(p => ma100.update(p));
      ma200Data.forEach(p => ma200.update(p));
      cumulativeData.forEach(p => cumulativeMA.update(p));
    } else {
      // Set complete dataset
      priceSeries.setData(priceData);
      ma20.setData(ma20Data);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
      cumulativeMA.setData(cumulativeData);
      
      // Fit content to show all data
      chart.timeScale().fitContent();
    }

    console.log(`✅ Chart updated with ${priceData.length} candles and bid spread MAs`);
  }

  async initializeChart() {
    try {
      console.log('🚀 Loading chart with bid spread data...');
      
      // Add visible status indicator
      this.showStatus('Loading recent data...');
      
      // Phase 1: Load recent data first (fast startup)
      const recentRes = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/recent.json');
      const recentData = await recentRes.json();
      
      this.rawData = recentData;
      this.processAndSetData(recentData);
      console.log(`✅ Recent data loaded (${recentData.length} points)`);
      this.showStatus(`Recent data loaded: ${recentData.length} points`);
      
      // Phase 2: Load complete historical data
      this.showStatus('Loading historical data...');
      const historicalRes = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/historical.json');
      const historicalData = await historicalRes.json();
      
      this.rawData = historicalData;
      this.processAndSetData(historicalData);
      this.isFullDataLoaded = true;
      console.log(`✅ Full data loaded (${historicalData.length} points)`);
      this.showStatus(`Chart ready: ${historicalData.length} data points`);
      
      // Hide status after 3 seconds
      setTimeout(() => this.hideStatus(), 3000);
      
    } catch (err) {
      console.error('❌ Loading error:', err);
      this.showStatus(`Error: ${err.message}`);
      
      // Fallback
      try {
        this.showStatus('Trying fallback...');
        const fallbackRes = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
        const fallbackData = await fallbackRes.json();
        this.rawData = fallbackData;
        this.processAndSetData(fallbackData);
        console.log('✅ Fallback data loaded');
        this.showStatus('Fallback data loaded');
        setTimeout(() => this.hideStatus(), 3000);
      } catch (fallbackErr) {
        console.error('❌ All endpoints failed');
        this.showStatus('All endpoints failed');
      }
    }
  }

  showStatus(message) {
    let statusDiv = document.getElementById('status-indicator');
    if (!statusDiv) {
      statusDiv = document.createElement('div');
      statusDiv.id = 'status-indicator';
      statusDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        max-width: 80%;
        text-align: center;
      `;
      document.body.appendChild(statusDiv);
    }
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
  }

  hideStatus() {
    const statusDiv = document.getElementById('status-indicator');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  async fetchAndUpdate() {
    try {
      const res = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/recent.json');
      const data = await res.json();

      // Find new data points
      const newData = data.filter(d => {
        const t = this.toUnixTimestamp(d.time);
        return t > this.lastTimestamp;
      });

      if (newData.length > 0) {
        // Add new data to our raw data store
        this.rawData = [...this.rawData, ...newData].sort((a, b) => 
          new Date(a.time) - new Date(b.time)
        );

        // Process and update chart with new data
        this.processAndSetData(newData, true);
        console.log(`📈 Updated chart with ${newData.length} new data points`);
      }

    } catch (err) {
      console.error('❌ Fetch/update error:', err);
    }
  }

  async refreshHistoricalData() {
    if (!this.isFullDataLoaded) return;
    
    try {
      console.log('🔄 Refreshing historical data...');
      const res = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/historical.json');
      const data = await res.json();
      this.rawData = data;
      this.processAndSetData(data);
      console.log(`✅ Historical data refreshed: ${data.length} total points`);
    } catch (err) {
      console.error('❌ Historical refresh failed:', err);
    }
  }

  switchTimeframe(timeframe) {
    if (timeframe === this.currentTimeframe) return;
    
    console.log(`🔄 Switching to ${timeframe} timeframe`);
    
    this.currentTimeframe = timeframe;
    
    // Update dropdown
    const dropdown = document.getElementById('timeframe-dropdown');
    if (dropdown) {
      dropdown.value = timeframe;
    }
    
    // Reset timestamp and reprocess data
    this.lastTimestamp = 0;
    this.processAndSetData(this.rawData);
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label}`);
  }

  startUpdateCycle() {
    // Clear existing intervals
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Update with recent data every 30 seconds
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), 30000);

    // Refresh complete historical data every hour
    this.refreshInterval = setInterval(() => this.refreshHistoricalData(), 3600000);
  }
}

// Global instance
const manager = new TimeframeManager();

// Global function for timeframe dropdown
function setTimeframe(timeframe) {
  manager.switchTimeframe(timeframe);
}

// FIXED: Enhanced zoom functions with MASSIVE zoom range like TradingView
function zoomIn() {
  if (window.chart) {
    const timeScale = window.chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      const middle = (visibleRange.from + visibleRange.to) / 2;
      const range = visibleRange.to - visibleRange.from;
      const newRange = range * 0.6; // Zoom in
      timeScale.setVisibleRange({
        from: middle - newRange / 2,
        to: middle + newRange / 2
      });
    }
  }
}

function zoomOut() {
  if (window.chart) {
    const timeScale = window.chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      const middle = (visibleRange.from + visibleRange.to) / 2;
      const range = visibleRange.to - visibleRange.from;
      const newRange = range * 1.8; // Zoom out MORE
      timeScale.setVisibleRange({
        from: middle - newRange / 2,
        to: middle + newRange / 2
      });
    }
  }
}

function fitContent() {
  if (window.chart) {
    window.chart.timeScale().fitContent();
  }
}

// Enhanced Y-axis scale functions for dual axis
function resetLeftScale() {
  if (window.chart) {
    window.chart.priceScale('left').applyOptions({ autoScale: true });
    setTimeout(() => {
      window.chart.priceScale('left').applyOptions({ autoScale: false });
    }, 100);
  }
}

function resetRightScale() {
  if (window.chart) {
    window.chart.priceScale('right').applyOptions({ autoScale: true });
    setTimeout(() => {
      window.chart.priceScale('right').applyOptions({ autoScale: false });
    }, 100);
  }
}

// Mobile touch optimization
function addMobileOptimizations() {
  const chartElement = document.getElementById('main-chart');
  if (!chartElement) return;
  
  console.log('📱 Adding mobile optimizations...');
  
  // Enhanced touch handling for better pinch zoom
  let touchState = {
    touches: new Map(),
    gestureStartDistance: null,
    lastPinchScale: 1,
    isPinching: false
  };
  
  chartElement.addEventListener('touchstart', (e) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 2) {
      touchState.isPinching = true;
      touchState.gestureStartDistance = getTouchDistance(touches[0], touches[1]);
    }
    
    touches.forEach(touch => {
      touchState.touches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY
      });
    });
  }, { passive: false });
  
  chartElement.addEventListener('touchmove', (e) => {
    const touches = Array.from(e.touches);
    
    if (touches.length === 2 && touchState.isPinching) {
      const currentDistance = getTouchDistance(touches[0], touches[1]);
      if (touchState.gestureStartDistance) {
        const scale = currentDistance / touchState.gestureStartDistance;
        const scaleChange = scale / touchState.lastPinchScale;
        
        if (Math.abs(scaleChange - 1) > 0.02) {
          handlePinchZoom(scaleChange);
          touchState.lastPinchScale = scale;
        }
      }
    }
    
    e.preventDefault();
  }, { passive: false });
  
  chartElement.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      touchState.isPinching = false;
      touchState.gestureStartDistance = null;
      touchState.lastPinchScale = 1;
    }
    
    Array.from(e.changedTouches).forEach(touch => {
      touchState.touches.delete(touch.identifier);
    });
  }, { passive: false });
  
  console.log('✅ Mobile optimizations added');
}

function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function handlePinchZoom(scaleChange) {
  if (!window.chart) return;
  
  try {
    const timeScale = window.chart.timeScale();
    const visibleRange = timeScale.getVisibleTimeRange();
    
    if (visibleRange) {
      const center = (visibleRange.from + visibleRange.to) / 2;
      const currentSize = visibleRange.to - visibleRange.from;
      const newSize = currentSize / scaleChange;
      
      // MASSIVE zoom limits for TradingView-like extensive viewing
      const minSize = 30; // 30 seconds minimum (extreme detail)
      const maxSize = 86400 * 365 * 10; // 10 YEARS maximum (extreme wide view)
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      
      timeScale.setVisibleTimeRange({
        from: center - clampedSize / 2,
        to: center + clampedSize / 2
      });
    }
  } catch (error) {
    console.error('Error handling pinch zoom:', error);
  }
}

// Initialize everything
manager.initializeChart().then(() => {
  console.log('🎯 Chart ready with bid spread data and dual y-axis!');
  
  // Start update cycle
  manager.startUpdateCycle();
  
  // Add mobile optimizations after chart is ready
  setTimeout(addMobileOptimizations, 1000);
});

