// Simplified Bitcoin Chart - Clean Interface
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// Data sources mapped by symbol
const API_BASE = 'https://storage.googleapis.com/bananazone';
let API_EXCHANGE = 'coinbase';

// Earliest available data date
const EARLIEST_DATA_DATE = new Date('2025-09-09T00:00:00Z');

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
  return `${API_BASE}/${API_EXCHANGE}/${asset}/1min/${day}.jsonl`;
}

// Parse JSONL (JSON Lines) format
function parseJsonLines(text) {
  if (!text || text.trim() === '') return [];
  return text.trim().split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('Failed to parse JSON line:', line);
        return null;
      }
    })
    .filter(Boolean);
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
      const spreadL50 = row.spread_L50_pct_avg ?? row.spread_avg_L50_pct ?? null;
      const spreadL100 = row.spread_L100_pct_avg ?? row.spread_avg_L100_pct ?? null;
      if (!time || price === null || price === undefined) return null;
      return {
        time,
        price,
        // Expose all spread layer fields
        spread_L5_pct_avg: spreadL5,
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
    visible: true,
    scaleMargins: { top: 0.15, bottom: 0.15 },
    borderVisible: true,
    autoScale: false,
    mode: LightweightCharts.PriceScaleMode.Normal,
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
  handleScale: { axisPressedMouseMove: { time: true, price: true }, mouseWheel: true, pinch: true },
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
priceSeries.applyOptions({ priceFormat: { type: 'price', precision: 3, minMove: 0.001 } });

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

function createAvgSeries(title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color: '#FFFFFF',
    lineWidth: 0.8,
    title,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });
}

function formatLayerShort(layerKey) {
  if (layerKey === 'spread_L5_pct_avg') return 'L5';
  if (layerKey === 'spread_L50_pct_avg') return 'L50';
  if (layerKey === 'spread_L100_pct_avg') return 'L100';
  return 'L?';
}

// Unique bright colors per (layer,duration)
const LAYER_ORDER = ['spread_L5_pct_avg','spread_L50_pct_avg','spread_L100_pct_avg'];
const DURATION_ORDER = [20, 50, 100, 200];
const BRIGHT_PALETTE = [
  '#e6194B', '#3cb44b', '#ffe119', '#4363d8',
  '#f58231', '#911eb4', '#46f0f0', '#f032e6',
  '#bcf60c', '#fabebe', '#008080', '#e6beff',
  '#9A6324', '#fffac8', '#800000', '#aaffc3'
];
function colorFor(layerKey, duration) {
  const li = Math.max(0, LAYER_ORDER.indexOf(layerKey));
  const di = Math.max(0, DURATION_ORDER.indexOf(duration));
  const idx = li * DURATION_ORDER.length + di;
  return BRIGHT_PALETTE[idx % BRIGHT_PALETTE.length];
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
    this.selectedLayers = new Set(); // e.g., 'spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'
    this.selectedDurations = new Set(); // e.g., 20, 50, 100, 200
    this.maSeriesByKey = new Map(); // key: `${layerKey}|${duration}` -> lineSeries
    this.avgSeriesByLayer = new Map(); // key: layerKey -> white average line series
    this.maRawDataByKey = new Map(); // key: `${layerKey}|${duration}` -> raw [{time,value}]
    this.scaleFactorsByKey = new Map(); // key -> factor number
    this.normalizeEnabled = false;
    this.scaleRecomputeTimeout = null;
    this.autoRefitPending = false;
    
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
      if (this.yAxisControl !== 'Left') chart.priceScale('left').applyOptions({ autoScale: true });
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

    // Build and plot per-layer running average (white line) gated by visibility
    for (const layerKey of activeLayers) {
      const series = layerToSeries.get(layerKey);
      if (!series || series.length === 0) continue;
      if (!this.avgSeriesByLayer.has(layerKey)) {
        const title = `${formatLayerShort(layerKey)} Avg`;
        this.avgSeriesByLayer.set(layerKey, createAvgSeries(title));
      }
      const avgSeries = this.avgSeriesByLayer.get(layerKey);
      let sum = 0; let count = 0;
      const avgPoints = [];
      for (const p of series) {
        sum += p.value; count++;
        const avg = sum / count;
        avgPoints.push({ time: p.time, value: avg });
      }
      // Store raw for scaling
      if (!this.avgRawDataByLayer) this.avgRawDataByLayer = new Map();
      this.avgRawDataByLayer.set(layerKey, avgPoints);
      const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(`avg|${layerKey}`) || 1) : 1;
      const scaled = factor === 1 ? avgPoints : avgPoints.map(pt => ({ time: pt.time, value: pt.value * factor }));
      if (isUpdate) {
        scaled.forEach(pt => avgSeries.update(pt));
      } else {
        avgSeries.setData(scaled);
      }
      // Visibility follows cumulative toggle
      avgSeries.applyOptions({ visible: !!this.cumulativeAvgVisible });
      const suffix = this.normalizeEnabled ? ` ×${(factor).toFixed(2)}` : '';
      avgSeries.applyOptions({ title: `${formatLayerShort(layerKey)} Avg${suffix}` });
    }

    // Calculate and set/update MA series for each combination
    for (const layerKey of activeLayers) {
      const series = layerToSeries.get(layerKey);
      if (!series || series.length === 0) continue;
      for (const duration of activeDurations) {
        const key = `${layerKey}|${duration}`;
        if (!this.maSeriesByKey.has(key)) {
          const color = colorFor(layerKey, duration);
          const title = `${formatLayerShort(layerKey)}MA${duration}`;
          this.maSeriesByKey.set(key, createMASeries(color, title));
          // start hidden; visibility applied after computation
          this.maSeriesByKey.get(key).applyOptions({ visible: false });
        }
        const lineSeries = this.maSeriesByKey.get(key);
        const maPoints = [];
        for (let i = duration - 1; i < series.length; i++) {
          const windowSlice = series.slice(i - duration + 1, i + 1);
          const avg = windowSlice.reduce((acc, p) => acc + p.value, 0) / duration;
          maPoints.push({ time: series[i].time, value: avg });
        }
        this.maRawDataByKey.set(key, maPoints);
        const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(key) || 1) : 1;
        const scaled = factor === 1 ? maPoints : maPoints.map(p => ({ time: p.time, value: p.value * factor }));
        if (isUpdate) {
          scaled.forEach(p => lineSeries.update(p));
        } else {
          lineSeries.setData(scaled);
        }
      }
    }

    if (isUpdate) {
      // Add new data points
      if (priceData.length > 0) {
        priceData.forEach(p => priceSeries.update(p));
      }
      // dynamic MA series are updated separately; cumulative unused
    } else {
      // Set complete dataset
      priceSeries.setData(priceData);
      
      // Fit content to show all data
      chart.timeScale().fitContent();
      // Ensure y-axes scale to new data range
      this.applyAutoScale();
    }

    // Apply visibility after any computation
    this.applyMAVisibility();
  }

  applyMAVisibility() {
    try {
      for (const [key, series] of this.maSeriesByKey.entries()) {
        const [layerKey, durationStr] = key.split('|');
        const duration = parseInt(durationStr, 10);
        const visible = this.selectedLayers.has(layerKey) && this.selectedDurations.has(duration);
        series.applyOptions({ visible });
        // Update title suffix for current factor
        const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(key) || 1) : 1;
        const baseTitle = `${formatLayerShort(layerKey)}MA${duration}`;
        const suffix = this.normalizeEnabled ? ` ×${factor.toFixed(2)}` : '';
        series.applyOptions({ title: baseTitle + suffix });
      }
      // Ensure left scale stays autoscaled with margins
      chart.priceScale('left').applyOptions({
        mode: LightweightCharts.PriceScaleMode.Normal,
        autoScale: false,
        scaleMargins: { top: 0.15, bottom: 0.15 }
      });
      // Do not auto-fit left; only manual control moves it
    } catch (e) {
      console.warn('Failed to apply MA visibility:', e);
    }
  }

  async initializeChart() {
    try {
      this.showStatus(`Loading all ${this.currentSymbol} days...`);
      const allData = await this.loadAllAvailableDays();
      this.rawData = allData;
      this.lastTimestamp = 0;
      this.processAndSetData(allData);
      this.isFullDataLoaded = true;
      this.hideStatus();
      console.log(`✅ ${this.currentSymbol} chart loaded with ${allData.length} points across all available days`);
    } catch (err) {
      console.error('❌ Loading error:', err);
      this.showStatus('Loading error');
    }
  }

  async fetchDayData(dateStr) {
    try {
      const url = buildDailyUrl(this.currentSymbol, dateStr);
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      const jsonLines = parseJsonLines(text);
      const data = normalizeApiData(jsonLines);
      return Array.isArray(data) ? data : [];
    } catch (_) {
      return [];
    }
  }

  async loadAllAvailableDays() {
    const combined = [];
    const seen = new Set();
    const maxConsecutiveMisses = 30; // stop if we miss an entire month
    let misses = 0;

    for (let offset = 0; ; offset++) {
      const currentDate = new Date();
      currentDate.setUTCDate(currentDate.getUTCDate() - offset);
      
      // Stop if we've gone before the earliest available data
      if (currentDate < EARLIEST_DATA_DATE) {
        console.log(`📅 Reached earliest data date: ${formatDateYYYYMMDD(EARLIEST_DATA_DATE)}`);
        break;
      }
      
      const day = getDateStringWithOffset(-offset);
      this.showStatus(`Loading ${this.currentSymbol} ${day}...`);
      const dayData = await this.fetchDayData(day);
      if (!dayData || dayData.length === 0) {
        misses++;
        if (misses >= maxConsecutiveMisses && combined.length > 0) break;
        continue;
      }
      misses = 0;
      for (const d of dayData) {
        const t = d.time;
        if (!seen.has(t)) { combined.push(d); seen.add(t); }
      }
    }

    combined.sort((a, b) => new Date(a.time) - new Date(b.time));
    console.log(`📅 Loaded ${combined.length} points across ${this.currentSymbol} all days`);
    return combined;
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
      const today = getDateStringWithOffset(0);
      const url = buildDailyUrl(this.currentSymbol, today);
      const res = await fetch(url);
      const text = await res.text();
      const jsonLines = parseJsonLines(text);
      const data = normalizeApiData(jsonLines);

      // Find new data points
      const newData = data.filter(d => {
        const t = this.toUnixTimestamp(d.time);
        return t > this.lastTimestamp;
      });

      if (newData.length > 0) {
        this.rawData = [...this.rawData, ...newData].sort((a, b) => new Date(a.time) - new Date(b.time));
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
      console.log(`🔄 Refreshing all days for ${this.currentSymbol}...`);
      const data = await this.loadAllAvailableDays();
      this.rawData = data;
      this.lastTimestamp = 0;
      this.processAndSetData(data);
      console.log(`✅ All days refreshed: ${data.length} total points`);
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
    const allowed = new Set(['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg']);
    if (!allowed.has(layerKey)) return;
    if (enabled) this.selectedLayers.add(layerKey); else this.selectedLayers.delete(layerKey);
    // Recompute only if there are active durations; otherwise just update visibility
    if (this.selectedDurations.size > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
    } else {
      this.applyMAVisibility();
    }
    this.applyAutoScale();
  }

  toggleDuration(duration, enabled) {
    const allowed = new Set([20, 50, 100, 200]);
    if (!allowed.has(duration)) return;
    if (enabled) this.selectedDurations.add(duration); else this.selectedDurations.delete(duration);
    // Ensure corresponding series exist if both layer(s) and this duration are active
    if (enabled && this.selectedLayers.size > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
    } else {
      this.applyMAVisibility();
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
    // Remove dynamic MA and avg series completely to avoid extra scales/panes
    try {
      for (const [key, series] of this.maSeriesByKey.entries()) {
        chart.removeSeries(series);
      }
      this.maSeriesByKey.clear();
      for (const [key, series] of this.avgSeriesByLayer.entries()) {
        chart.removeSeries(series);
      }
      this.avgSeriesByLayer.clear();
    } catch (e) { console.warn('Failed clearing series', e); }

    // Load data and restart update cycles
    await this.initializeChart();
    // Apply autoscale after loading new symbol
    this.applyAutoScale();
    this.startUpdateCycle();
  }

  async switchExchange(exchange) {
    if (!exchange || API_EXCHANGE === exchange) return;
    console.log(`🔁 Switching exchange to ${exchange}`);
    API_EXCHANGE = exchange;
    // Reload everything for current symbol using new exchange
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    // Clear series
    try {
      priceSeries.setData([]);
      for (const [key, series] of this.maSeriesByKey.entries()) { chart.removeSeries(series); }
      this.maSeriesByKey.clear();
      for (const [key, series] of this.avgSeriesByLayer.entries()) { chart.removeSeries(series); }
      this.avgSeriesByLayer.clear();
    } catch(_) {}
    this.rawData = [];
    this.lastTimestamp = 0;
    this.isFullDataLoaded = false;
    await this.initializeChart();
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

    // Subscribe to visible range changes to recompute scaling (debounced)
    try {
      const debounced = () => this.recomputeScaleFactorsAndRefresh();
      chart.timeScale().subscribeVisibleTimeRangeChange(debounced);
    } catch (_) {}
  }

  setYAxisControl(mode) {
    this.yAxisControl = mode === 'Left' ? 'Left' : 'Right';
    const overlay = document.getElementById('left-axis-overlay');
    if (!overlay) return;
    if (this.yAxisControl === 'Left') {
      overlay.style.display = 'block';
      chart.priceScale('left').setAutoScale(false);
      this.attachLeftAxisOverlayHandlers(overlay);
    } else {
      overlay.style.display = 'none';
      // Keep left in manual mode unless explicitly reset
    }
  }

  attachLeftAxisOverlayHandlers(overlay) {
    if (overlay._handlersAttached) return;
    overlay._handlersAttached = true;
    let dragging = false;
    let startY = 0;
    let startMin = null, startMax = null;
    const ps = () => chart.priceScale('left');
    const anyLeftSeries = () => {
      for (const s of this.maSeriesByKey.values()) return s;
      for (const s of this.avgSeriesByLayer.values()) return s;
      return null;
    };

    const getRange = () => {
      try {
        const range = ps().getPriceRange?.();
        if (range && isFinite(range.minValue) && isFinite(range.maxValue)) return { min: range.minValue, max: range.maxValue };
      } catch(_) {}
      // Fallback from visible data
      let min = Infinity, max = -Infinity;
      const collect = (pts) => { for (const p of pts||[]) { if (p.value < min) min = p.value; if (p.value > max) max = p.value; } };
      for (const raw of this.maRawDataByKey.values()) collect(raw);
      if (this.avgRawDataByLayer) for (const raw of this.avgRawDataByLayer.values()) collect(raw);
      if (!isFinite(min) || !isFinite(max) || min === Infinity || max === -Infinity) { min = 0; max = 1; }
      return { min, max };
    };

    const onDown = (e) => {
      dragging = true;
      startY = (e.touches && e.touches[0]?.clientY) || e.clientY || 0;
      const r = getRange(); startMin = r.min; startMax = r.max;
      ps().setAutoScale(false);
      e.stopPropagation();
      e.preventDefault();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const currentY = (e.touches && e.touches[0]?.clientY) || e.clientY || startY;
      const dy = currentY - startY;
      const ser = anyLeftSeries();
      if (!ser) return;
      const h = overlay.clientHeight || 1;
      const pxPerUnit = h / Math.max(1e-6, (startMax - startMin));
      const deltaUnits = -(dy / Math.max(1e-6, pxPerUnit));
      const newMin = startMin + deltaUnits;
      const newMax = startMax + deltaUnits;
      try { ps().applyOptions({ autoScale: false }); } catch(_) {}
      try { ps().setPriceRange?.({ minValue: newMin, maxValue: newMax }); } catch(_) {}
      // Prevent chart from interpreting this as a gesture that resets autoscale
      e.stopPropagation();
      e.preventDefault();
    };
    const onUp = (e) => { dragging = false; e && e.stopPropagation && e.stopPropagation(); };
    const onDbl = () => {
      try { ps().setAutoScale(true); } catch(_) {}
      setTimeout(() => { try { ps().setAutoScale(false); } catch(_) {} }, 50);
    };

    overlay.addEventListener('mousedown', onDown, { passive: false });
    overlay.addEventListener('mousemove', onMove, { passive: false });
    overlay.addEventListener('mouseup', onUp, { passive: false });
    overlay.addEventListener('mouseleave', onUp, { passive: false });
    overlay.addEventListener('touchstart', onDown, { passive: false });
    overlay.addEventListener('touchmove', onMove, { passive: false });
    overlay.addEventListener('touchend', onUp, { passive: false });
    overlay.addEventListener('dblclick', onDbl, { passive: false });
  }

  toggleCumulativeAvg(enabled) {
    this.cumulativeAvgVisible = !!enabled;
    this.recomputeScaleFactorsAndRefresh();
  }

  setNormalize(enabled) {
    this.normalizeEnabled = !!enabled;
    const badge = document.getElementById('scaled-badge');
    if (badge) badge.style.display = this.normalizeEnabled ? 'inline-block' : 'none';
    this.recomputeScaleFactorsAndRefresh();
  }

  recomputeScaleFactorsAndRefresh() {
    if (this.scaleRecomputeTimeout) clearTimeout(this.scaleRecomputeTimeout);
    this.scaleRecomputeTimeout = setTimeout(() => {
      this.computeScaleFactorsForVisibleRange();
      this.refreshVisibleMALines();
      // Never auto-fit left
    }, 250);
  }

  getVisibleTimeRange() {
    try {
      const range = chart.timeScale().getVisibleRange();
      return range ? { from: range.from, to: range.to } : null;
    } catch (_) { return null; }
  }

  computeScaleFactorsForVisibleRange() {
    this.scaleFactorsByKey.clear();
    if (!this.normalizeEnabled) return;

    // Pick reference: L100_MA200 if visible, else first visible MA series
    let referenceKey = null;
    const prefKey = 'spread_L100_pct_avg|200';
    if (this.maSeriesByKey.has(prefKey)) {
      const refSeriesVisible = this.isSeriesVisible(prefKey);
      if (refSeriesVisible) referenceKey = prefKey;
    }
    if (!referenceKey) {
      for (const key of this.maSeriesByKey.keys()) {
        if (this.isSeriesVisible(key)) { referenceKey = key; break; }
      }
    }
    // If still none and cumulative avg is visible, synthesize reference as first layer avg
    if (!referenceKey && this.cumulativeAvgVisible) {
      // choose any existing avg series as reference
      const firstAvg = Array.from(this.avgSeriesByLayer.keys())[0];
      if (firstAvg) {
        referenceKey = `avg|${firstAvg}`; // special marker
      }
    }
    if (!referenceKey) return;

    const visible = this.getVisibleTimeRange();
    const refData = referenceKey.startsWith('avg|')
      ? (this.avgRawDataByLayer?.get(referenceKey.split('|')[1]) || [])
      : (this.maRawDataByKey.get(referenceKey) || []);
    let refVals = this.valuesInRange(refData, visible);
    if (!refVals || refVals.length < 50) { refVals = (refData || []).slice(-200).map(p => p.value); }
    const refMedian = this.median(refVals) ?? this.mean(refVals) ?? 1;

    const getTrimmed = (vals) => {
      if (!vals || vals.length < 20) return vals || [];
      const sorted = vals.slice().sort((a,b)=>a-b);
      const lo = Math.floor(sorted.length * 0.05);
      const hi = Math.ceil(sorted.length * 0.95);
      return sorted.slice(lo, hi);
    };

    const computeCenter = (vals) => {
      if (!vals || vals.length === 0) return { center: null, used: 'none' };
      let center = this.median(vals); let used = 'median';
      if (center == null || !isFinite(center) || center === 0) { center = this.mean(vals); used = 'mean'; }
      return { center, used };
    };

    const logCalc = (name, n, used, center, factorRaw, factorClamped) => {
      try { console.log(`[Normalize] ${name}: n=${n}, stat=${used}, center=${center}, factorRaw=${factorRaw}, factor=${factorClamped}`); } catch(_) {}
    };

    // MA series factors (with L5 trimming)
    for (const key of this.maSeriesByKey.keys()) {
      if (!this.isSeriesVisible(key)) continue;
      const data = this.maRawDataByKey.get(key) || [];
      let vals = this.valuesInRange(data, visible);
      if (!vals || vals.length < 50) { vals = (data || []).slice(-200).map(p => p.value); }
      const layerKey = key.split('|')[0];
      const valsForCalc = layerKey === 'spread_L5_pct_avg' ? getTrimmed(vals) : vals;
      const { center, used } = computeCenter(valsForCalc);
      let factorRaw = 1, factor = 1;
      if (center == null || !isFinite(center) || center === 0) { factor = 1; factorRaw = 1; }
      else { factorRaw = refMedian / center; factor = Math.min(10, Math.max(0.1, factorRaw)); }
      this.scaleFactorsByKey.set(key, factor);
      logCalc(key, valsForCalc?.length||0, used, center?.toFixed?.call(center,6)||center, factorRaw?.toFixed?.call(factorRaw,6)||factorRaw, factor?.toFixed?.call(factor,6)||factor);
    }

    // AVG series factors
    if (this.cumulativeAvgVisible && this.avgRawDataByLayer) {
      for (const [layerKey, raw] of this.avgRawDataByLayer.entries()) {
        const key = `avg|${layerKey}`;
        let vals = this.valuesInRange(raw, visible);
        if (!vals || vals.length < 50) { vals = raw.slice(-200).map(p => p.value); }
        const valsForCalc = layerKey === 'spread_L5_pct_avg' ? getTrimmed(vals) : vals;
        const { center, used } = computeCenter(valsForCalc);
        let factorRaw = 1, factor = 1;
        if (center == null || !isFinite(center) || center === 0) { factor = 1; factorRaw = 1; }
        else { factorRaw = refMedian / center; factor = Math.min(10, Math.max(0.1, factorRaw)); }
        this.scaleFactorsByKey.set(key, factor);
        logCalc(key, valsForCalc?.length||0, used, center?.toFixed?.call(center,6)||center, factorRaw?.toFixed?.call(factorRaw,6)||factorRaw, factor?.toFixed?.call(factor,6)||factor);
      }
    }
  }

  valuesInRange(points, visible) {
    if (!points || points.length === 0) return [];
    if (!visible) return points.map(p => p.value);
    const from = visible.from, to = visible.to;
    return points.filter(p => p.time >= from && p.time <= to).map(p => p.value);
  }

  median(arr) {
    if (!arr || arr.length === 0) return null;
    const a = arr.slice().sort((x, y) => x - y);
    const mid = Math.floor(a.length / 2);
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  mean(arr) {
    if (!arr || arr.length === 0) return null;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
  }

  isSeriesVisible(key) {
    const [layerKey, durationStr] = key.split('|');
    const duration = parseInt(durationStr, 10);
    return this.selectedLayers.has(layerKey) && this.selectedDurations.has(duration);
  }

  refreshVisibleMALines() {
    for (const [key, series] of this.maSeriesByKey.entries()) {
      const raw = this.maRawDataByKey.get(key) || [];
      const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(key) || 1) : 1;
      const points = raw.map(p => ({ time: p.time, value: p.value * factor }));
      series.setData(points);
      // Update title with multiplier
      const [layerKey, durationStr] = key.split('|');
      const duration = parseInt(durationStr, 10);
      const baseTitle = `${formatLayerShort(layerKey)}MA${duration}`;
      const clampedNote = this.normalizeEnabled && (factor <= 0.1001 || factor >= 9.999) ? ' (clamped)' : '';
      const suffix = this.normalizeEnabled ? ` ×${(factor).toFixed(2)}${clampedNote}` : '';
      series.applyOptions({ title: baseTitle + suffix });
    }
    // Update cumulative avg titles when visible
    if (this.avgRawDataByLayer) {
      for (const [layerKey, raw] of this.avgRawDataByLayer.entries()) {
        const series = this.avgSeriesByLayer.get(layerKey);
        if (!series) continue;
        const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(`avg|${layerKey}`) || 1) : 1;
        const points = raw.map(p => ({ time: p.time, value: p.value * factor }));
        series.setData(points);
        const clampedNote = this.normalizeEnabled && (factor <= 0.1001 || factor >= 9.999) ? ' (clamped)' : '';
        const suffix = this.normalizeEnabled ? ` ×${(factor).toFixed(2)}${clampedNote}` : '';
        series.applyOptions({ title: `${formatLayerShort(layerKey)} Avg${suffix}` });
        series.applyOptions({ visible: !!this.cumulativeAvgVisible });
      }
    }
    this.applyMAVisibility();
    // Never auto-fit left
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

function toggleNormalize(enabled) {
  manager.setNormalize(enabled);
}

function toggleCumulativeAvg(enabled) {
  manager.toggleCumulativeAvg(enabled);
}

function setYAxisControl(mode) {
  manager.setYAxisControl(mode);
}

function setExchange(exchange) {
  manager.switchExchange(exchange);
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
    // Explicit manual reset only; do not auto-fit unless called
    window.chart.priceScale('left').setAutoScale(true);
    setTimeout(() => {
      window.chart.priceScale('left').setAutoScale(false);
    }, 50);
  }
}

function resetRightScale() {
  if (window.chart) {
    window.chart.priceScale('right').setAutoScale(true);
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

