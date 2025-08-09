// Simplified Bitcoin Chart - Clean Interface
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// Data sources mapped by symbol
const DATA_SOURCES = {
  BTC: {
    recent: 'https://ada-logger.onrender.com/BTC/recent.json',
    historical: 'https://ada-logger.onrender.com/BTC/historical.json'
  },
  ETH: {
    recent: 'https://ada-logger.onrender.com/ETH/recent.json',
    historical: 'https://ada-logger.onrender.com/ETH/historical.json'
  },
  ADA: {
    recent: 'https://ada-logger.onrender.com/ADA/recent.json',
    historical: 'https://ada-logger.onrender.com/ADA/historical.json'
  },
  XRP: {
    recent: 'https://ada-logger.onrender.com/XRP/recent.json',
    historical: 'https://ada-logger.onrender.com/XRP/historical.json'
  },
  SOL: {
    recent: 'https://ada-logger.onrender.com/SOL/recent.json',
    historical: 'https://ada-logger.onrender.com/SOL/historical.json'
  }
};

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

// Restored proper timeframe manager
class TimeframeManager {
  constructor() {
    this.currentTimeframe = '1m';
    this.currentSymbol = 'BTC';
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

  get dataSource() {
    return DATA_SOURCES[this.currentSymbol];
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
        price: parseFloat(item.price),
        ma_50: item.ma_50 ?? null,
        ma_100: item.ma_100 ?? null,
        ma_200: item.ma_200 ?? null,
        spread_avg_L20_pct: item.spread_avg_L20_pct ?? item.spread_pct ?? null
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
        
        const closeMAs = closePoint;
        
        // Use consistent bucket timestamp for all timeframes
        const bucketTimestamp = new Date(bucketTime * 1000).toISOString();
        
        aggregated.push({
          time: bucketTimestamp,
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          price: closePoint.price,
          ma_50: closeMAs.ma_50,
          ma_100: closeMAs.ma_100,
          ma_200: closeMAs.ma_200,
          spread_avg_L20_pct: closePoint.spread_avg_L20_pct,
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
    
    // Always use 1-minute data for MAs, only aggregate prices
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
      
      // Create all data points with IDENTICAL timestamps
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

    // We'll compute SMA for 20, 50, 100, 200 using spread_pct (or spread_avg_L20_pct if present)
    const spreadSeries = [];
    for (let i = 0; i < rawMinuteData.length; i++) {
      const row = rawMinuteData[i];
      const spreadVal = row.spread_avg_L20_pct ?? row.spread_pct;
      const t = this.toUnixTimestamp(row.time);
      if (isUpdate && t <= this.lastTimestamp) continue;
      if (spreadVal === null || spreadVal === undefined) continue;

      spreadSeries.push({ time: t, value: parseFloat(spreadVal) });

      // Cumulative average of spread
      cumulativeSum += parseFloat(spreadVal);
      cumulativeCount++;
      const cumulativeAverage = cumulativeSum / cumulativeCount;
      cumulativeData.push({ time: t, value: cumulativeAverage });

      // SMA20
      if (spreadSeries.length >= 20) {
        const w = spreadSeries.slice(spreadSeries.length - 20);
        const avg = w.reduce((acc, p) => acc + p.value, 0) / 20;
        ma20Data.push({ time: t, value: avg });
      }
      // SMA50
      if (spreadSeries.length >= 50) {
        const w = spreadSeries.slice(spreadSeries.length - 50);
        const avg = w.reduce((acc, p) => acc + p.value, 0) / 50;
        ma50Data.push({ time: t, value: avg });
      }
      // SMA100
      if (spreadSeries.length >= 100) {
        const w = spreadSeries.slice(spreadSeries.length - 100);
        const avg = w.reduce((acc, p) => acc + p.value, 0) / 100;
        ma100Data.push({ time: t, value: avg });
      }
      // SMA200
      if (spreadSeries.length >= 200) {
        const w = spreadSeries.slice(spreadSeries.length - 200);
        const avg = w.reduce((acc, p) => acc + p.value, 0) / 200;
        ma200Data.push({ time: t, value: avg });
      }
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
  }

  async initializeChart() {
    try {
      this.showStatus(`Loading ${this.currentSymbol} data...`);

      // 1. Fetch recent data
      const recentRes = await fetch(this.dataSource.recent);
      const recentData = await recentRes.json();

      // 2. Fetch historical data
      const historicalRes = await fetch(this.dataSource.historical);
      const historicalData = await historicalRes.json();

      // 3. Find earliest timestamp in recent.json
      const recentStart = new Date(recentData[0].time).getTime();

      // 4. Filter historical data to only include data older than recentStart
      const filteredHistorical = historicalData.filter(d => new Date(d.time).getTime() < recentStart);

      // 5. Combine and sort
      const combined = [...filteredHistorical, ...recentData]
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      // 6. Deduplicate by timestamp
      const deduped = [];
      const seen = new Set();
      for (const d of combined) {
        const t = d.time;
        if (!seen.has(t)) {
          deduped.push(d);
          seen.add(t);
        }
      }

      // 7. Set and process
      this.rawData = deduped;
      this.lastTimestamp = 0;
      this.processAndSetData(deduped);
      this.isFullDataLoaded = true;
      this.hideStatus();
      console.log(`✅ ${this.currentSymbol} chart loaded with ${deduped.length} points`);
    } catch (err) {
      console.error('❌ Loading error:', err);
      this.showStatus('Loading error');
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
      const res = await fetch(this.dataSource.recent);
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
        console.log(`📈 Updated ${this.currentSymbol} with ${newData.length} new data points`);
      }

    } catch (err) {
      console.error('❌ Fetch/update error:', err);
    }
  }

  async refreshHistoricalData() {
    if (!this.isFullDataLoaded) return;
    
    try {
      console.log(`🔄 Refreshing historical data for ${this.currentSymbol}...`);
      const res = await fetch(this.dataSource.historical);
      const data = await res.json();
      this.rawData = data;
      this.lastTimestamp = 0;
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

  async switchSymbol(symbol) {
    if (!DATA_SOURCES[symbol]) return;
    if (symbol === this.currentSymbol && this.isFullDataLoaded) return;

    console.log(`🔁 Switching symbol to ${symbol}`);

    // Update dropdown if present
    const symbolDropdown = document.getElementById('symbol-dropdown');
    if (symbolDropdown) symbolDropdown.value = symbol;

    // Stop intervals while switching
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Reset state
    this.currentSymbol = symbol;
    this.rawData = [];
    this.lastTimestamp = 0;
    this.isFullDataLoaded = false;

    // Clear existing chart data
    priceSeries.setData([]);
    ma20.setData([]);
    ma50.setData([]);
    ma100.setData([]);
    ma200.setData([]);
    cumulativeMA.setData([]);

    // Load data and restart update cycles
    await this.initializeChart();
    this.startUpdateCycle();
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

// Global functions for controls
function setTimeframe(timeframe) {
  manager.switchTimeframe(timeframe);
}

function setSymbol(symbol) {
  manager.switchSymbol(symbol);
}

// Enhanced zoom functions with MASSIVE zoom range like TradingView
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

