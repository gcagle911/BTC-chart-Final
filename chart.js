// Simplified Bitcoin Chart - Clean Interface
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// Data sources mapped by symbol
const API_BASE = 'https://multiexchangereal-j4ep.onrender.com/files/json';
const API_EXCHANGE = 'coinbase';

function formatDateYYYYMMDD(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateStringWithOffset(offsetDays = 0) {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  utcDate.setUTCDate(utcDate.getUTCDate() + offsetDays);
  return formatDateYYYYMMDD(utcDate);
}

function buildDailyUrl(asset, day) {
  return `${API_BASE}?exchange=${API_EXCHANGE}&asset=${asset}&day=${day}`;
}

const DATA_SOURCES = {
  BTC: {
    recent: () => buildDailyUrl('BTC', getDateStringWithOffset(0)),
    historical: () => buildDailyUrl('BTC', getDateStringWithOffset(-1))
  },
  ETH: {
    recent: () => buildDailyUrl('ETH', getDateStringWithOffset(0)),
    historical: () => buildDailyUrl('ETH', getDateStringWithOffset(-1))
  },
  ADA: {
    recent: () => buildDailyUrl('ADA', getDateStringWithOffset(0)),
    historical: () => buildDailyUrl('ADA', getDateStringWithOffset(-1))
  },
  XRP: {
    recent: () => buildDailyUrl('XRP', getDateStringWithOffset(0)),
    historical: () => buildDailyUrl('XRP', getDateStringWithOffset(-1))
  },
  SOL: {
    recent: () => buildDailyUrl('SOL', getDateStringWithOffset(0)),
    historical: () => buildDailyUrl('SOL', getDateStringWithOffset(-1))
  }
};

// Normalize API rows to internal schema expected by the charting logic
function normalizeApiData(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((row) => {
      const time = row.time || row.t || null;
      const price = row.price ?? row.price_avg ?? row.close ?? row.open ?? row.high ?? row.low ?? null;
      const spreadL5 = row.spread_L5_pct_avg ?? row.spread_avg_L5_pct ?? null;
      const spreadL20 = row.spread_L20_pct_avg ?? row.spread_avg_L20_pct ?? row.spread_pct ?? null;
      const spreadL50 = row.spread_L50_pct_avg ?? row.spread_avg_L50_pct ?? null;
      const spreadL100 = row.spread_L100_pct_avg ?? row.spread_avg_L100_pct ?? null;
      if (!time || price === null || price === undefined) return null;
      return {
        time,
        price,
        // Expose all spread layer fields
        spread_L5_pct_avg: spreadL5,
        spread_L20_pct_avg: spreadL20,
        spread_L50_pct_avg: spreadL50,
        spread_L100_pct_avg: spreadL100
      };
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
}

// Chart configuration with LEFT/RIGHT dual y-axis and massive zoom range
window.chart = LightweightCharts.createChart(document.getElementById('main-chart'), {
  layout: {
    background: { color: '#131722' },
    textColor: '#D1D4DC',
    fontSize: 9,
  },
  grid: {
    vertLines: { color: '#2B2B43' },
    horzLines: { color: '#2B2B43' },
  },
  rightPriceScale: { 
    visible: true,
    scaleMargins: {
      top: 0.02,
      bottom: 0.02,
    },
    borderVisible: false,
    autoScale: true,
    entireTextOnly: true,
    ticksVisible: true,
    mode: LightweightCharts.PriceScaleMode.Normal,
  },
  leftPriceScale: { 
    visible: true, // LEFT y-axis for Bid Spread MAs
    scaleMargins: {
      top: 0.02,
      bottom: 0.02,
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
    rightOffset: 15,
    barSpacing: 6, // Tighter by default to show more data
    minBarSpacing: 0.02, // Allow much more data when zoomed out
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
chart.priceScale('right').applyOptions({
  minTick: 0.001,
  scaleMargins: { top: 0.02, bottom: 0.02 },
});

// Dynamic MA series registry for multi-layer/duration combinations
function createMASeries(color, title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color,
    lineWidth: 0.7,
    title,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });
}

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
    // Multi-layer MA controls
    this.selectedLayers = new Set(); // e.g., 'spread_L5_pct_avg', 'spread_L20_pct_avg'
    this.selectedDurations = new Set(); // e.g., 20, 50, 100, 200
    this.maSeriesByKey = new Map(); // key: `${layerKey}|${duration}` -> lineSeries
    
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

  applyAutoScale() {
    try {
      chart.priceScale('right').applyOptions({ autoScale: true });
      chart.priceScale('left').applyOptions({ autoScale: true });
    } catch (e) {
      console.error('Failed to apply auto-scale:', e);
    }
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

    // Compute SMAs for each selected layer/duration combination
    const activeLayers = Array.from(this.selectedLayers);
    const activeDurations = Array.from(this.selectedDurations).sort((a,b) => a-b);
    const layerToSeries = new Map(); // layer -> [{time,value}...]
    for (const layerKey of activeLayers) {
      layerToSeries.set(layerKey, []);
    }

    for (let i = 0; i < rawMinuteData.length; i++) {
      const row = rawMinuteData[i];
      const t = this.toUnixTimestamp(row.time);
      if (isUpdate && t <= this.lastTimestamp) continue;

      // Populate per-layer series
      for (const layerKey of activeLayers) {
        const spreadVal = row[layerKey] ?? null;
        if (spreadVal === null || spreadVal === undefined) continue;
        layerToSeries.get(layerKey).push({ time: t, value: parseFloat(spreadVal) });
      }
    }

    // Build per-layer cumulative average just for info (not shown by default)
    for (const layerKey of activeLayers) {
      let sum = 0; let count = 0;
      for (const p of layerToSeries.get(layerKey)) {
        sum += p.value; count++;
        const avg = sum / count;
        cumulativeData.push({ time: p.time, value: avg });
      }
    }

    // Calculate and set/update MA series for each combination
    for (const layerKey of activeLayers) {
      const series = layerToSeries.get(layerKey);
      if (!series || series.length === 0) continue;
      for (const duration of activeDurations) {
        const key = `${layerKey}|${duration}`;
        if (!this.maSeriesByKey.has(key)) {
          const colorMap = {
            20: '#00BFFF',
            50: '#FF6B6B',
            100: '#4ADF86',
            200: '#FFD700',
          };
          const color = colorMap[duration] || '#AAAAAA';
          const title = `${layerKey.replace('spread_', 'L').replace('_pct_avg','')} MA${duration}`;
          this.maSeriesByKey.set(key, createMASeries(color, title));
          // start hidden until explicitly toggled
          this.maSeriesByKey.get(key).applyOptions({ visible: false });
        }
        const lineSeries = this.maSeriesByKey.get(key);
        const maPoints = [];
        for (let i = duration - 1; i < series.length; i++) {
          const windowSlice = series.slice(i - duration + 1, i + 1);
          const avg = windowSlice.reduce((acc, p) => acc + p.value, 0) / duration;
          maPoints.push({ time: series[i].time, value: avg });
        }
        if (isUpdate) {
          maPoints.forEach(p => lineSeries.update(p));
        } else {
          lineSeries.setData(maPoints);
        }
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
      cumulativeMA.setData(cumulativeData);
      
      // Fit content to show all data
      chart.timeScale().fitContent();
      // Ensure y-axes scale to new data range
      this.applyAutoScale();
    }

    // No default MA visibility; all off initially
  }

  async initializeChart() {
    try {
      this.showStatus(`Loading ${this.currentSymbol} data...`);

      // 1. Fetch recent data
      const recentUrl = typeof this.dataSource.recent === 'function' ? this.dataSource.recent() : this.dataSource.recent;
      const recentRes = await fetch(recentUrl);
      const recentData = normalizeApiData(await recentRes.json());

      // 2. Fetch historical data
      const historicalUrl = typeof this.dataSource.historical === 'function' ? this.dataSource.historical() : this.dataSource.historical;
      const historicalRes = await fetch(historicalUrl);
      const historicalData = normalizeApiData(await historicalRes.json());

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
      const recentUrl = typeof this.dataSource.recent === 'function' ? this.dataSource.recent() : this.dataSource.recent;
      const res = await fetch(recentUrl);
      const data = normalizeApiData(await res.json());

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
      const historicalUrl = typeof this.dataSource.historical === 'function' ? this.dataSource.historical() : this.dataSource.historical;
      const res = await fetch(historicalUrl);
      const data = normalizeApiData(await res.json());
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
    
    // Re-apply y-axis autoscale on timeframe change
    this.applyAutoScale();
    console.log(`✅ Switched to ${this.timeframes[timeframe].label}`);
  }

  toggleLayer(layerKey, enabled) {
    const allowed = new Set(['spread_L5_pct_avg', 'spread_L20_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg']);
    if (!allowed.has(layerKey)) return;
    if (enabled) this.selectedLayers.add(layerKey); else this.selectedLayers.delete(layerKey);
    this.lastTimestamp = 0;
    this.processAndSetData(this.rawData);
    this.applyAutoScale();
  }

  toggleDuration(duration, enabled) {
    const allowed = new Set([20, 50, 100, 200]);
    if (!allowed.has(duration)) return;
    if (enabled) this.selectedDurations.add(duration); else this.selectedDurations.delete(duration);
    // Toggle visibility of all series that match this duration according to enabled
    for (const [key, series] of this.maSeriesByKey.entries()) {
      const parts = key.split('|');
      const dur = parseInt(parts[1], 10);
      if (dur === duration) {
        series.applyOptions({ visible: !!enabled });
      }
    }
    // When turning on a duration, ensure data exists
    if (enabled) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
    }
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
    // Apply autoscale after loading new symbol
    this.applyAutoScale();
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

function setMASource(layerKey) {
  // Deprecated in favor of multi-layer toggles
  manager.toggleLayer(layerKey, true);
}

function toggleMA(key, isVisible) {
  // Deprecated in favor of per-duration toggle
  const map = { ma20: 20, ma50: 50, ma100: 100, ma200: 200 };
  const dur = map[key];
  if (dur) manager.toggleDuration(dur, isVisible);
}

// Simple dropdown toggling and outside-click close for MA tools
function toggleMAToolsDropdown() {
  const dd = document.getElementById('ma-tools-dropdown');
  if (!dd) return;
  dd.classList.toggle('open');
}

document.addEventListener('click', function(e) {
  const dd = document.getElementById('ma-tools-dropdown');
  if (!dd) return;
  if (!dd.contains(e.target)) {
    dd.classList.remove('open');
  }
});

function toggleMALayer(layerKey, enabled) {
  manager.toggleLayer(layerKey, enabled);
}

function toggleMADuration(duration, enabled) {
  manager.toggleDuration(duration, enabled);
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
      const newRange = range * 2.6; // Zoom out even more to fit more data
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
      const minSize = 15; // Allow even more detail
      const maxSize = 86400 * 365 * 25; // Up to 25 years
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

