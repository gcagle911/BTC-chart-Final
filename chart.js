// Simplified Bitcoin Chart - Clean Interface
// Only main price chart with MAs and enhanced zoom capability

// Chart configuration with improved candlestick visibility and extended zoom range
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
      top: 0.1,
      bottom: 0.1,
    },
    borderVisible: false,
    autoScale: true,
  },
  timeScale: { 
    timeVisible: true, 
    secondsVisible: false,
    borderVisible: false,
    rightOffset: 12,
    barSpacing: 6, // Better spacing for visibility
    minBarSpacing: 0.5, // Allow much tighter spacing when zoomed out
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

// Enhanced candlestick series with better visibility
const priceSeries = chart.addCandlestickSeries({
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
  borderUpColor: '#26a69a',
  borderDownColor: '#ef5350',
});

// Bid Spread Moving Averages - these are the special MAs from your data
const ma50 = chart.addLineSeries({
  color: '#FF6B6B',
  lineWidth: 2,
  title: 'Bid Spread MA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma100 = chart.addLineSeries({
  color: '#4ADF86',
  lineWidth: 2,
  title: 'Bid Spread MA100',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma200 = chart.addLineSeries({
  color: '#FFD700',
  lineWidth: 2,
  title: 'Bid Spread MA200',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Restored timeframe manager with your original data source
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

  // Aggregate data maintaining the bid spread MAs
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
        
        // Keep MAs from close time to maintain exact same values
        const closeMAs = closePoint;
        
        // Use consistent bucket timestamp for all timeframes
        const bucketTimestamp = new Date(bucketTime * 1000).toISOString();
        
        aggregated.push({
          time: bucketTimestamp,
          // Proper OHLC data for candlestick display
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          price: closePoint.price,
          
          // Bid Spread L20 MAs - keep exact values
          ma_50: closeMAs.ma_50,
          ma_100: closeMAs.ma_100,
          ma_200: closeMAs.ma_200,
          
          // Keep original spread data
          spread_avg_L20_pct: closePoint.spread_avg_L20_pct,
          
          // Store bucket info
          bucketStart: bucketTime,
          dataPoints: bucket.dataPoints.length
        });
      }
    }

    return aggregated.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  // Process and set chart data
  processAndSetData(data, isUpdate = false) {
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    
    // Use 1-minute data for MAs, aggregated data for prices
    const rawMinuteData = this.currentTimeframe === '1m' ? data : this.rawData || data;
    const aggregatedPriceData = this.aggregateData(data, timeframeSeconds);

    const priceData = [];
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];

    // Process aggregated price data for candlesticks
    for (let i = 0; i < aggregatedPriceData.length; i++) {
      const d = aggregatedPriceData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      const sharedTime = t;
      
      // Price data (candlestick format)
      priceData.push({ 
        time: sharedTime, 
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close)
      });
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    }

    // Process RAW MINUTE DATA for bid spread MAs
    for (let i = 0; i < rawMinuteData.length; i++) {
      const d = rawMinuteData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      const sharedTime = t;
      
      // Bid Spread MA data from 1-minute data
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
    }

    console.log(`📊 ${this.currentTimeframe} Data Processing:`);
    console.log(`   Candlestick Data: ${priceData.length} points`);
    console.log(`   Bid Spread MA Data: ${ma50Data.length} points`);

    if (isUpdate) {
      // Add new data points
      if (priceData.length > 0) {
        priceData.forEach(p => priceSeries.update(p));
      }
      ma50Data.forEach(p => ma50.update(p));
      ma100Data.forEach(p => ma100.update(p));
      ma200Data.forEach(p => ma200.update(p));
    } else {
      // Set complete dataset
      priceSeries.setData(priceData);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
      
      // Fit content to show all data
      chart.timeScale().fitContent();
    }

    console.log(`✅ Chart updated with ${priceData.length} candles and bid spread MAs`);
  }

  async initializeChart() {
    try {
      console.log('🚀 Loading chart with bid spread data...');
      
      // Load recent data first for fast startup
      const recentRes = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
      const recentData = await recentRes.json();
      
      this.rawData = recentData;
      this.processAndSetData(recentData);
      console.log(`✅ Recent data loaded (${recentData.length} points)`);
      
      // Load complete historical data
      const historicalRes = await fetch('https://btc-spread-test-pipeline.onrender.com/historical.json');
      const historicalData = await historicalRes.json();
      
      this.rawData = historicalData;
      this.processAndSetData(historicalData);
      this.isFullDataLoaded = true;
      console.log(`✅ Full data loaded (${historicalData.length} points)`);
      
    } catch (err) {
      console.error('❌ Loading error:', err);
      
      // Fallback
      try {
        const fallbackRes = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
        const fallbackData = await fallbackRes.json();
        this.rawData = fallbackData;
        this.processAndSetData(fallbackData);
        console.log('✅ Fallback data loaded');
      } catch (fallbackErr) {
        console.error('❌ All endpoints failed');
      }
    }
  }

  async fetchAndUpdate() {
    try {
      const res = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
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
    this.refreshInterval = setInterval(() => {
      if (!this.isFullDataLoaded) return;
      
      fetch('https://btc-spread-test-pipeline.onrender.com/historical.json')
        .then(res => res.json())
        .then(data => {
          this.rawData = data;
          this.processAndSetData(data);
          console.log(`✅ Historical data refreshed: ${data.length} total points`);
        })
        .catch(err => console.error('❌ Historical refresh failed:', err));
    }, 3600000);
  }
}

// Global instance
const manager = new TimeframeManager();

// Global function for timeframe dropdown
function setTimeframe(timeframe) {
  manager.switchTimeframe(timeframe);
}

// Enhanced zoom functions with much greater range
function zoomIn() {
  if (window.chart) {
    const timeScale = window.chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      const middle = (visibleRange.from + visibleRange.to) / 2;
      const range = visibleRange.to - visibleRange.from;
      const newRange = range * 0.5; // Zoom in more aggressively
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
      const newRange = range * 2; // Zoom out more aggressively
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
      
      // Much wider zoom limits for extensive data viewing
      const minSize = 60; // 1 minute minimum (for very detailed view)
      const maxSize = 86400 * 365 * 2; // 2 years maximum (for very wide view)
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
  console.log('🎯 Chart ready with bid spread data!');
  
  // Start update cycle
  manager.startUpdateCycle();
  
  // Add mobile optimizations after chart is ready
  setTimeout(addMobileOptimizations, 1000);
});

