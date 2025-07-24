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
    barSpacing: 4, // Tighter spacing for more data
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

// Simple MA lines
const ma50 = chart.addLineSeries({
  color: '#FF6B6B',
  lineWidth: 2,
  title: 'MA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma100 = chart.addLineSeries({
  color: '#4ADF86',
  lineWidth: 2,
  title: 'MA100',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma200 = chart.addLineSeries({
  color: '#FFD700',
  lineWidth: 2,
  title: 'MA200',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Simple timeframe manager
class SimpleTimeframeManager {
  constructor() {
    this.currentTimeframe = '1m';
    this.data = [];
    
    this.timeframes = {
      '1m': { seconds: 60, label: '1 Minute' },
      '5m': { seconds: 300, label: '5 Minutes' },
      '15m': { seconds: 900, label: '15 Minutes' },
      '1h': { seconds: 3600, label: '1 Hour' },
      '4h': { seconds: 14400, label: '4 Hours' },
      '1d': { seconds: 86400, label: '1 Day' }
    };
  }

  async fetchData(timeframe) {
    const now = Math.floor(Date.now() / 1000);
    const granularitySeconds = this.timeframes[timeframe].seconds;
    
    // Fetch much more data for better zoom out capability
    const daysBack = timeframe === '1m' ? 7 : timeframe === '5m' ? 30 : timeframe === '15m' ? 90 : timeframe === '1h' ? 180 : timeframe === '4h' ? 365 : 730;
    const startTime = now - (daysBack * 86400);
    
    const startISO = new Date(startTime * 1000).toISOString();
    const endISO = new Date(now * 1000).toISOString();
    
    let granularity;
    switch(timeframe) {
      case '1m': granularity = 60; break;
      case '5m': granularity = 300; break;
      case '15m': granularity = 900; break;
      case '1h': granularity = 3600; break;
      case '4h': granularity = 14400; break;
      case '1d': granularity = 86400; break;
      default: granularity = 60;
    }
    
    const url = `https://api.exchange.coinbase.com/products/BTC-USD/candles?start=${startISO}&end=${endISO}&granularity=${granularity}`;
    
    try {
      console.log(`Fetching ${timeframe} data from ${startISO} to ${endISO}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const formattedData = data.map(([timestamp, low, high, open, close, volume]) => ({
        time: timestamp,
        open: parseFloat(open),
        high: parseFloat(high),
        low: parseFloat(low),
        close: parseFloat(close),
        volume: parseFloat(volume)
      })).sort((a, b) => a.time - b.time);
      
      console.log(`✅ Loaded ${formattedData.length} ${timeframe} candles`);
      return formattedData;
    } catch (error) {
      console.error(`Error fetching ${timeframe} data:`, error);
      return [];
    }
  }

  calculateMA(data, period) {
    if (data.length < period) return [];
    
    const result = [];
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const average = slice.reduce((sum, item) => sum + item.close, 0) / period;
      result.push({
        time: data[i].time,
        value: average
      });
    }
    return result;
  }

  setChartData(data) {
    if (!data || data.length === 0) return;
    
    console.log(`Setting chart data: ${data.length} candles`);
    
    // Set price data
    priceSeries.setData(data);
    
    // Calculate and set MA data
    const ma50Data = this.calculateMA(data, 50);
    const ma100Data = this.calculateMA(data, 100);
    const ma200Data = this.calculateMA(data, 200);
    
    ma50.setData(ma50Data);
    ma100.setData(ma100Data);
    ma200.setData(ma200Data);
    
    // Fit content to show all data
    chart.timeScale().fitContent();
    
    console.log(`✅ Chart updated with ${data.length} candles and MAs`);
  }

  async switchTimeframe(timeframe) {
    if (!this.timeframes[timeframe] || timeframe === this.currentTimeframe) {
      return;
    }
    
    console.log(`🔄 Switching to ${timeframe}`);
    
    this.currentTimeframe = timeframe;
    const dropdown = document.getElementById('timeframe-dropdown');
    if (dropdown) {
      dropdown.value = timeframe;
    }
    
    const data = await this.fetchData(timeframe);
    if (data && data.length > 0) {
      this.data = data;
      this.setChartData(data);
    }
  }

  async initialize() {
    console.log('🚀 Initializing simple chart...');
    
    const data = await this.fetchData(this.currentTimeframe);
    if (data && data.length > 0) {
      this.data = data;
      this.setChartData(data);
    }
    
    console.log('✅ Chart initialized');
  }
}

// Global instance
const manager = new SimpleTimeframeManager();

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
manager.initialize().then(() => {
  console.log('🎯 Chart ready!');
  
  // Add mobile optimizations after chart is ready
  setTimeout(addMobileOptimizations, 1000);
});

