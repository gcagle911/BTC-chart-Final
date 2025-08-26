// Simplified Bitcoin Chart - Clean Interface
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// Compact formatters to shrink y-axis label width
function formatCompactNumber(value) {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(abs >= 1e10 ? 0 : 1) + 'B';
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(abs >= 1e7 ? 0 : 1) + 'M';
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1) + 'k';
  return sign + abs.toFixed(0);
}

function formatPercent(value) {
  return (value * 100).toFixed(2) + '%';
}

// Rounding helper for stable math
function roundTo(value, decimals = 8) {
  const factor = Math.pow(10, decimals);
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

// Chart configuration with LEFT/RIGHT dual y-axis and massive zoom range
window.chart = LightweightCharts.createChart(document.getElementById('main-chart'), {
  layout: {
    background: { color: '#131722' },
    textColor: '#D1D4DC',
    fontSize: 6,
  },
  grid: {
    vertLines: { color: '#2B2B43' },
    horzLines: { color: '#2B2B43' },
  },
  rightPriceScale: { 
    visible: true,
    scaleMargins: {
      top: 0.03,
      bottom: 0.03,
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
      top: 0.04,
      bottom: 0.04,
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
    barSpacing: 12, // Increased spacing for thicker candlestick bodies
    minBarSpacing: 0.01, // allow much further zoom-out
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

const ma400 = chart.addLineSeries({
  priceScaleId: 'left', // LEFT y-axis for MAs
  color: '#00FFFF',
  lineWidth: 0.5,
  title: 'MA400',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Timeframe-adjusted Spread MAs (computed from aggregated timeframe data)
const tfMa50 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#00FF7F',
  lineWidth: 1,
  title: 'TF MA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const tfMa200 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FF8C00',
  lineWidth: 1,
  title: 'TF MA200',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Exponential Moving Averages (EMA) on LEFT y-axis
const ema20 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#1E90FF',
  lineWidth: 1,
  title: 'EMA20',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ema50 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FFA500',
  lineWidth: 1,
  title: 'EMA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ema100 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#8A2BE2',
  lineWidth: 1,
  title: 'EMA100',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ema200 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FF1493',
  lineWidth: 1,
  title: 'EMA200',
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

// Apply compact price formats to minimize y-axis width
priceSeries.applyOptions({
  priceFormat: { type: 'custom', formatter: formatCompactNumber }
});
ma20.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ma50.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ma100.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ma200.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
cumulativeMA.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ma400.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
tfMa50.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
tfMa200.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ema20.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ema50.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ema100.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });
ema200.applyOptions({ priceFormat: { type: 'custom', formatter: formatPercent } });

// Keep default localization to avoid forcing compact on left percent scale

// Bottom volume chart (indicator panel) - lazy init so failures won't break main
let volumeChart = null;
let volumeSeries = null;
let isVolumeSynced = false;

function ensureVolumeChart() {
  if (volumeChart && volumeSeries) return true;
  const indicatorEl = document.getElementById('indicator-chart');
  if (!indicatorEl) return false;
  try {
    volumeChart = LightweightCharts.createChart(indicatorEl, {
      layout: { background: { color: '#0f131a' }, textColor: '#D1D4DC', fontSize: 7 },
      grid: { vertLines: { color: '#2B2B43' }, horzLines: { color: '#2B2B43' } },
      rightPriceScale: { visible: true, borderVisible: false },
      leftPriceScale: { visible: false },
      timeScale: { timeVisible: true, secondsVisible: false, borderVisible: false },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
      handleScale: { mouseWheel: true, pinch: true },
    });
    volumeSeries = volumeChart.addHistogramSeries({
      priceLineVisible: false,
      lastValueVisible: false,
      color: 'rgba(150, 150, 150, 0.4)'
    });
    volumeSeries.applyOptions({ priceFormat: { type: 'custom', formatter: formatCompactNumber } });

    // Hide placeholder once chart is ready
    const placeholder = document.getElementById('indicator-placeholder');
    if (placeholder && placeholder.parentElement) {
      placeholder.style.display = 'none';
    }

    // Sync timescale once chart exists
    if (!isVolumeSynced) {
      try {
        const mainTs = window.chart.timeScale();
        const volTs = volumeChart.timeScale();
        mainTs.subscribeVisibleTimeRangeChange((range) => {
          if (!range) return;
          try { volTs.setVisibleRange(range); } catch (_) {}
        });
        isVolumeSynced = true;
      } catch (_) {}
    }
    return true;
  } catch (e) {
    console.error('Volume chart init failed:', e);
    volumeChart = null;
    volumeSeries = null;
    return false;
  }
}

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
    // Daily data configuration (adjust DAILY_BASE_URL to your bucket path)
    this.DAILY_BASE_URL = 'https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/archive/1min';
    this.DAILY_LOOKBACK_DAYS = 14; // number of days of 1m data to backfill before recent
    
    this.timeframes = {
      '1m': { seconds: 60, label: '1 Minute' },
      '5m': { seconds: 300, label: '5 Minutes' },
      '15m': { seconds: 900, label: '15 Minutes' },
      '1h': { seconds: 3600, label: '1 Hour' },
      '4h': { seconds: 14400, label: '4 Hours' },
      '1d': { seconds: 86400, label: '1 Day' }
    };

    // Stabilization state
    this.lastArchivedTimestamp = 0; // seconds
    this.emaState = { 20: null, 50: null, 100: null, 200: null };
    this.emaSeedBuffer = { 20: [], 50: [], 100: [], 200: [] };
  }

  toDateStringUTC(date) {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getDailyUrlFor(dateStr) {
    // Expects dateStr like 'YYYY-MM-DD'
    return `${this.DAILY_BASE_URL}/${dateStr}.json`;
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
        close: item.price,
        volume: item.volume != null ? Number(item.volume) : null
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
        spread_avg_L20_pct: item.spread_avg_L20_pct,
        volume: item.volume != null ? Number(item.volume) : null
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
        
        // Sum volume within the bucket (ignore nulls)
        const summedVolume = bucket.dataPoints.reduce((acc, p) => acc + (p.volume != null ? Number(p.volume) : 0), 0);

        aggregated.push({
          time: bucketTimestamp,
          // Proper OHLC data for candlestick display
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          price: closePoint.price,
          volume: summedVolume,
          
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

    const useClientMAs = true; // default to client-side MA computation for smoothness

    const priceData = [];
    const ma20Data = [];
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];
    const ma400Data = [];
    const cumulativeData = [];
    const volumeData = [];
    const ema20Data = [];
    const ema50Data = [];
    const ema100Data = [];
    const ema200Data = [];
    const tfMa50Data = [];
    const tfMa200Data = [];

    // Use previous timestamp snapshot for update filtering
    const prevLastTimestamp = this.lastTimestamp;
    let maxProcessedTimestamp = prevLastTimestamp;

    // Process aggregated price data for price series
    for (let i = 0; i < aggregatedPriceData.length; i++) {
      const d = aggregatedPriceData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data (based on previous timestamp)
      if (isUpdate && t <= prevLastTimestamp) continue;
      
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
      // Volume: use provided volume when available, fallback to proxy
      const prev = i > 0 ? aggregatedPriceData[i - 1] : null;
      const providedVol = d.volume != null ? Number(d.volume) : null;
      const proxyVol = prev ? Math.abs(parseFloat(d.close) - parseFloat(prev.close)) : 0;
      const volValue = providedVol != null ? providedVol : proxyVol;
      volumeData.push({ time: sharedTime, value: volValue, color: d.close >= (prev ? prev.close : d.close) ? 'rgba(38,166,154,0.6)' : 'rgba(239,83,80,0.6)' });
      
      if (t > maxProcessedTimestamp) maxProcessedTimestamp = t;
    }

    // Timeframe-based spread MAs (use aggregated spread_avg_L20_pct on current timeframe)
    for (let j = 0; j < aggregatedPriceData.length; j++) {
      const dAgg = aggregatedPriceData[j];
      const tAgg = this.toUnixTimestamp(dAgg.time);
      if (isUpdate && tAgg <= prevLastTimestamp) continue;
      const sharedTimeAgg = tAgg;
      if (dAgg.spread_avg_L20_pct == null) continue;
      if (j >= 49) {
        const window50 = aggregatedPriceData.slice(j - 49, j + 1);
        const valid = window50.filter(x => x.spread_avg_L20_pct != null);
        if (valid.length === 50) {
          const sum = valid.reduce((a, x) => a + Number(x.spread_avg_L20_pct), 0);
          tfMa50Data.push({ time: sharedTimeAgg, value: roundTo(sum / 50) });
        }
      }
      if (j >= 199) {
        const window200 = aggregatedPriceData.slice(j - 199, j + 1);
        const valid = window200.filter(x => x.spread_avg_L20_pct != null);
        if (valid.length === 200) {
          const sum = valid.reduce((a, x) => a + Number(x.spread_avg_L20_pct), 0);
          tfMa200Data.push({ time: sharedTimeAgg, value: roundTo(sum / 200) });
        }
      }
    }

    // Process RAW MINUTE DATA for MAs - NEVER CHANGES regardless of timeframe
    let cumulativeSum = 0;
    let cumulativeCount = 0;
    
    for (let i = 0; i < rawMinuteData.length; i++) {
      const d = rawMinuteData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data based on previous timestamp snapshot
      if (isUpdate && t <= prevLastTimestamp) continue;
      
      const sharedTime = t;
      
      // MA data ALWAYS from 1-minute data - IDENTICAL across all timeframes
      
      // Calculate MA20 from L20 spread data (20-period moving average)
      if (d.spread_avg_L20_pct !== null && d.spread_avg_L20_pct !== undefined && i >= 19) {
        const recent20 = rawMinuteData.slice(i - 19, i + 1);
        const validSpreadData = recent20.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
        
        if (validSpreadData.length === 20) {
          const sum = validSpreadData.reduce((acc, item) => acc + Number(item.spread_avg_L20_pct), 0);
          const ma20Value = roundTo(sum / 20);
          
          ma20Data.push({
            time: sharedTime,
            value: ma20Value
          });
        }
      }
      
      if (useClientMAs) {
        // Client-side MA50/100/200/400 based on spread_avg_L20_pct
        // Ignore points where spread is missing
        if (i >= 49) {
          const recent50 = rawMinuteData.slice(i - 49, i + 1);
          const valid = recent50.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
          if (valid.length === 50) {
            const sum = valid.reduce((acc, item) => acc + Number(item.spread_avg_L20_pct), 0);
            ma50Data.push({ time: sharedTime, value: roundTo(sum / 50) });
          }
        }
        if (i >= 99) {
          const recent100 = rawMinuteData.slice(i - 99, i + 1);
          const valid = recent100.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
          if (valid.length === 100) {
            const sum = valid.reduce((acc, item) => acc + Number(item.spread_avg_L20_pct), 0);
            ma100Data.push({ time: sharedTime, value: roundTo(sum / 100) });
          }
        }
        if (i >= 199) {
          const recent200 = rawMinuteData.slice(i - 199, i + 1);
          const valid = recent200.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
          if (valid.length === 200) {
            const sum = valid.reduce((acc, item) => acc + Number(item.spread_avg_L20_pct), 0);
            ma200Data.push({ time: sharedTime, value: roundTo(sum / 200) });
          }
        }
        if (i >= 399) {
          const recent400 = rawMinuteData.slice(i - 399, i + 1);
          const valid = recent400.filter(item => item.spread_avg_L20_pct !== null && item.spread_avg_L20_pct !== undefined);
          if (valid.length === 400) {
            const sum = valid.reduce((acc, item) => acc + Number(item.spread_avg_L20_pct), 0);
            ma400Data.push({ time: sharedTime, value: roundTo(sum / 400) });
          }
        }
      } else {
        // Fallback to server-provided MAs
        if (d.ma_50 !== null && d.ma_50 !== undefined) {
          ma50Data.push({ time: sharedTime, value: roundTo(parseFloat(d.ma_50)) });
        }
        if (d.ma_100 !== null && d.ma_100 !== undefined) {
          ma100Data.push({ time: sharedTime, value: roundTo(parseFloat(d.ma_100)) });
        }
        if (d.ma_200 !== null && d.ma_200 !== undefined) {
          ma200Data.push({ time: sharedTime, value: roundTo(parseFloat(d.ma_200)) });
        }
      }
      
      // Calculate cumulative average of L20 spread data
      if (d.spread_avg_L20_pct !== null && d.spread_avg_L20_pct !== undefined) {
        cumulativeSum += Number(d.spread_avg_L20_pct);
        cumulativeCount++;
        const cumulativeAverage = roundTo(cumulativeSum / cumulativeCount);
        
        cumulativeData.push({
          time: sharedTime,
          value: cumulativeAverage
        });
      }

      if (t > maxProcessedTimestamp) maxProcessedTimestamp = t;
    }

    // Compute EMAs from the minute-resolution dataset with incremental stability
    const rawForEMA = (this.rawData && this.rawData.length) ? this.rawData : rawMinuteData;
    const pointsForEMA = isUpdate ? rawMinuteData : rawForEMA;

    const computeEMAForPoints = (period, points, incremental) => {
      const alpha = 2 / (period + 1);
      let ema = incremental ? this.emaState[period] : null;
      let seedBuffer = incremental ? (this.emaSeedBuffer[period] || []) : [];
      const result = [];
      for (let i = 0; i < points.length; i++) {
        const d = points[i];
        const v = d.spread_avg_L20_pct;
        if (v === null || v === undefined) continue;
        const val = roundTo(parseFloat(v));
        const t = Math.floor(new Date(d.time).getTime() / 1000);
        if (isUpdate && t <= prevLastTimestamp) continue;
        if (ema == null) {
          seedBuffer.push(val);
          if (seedBuffer.length === period) {
            const seed = roundTo(seedBuffer.reduce((a, b) => a + b, 0) / period);
            ema = seed;
            result.push({ time: t, value: ema });
          }
        } else {
          ema = roundTo(alpha * val + (1 - alpha) * ema);
          result.push({ time: t, value: ema });
        }
        if (t > maxProcessedTimestamp) maxProcessedTimestamp = t;
      }
      this.emaSeedBuffer[period] = seedBuffer;
      this.emaState[period] = ema;
      return result;
    };

    if (isUpdate) {
      ema20Data.push(...computeEMAForPoints(20, pointsForEMA, true));
      ema50Data.push(...computeEMAForPoints(50, pointsForEMA, true));
      ema100Data.push(...computeEMAForPoints(100, pointsForEMA, true));
      ema200Data.push(...computeEMAForPoints(200, pointsForEMA, true));
    } else {
      // Full recompute: reset state for deterministic results
      this.emaState = { 20: null, 50: null, 100: null, 200: null };
      this.emaSeedBuffer = { 20: [], 50: [], 100: [], 200: [] };
      ema20Data.push(...computeEMAForPoints(20, pointsForEMA, false));
      ema50Data.push(...computeEMAForPoints(50, pointsForEMA, false));
      ema100Data.push(...computeEMAForPoints(100, pointsForEMA, false));
      ema200Data.push(...computeEMAForPoints(200, pointsForEMA, false));
    }

    // Log timestamp alignment for debugging
    if (priceData.length > 0 && (ma50Data.length > 0 || ma20Data.length > 0)) {
      console.log(`🕐 ${this.currentTimeframe} Data Processing:`);
      console.log(`   Candlestick Data: ${priceData.length} points (RIGHT y-axis)`);
      console.log(`   Bid Spread L20 MA Data: MA20(${ma20Data.length}), MA50(${ma50Data.length}), MA100(${ma100Data.length}), MA200(${ma200Data.length}), MA400(${ma400Data.length}) points (LEFT y-axis)`);
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
      ma400Data.forEach(p => ma400.update(p));
      cumulativeData.forEach(p => cumulativeMA.update(p));
      tfMa50Data.forEach(p => tfMa50.update(p));
      tfMa200Data.forEach(p => tfMa200.update(p));
      ema20Data.forEach(p => ema20.update(p));
      ema50Data.forEach(p => ema50.update(p));
      ema100Data.forEach(p => ema100.update(p));
      ema200Data.forEach(p => ema200.update(p));
      if (volumeData.length > 0 && ensureVolumeChart()) {
        volumeData.forEach(p => volumeSeries.update(p));
      }
    } else {
      // Set complete dataset
      priceSeries.setData(priceData);
      ma20.setData(ma20Data);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
      ma400.setData(ma400Data);
      cumulativeMA.setData(cumulativeData);
      tfMa50.setData(tfMa50Data);
      tfMa200.setData(tfMa200Data);
      ema20.setData(ema20Data);
      ema50.setData(ema50Data);
      ema100.setData(ema100Data);
      ema200.setData(ema200Data);
      // Volume histogram
      if (ensureVolumeChart()) {
        volumeSeries.setData(volumeData);
      }
      
      // Fit content to show all data
      chart.timeScale().fitContent();
    }

    // Update last processed timestamp once after all computations
    this.lastTimestamp = Math.max(this.lastTimestamp, maxProcessedTimestamp);

    console.log(`✅ Chart updated with ${priceData.length} candles, SMAs, EMAs, and volume`);
  }

  async initializeChart() {
    try {
      // 1. Fetch recent data
      const recentRes = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/recent.json');
      const recentData = await recentRes.json();

      // 2. Compute daily backfill range (strictly earlier than first recent)
      const recentStart = new Date(recentData[0].time).getTime();
      const startDate = new Date(recentStart);
      // Build list of prior UTC dates for lookback
      const dates = [];
      for (let i = 1; i <= this.DAILY_LOOKBACK_DAYS; i++) {
        const d = new Date(startDate.getTime() - i * 86400000);
        dates.push(this.toDateStringUTC(d));
      }

      // 3. Fetch daily files in parallel; skip missing days gracefully
      const dailyPromises = dates.map(ds => (
        fetch(this.getDailyUrlFor(ds))
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      ));
      const dailyBatches = await Promise.all(dailyPromises);
      const dailyDataAll = dailyBatches.flat();
      // Only include strictly earlier than first recent (no overlap)
      const dailyData = dailyDataAll.filter(d => new Date(d.time).getTime() < recentStart);

      // 4. Determine deterministic boundary: archives win up to their latest minute
      const lastArchivedMs = dailyData.length ? Math.max(...dailyData.map(d => new Date(d.time).getTime())) : 0;
      const recentFiltered = recentData.filter(d => new Date(d.time).getTime() > lastArchivedMs);
      const combined = [...dailyData, ...recentFiltered]
        .sort((a, b) => new Date(a.time) - new Date(b.time));

      // 5. Deduplicate by timestamp (safety); archives come first so they win
      const deduped = [];
      const seen = new Set();
      for (const d of combined) {
        const t = d.time;
        if (!seen.has(t)) {
          deduped.push(d);
          seen.add(t);
        }
      }

      // 6. Set and process
      this.rawData = deduped;
      this.lastArchivedTimestamp = Math.floor(lastArchivedMs / 1000);
      this.lastTimestamp = 0; // reset for fresh processing
      this.processAndSetData(deduped);
      this.isFullDataLoaded = true;
      console.log(`✅ Chart loaded with ${deduped.length} points (archive boundary @ ${this.lastArchivedTimestamp})`);
    } catch (err) {
      console.error('❌ Loading error:', err);
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

      // Find new data points (strictly after last processed timestamp)
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
      console.log('🔄 Refreshing daily backfill...');
      // Rebuild from daily + new recent
      const recentRes = await fetch('https://storage.googleapis.com/garrettc-btc-bidspreadl20-data/recent.json');
      const recentData = await recentRes.json();
      const recentStart = new Date(recentData[0].time).getTime();
      const startDate = new Date(recentStart);
      const dates = [];
      for (let i = 1; i <= this.DAILY_LOOKBACK_DAYS; i++) {
        const d = new Date(startDate.getTime() - i * 86400000);
        dates.push(this.toDateStringUTC(d));
      }
      const dailyPromises = dates.map(ds => (
        fetch(this.getDailyUrlFor(ds))
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      ));
      const dailyBatches = await Promise.all(dailyPromises);
      const dailyDataAll = dailyBatches.flat();
      const dailyData = dailyDataAll.filter(d => new Date(d.time).getTime() < recentStart);

      const newLastArchivedMs = dailyData.length ? Math.max(...dailyData.map(d => new Date(d.time).getTime())) : 0;
      const newLastArchivedTs = Math.floor(newLastArchivedMs / 1000);

      if (newLastArchivedTs <= this.lastArchivedTimestamp) {
        console.log('ℹ️ No new archived data; keeping existing history intact.');
        return;
      }

      const recentFiltered = recentData.filter(d => new Date(d.time).getTime() > newLastArchivedMs);
      const combined = [...dailyData, ...recentFiltered]
        .sort((a, b) => new Date(a.time) - new Date(b.time));
      const deduped = [];
      const seen = new Set();
      for (const d of combined) {
        const t = d.time;
        if (!seen.has(t)) {
          deduped.push(d);
          seen.add(t);
        }
      }
      this.rawData = deduped;
      this.lastArchivedTimestamp = newLastArchivedTs;
      this.lastTimestamp = 0; // reset so a full reprocess occurs deterministically
      this.processAndSetData(deduped);
      console.log(`✅ Daily backfill refreshed: ${deduped.length} total points (archive boundary advanced to ${this.lastArchivedTimestamp})`);
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

// Toggle bottom indicator panel visibility
window.toggleIndicatorPanel = function toggleIndicatorPanel() {
  const indicator = document.getElementById('indicator-chart');
  const main = document.getElementById('main-chart');
  if (!indicator || !main) return;
  const isHidden = indicator.style.display === 'none' || indicator.style.display === '';
  if (isHidden) {
    // Fix main chart height to remaining space to avoid canvas overlap
    const container = document.getElementById('chart-container');
    if (container) {
      const totalH = container.clientHeight;
      const indicatorH = Math.round(totalH * 0.20);
      main.style.height = (totalH - indicatorH) + 'px';
      main.style.flex = '0 0 auto';
    }
    indicator.style.display = 'block';
    // Ensure volume chart exists when panel is shown
    try { ensureVolumeChart(); } catch (_) {}
  } else {
    indicator.style.display = 'none';
    // Restore flex so main fills
    main.style.height = '';
    main.style.flex = '1 1 auto';
  }
  try { window.chart.timeScale().fitContent(); } catch (_) {}
  console.log('Indicator panel visible:', indicator.style.display === 'block');
};

// Keep bottom panel time synchronized with main chart
try {
  const mainTs = window.chart.timeScale();
  const volTs = volumeChart.timeScale();
  mainTs.subscribeVisibleTimeRangeChange((range) => {
    if (!range) return;
    try { volTs.setVisibleRange(range); } catch (_) {}
  });
} catch (_) {}

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

// Bind MA checkbox toggles to series visibility
function setupMAToggles() {
  const bindings = [
    { id: 'toggle-ma20', series: ma20 },
    { id: 'toggle-ma50', series: ma50 },
    { id: 'toggle-ma100', series: ma100 },
    { id: 'toggle-ma200', series: ma200 },
    { id: 'toggle-ma400', series: ma400 },
    { id: 'toggle-tfma50', series: tfMa50 },
    { id: 'toggle-tfma200', series: tfMa200 },
    { id: 'toggle-ema20', series: ema20 },
    { id: 'toggle-ema50', series: ema50 },
    { id: 'toggle-ema100', series: ema100 },
    { id: 'toggle-ema200', series: ema200 },
  ];

  bindings.forEach(({ id, series }) => {
    const checkbox = document.getElementById(id);
    if (!checkbox || !series) return;

    // Initialize visibility based on current checkbox state
    series.applyOptions({ visible: checkbox.checked });

    checkbox.addEventListener('change', (e) => {
      const target = e.target;
      series.applyOptions({ visible: !!target.checked });
    });
  });
}

// Tools: Measurement and Horizontal Lines
function setupTools() {
  const btnMeasure = document.getElementById('btn-measure');
  const btnAddHLine = document.getElementById('btn-add-hline');
  const btnClearHLines = document.getElementById('btn-clear-hlines');
  const btnAddVLine = document.getElementById('btn-add-vline');
  const btnClearVLines = document.getElementById('btn-clear-vlines');
  const container = document.getElementById('chart-container');

  if (!btnMeasure || !btnAddHLine || !btnClearHLines || !btnAddVLine || !btnClearVLines || !container) return;

  let measureActive = false;
  let measureStart = null; // { time:number, price:number }
  let measureSeries = null; // temporary line series
  let measureLabel = null; // HTML overlay

  let hLineAddActive = false;
  const hLines = []; // store created priceLines

  // V-lines
  let vLineAddActive = false;
  const vLines = []; // store { series, time }

  // Drag state
  let draggingHLine = null; // { line, offsetY }
  let draggingVLine = null; // { series }

  function setDragInteractions(active) {
    // Disable chart panning/zooming and crosshair while dragging a line to improve mobile UX
    if (!window.chart) return;
    window.chart.applyOptions({
      handleScroll: {
        mouseWheel: active,
        pressedMouseMove: active,
        horzTouchDrag: active,
        vertTouchDrag: active,
      },
      handleScale: {
        mouseWheel: active,
        pinch: active,
        axisPressedMouseMove: {
          time: active,
          price: active,
        },
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { visible: active },
        horzLine: { visible: active },
      },
    });
  }

  function ensureMeasureLabel() {
    if (measureLabel) return measureLabel;
    const div = document.createElement('div');
    div.style.position = 'absolute';
    div.style.right = '10px';
    div.style.bottom = '10px';
    div.style.padding = '6px 8px';
    div.style.borderRadius = '6px';
    div.style.background = 'rgba(0,0,0,0.6)';
    div.style.color = '#fff';
    div.style.fontSize = '11px';
    div.style.pointerEvents = 'none';
    div.style.zIndex = '130';
    container.appendChild(div);
    measureLabel = div;
    return measureLabel;
  }

  function getViewportPrices() {
    const h = container.clientHeight || 0;
    const top = priceSeries.coordinateToPrice(0);
    const bottom = priceSeries.coordinateToPrice(h);
    // Fallback to a small range if not available yet
    if (top == null || bottom == null) return { top: 1, bottom: 0 };
    return { top, bottom };
  }

  function cleanupMeasure() {
    measureActive = false;
    measureStart = null;
    btnMeasure.classList.remove('btn-active');
    if (measureSeries) {
      try { chart.removeSeries(measureSeries); } catch (_) {}
      measureSeries = null;
    }
    if (measureLabel) {
      measureLabel.remove();
      measureLabel = null;
    }
  }

  function formatDuration(seconds) {
    const s = Math.abs(Math.floor(seconds));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const parts = [];
    if (d) parts.push(d + 'd');
    if (h) parts.push(h + 'h');
    if (m) parts.push(m + 'm');
    if (ss || parts.length === 0) parts.push(ss + 's');
    return parts.join(' ');
  }

  function updateMeasureLine(start, end) {
    if (!measureSeries) {
      measureSeries = chart.addLineSeries({
        priceScaleId: 'right',
        color: '#8aa3ff',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
    }
    const tStart = typeof start.time === 'number' ? start.time : start.time;
    const tEnd = typeof end.time === 'number' ? end.time : end.time;
    measureSeries.setData([
      { time: tStart, value: start.price },
      { time: tEnd, value: end.price },
    ]);

    const dt = Math.abs(tEnd - tStart);
    const dp = end.price - start.price;
    const pct = start.price !== 0 ? (dp / start.price) * 100 : 0;

    const label = ensureMeasureLabel();
    label.textContent = `ΔP ${dp.toFixed(2)} (${pct.toFixed(2)}%)  ·  ΔT ${formatDuration(dt)}`;
  }

  btnMeasure.addEventListener('click', () => {
    if (!measureActive) {
      measureActive = true;
      measureStart = null;
      btnMeasure.classList.add('btn-active');
      const label = ensureMeasureLabel();
      label.textContent = 'Click start point…';
    } else {
      cleanupMeasure();
    }
  });

  btnAddHLine.addEventListener('click', () => {
    hLineAddActive = !hLineAddActive;
    btnAddHLine.classList.toggle('btn-active', hLineAddActive);
  });

  btnClearHLines.addEventListener('click', () => {
    while (hLines.length > 0) {
      const entry = hLines.pop();
      try { priceSeries.removePriceLine(entry.line); } catch (_) {}
    }
  });

  // V-line buttons
  btnAddVLine.addEventListener('click', () => {
    vLineAddActive = !vLineAddActive;
    btnAddVLine.classList.toggle('btn-active', vLineAddActive);
  });
  btnClearVLines.addEventListener('click', () => {
    while (vLines.length > 0) {
      const v = vLines.pop();
      try { chart.removeSeries(v.series); } catch (_) {}
    }
  });

  chart.subscribeClick(param => {
    if (!param || !param.point) return;

    if (measureActive) {
      const price = priceSeries.coordinateToPrice(param.point.y);
      const time = param.time;
      if (price == null || time == null) return;

      if (!measureStart) {
        measureStart = { time, price };
        const label = ensureMeasureLabel();
        label.textContent = 'Click end point…';
      } else {
        updateMeasureLine(measureStart, { time, price });
        // Finish after brief display
        setTimeout(() => cleanupMeasure(), 2000);
      }
      return;
    }

    if (hLineAddActive) {
      const price = priceSeries.coordinateToPrice(param.point.y);
      if (price == null) return;
      const line = priceSeries.createPriceLine({
        price,
        color: '#888888',
        lineStyle: LightweightCharts.LineStyle.Dotted,
        axisLabelVisible: true,
        title: formatCompactNumber(price),
      });
      hLines.push({ line, price });
      hLineAddActive = false;
      btnAddHLine.classList.remove('btn-active');
      return;
    }

    if (vLineAddActive && param.time != null) {
      const t = param.time;
      const series = chart.addLineSeries({
        priceScaleId: 'right',
        color: '#AAAAAA',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const { top, bottom } = getViewportPrices();
      series.setData([{ time: t, value: top }, { time: t, value: bottom }]);
      vLines.push({ series, time: t });
      vLineAddActive = false;
      btnAddVLine.classList.remove('btn-active');
      return;
    }
  });

  // Dragging H/V lines (desktop)
  container.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest && e.target.closest('#tools-button, #tools-panel')) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // If add-V mode is active, create and immediately start dragging
    if (vLineAddActive) {
      const t = chart.timeScale().coordinateToTime(x);
      if (t != null) {
        const series = chart.addLineSeries({
          priceScaleId: 'right',
          color: '#AAAAAA',
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const { top, bottom } = getViewportPrices();
        series.setData([{ time: t, value: top }, { time: t, value: bottom }]);
        vLines.push({ series, time: t });
        draggingVLine = { series };
        vLineAddActive = false;
        btnAddVLine.classList.remove('btn-active');
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }

    // H-line proximity
    if (hLines.length > 0) {
      let best = null;
      for (const entry of hLines) {
        const p = entry.price ?? (entry.line.options ? entry.line.options().price : null);
        if (p == null) continue;
        const py = chart.priceScale('right').priceToCoordinate ? chart.priceScale('right').priceToCoordinate(p) : null;
        if (py == null) continue;
        const diff = Math.abs(py - y);
        if (!best || diff < best.diff) best = { line: entry.line, py, diff };
      }
      if (best && best.diff <= 6) {
        draggingHLine = { line: best.line, offsetY: y - best.py };
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }

    // V-line proximity by time-to-x
    if (vLines.length > 0) {
      let best = null;
      for (const v of vLines) {
        const tx = chart.timeScale().timeToCoordinate ? chart.timeScale().timeToCoordinate(v.time) : null;
        if (tx == null) continue;
        const diff = Math.abs(tx - x);
        if (!best || diff < best.diff) best = { v, diff };
      }
      if (best && best.diff <= 6) {
        draggingVLine = { series: best.v.series };
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }
  });

  container.addEventListener('mousemove', (e) => {
    if (draggingHLine) {
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const price = priceSeries.coordinateToPrice(y - draggingHLine.offsetY);
      if (price != null) {
        try { priceSeries.removePriceLine(draggingHLine.line); } catch (_) {}
        const newLine = priceSeries.createPriceLine({
          price,
          color: '#888888',
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: formatCompactNumber(price),
        });
        const idx = hLines.findIndex(entry => entry.line === draggingHLine.line);
        if (idx >= 0) hLines[idx] = { line: newLine, price };
        draggingHLine.line = newLine;
      }
      e.preventDefault();
    } else if (draggingVLine) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const time = chart.timeScale().coordinateToTime(x);
      if (time != null) {
        const series = draggingVLine.series;
        const { top, bottom } = getViewportPrices();
        series.setData([{ time, value: top }, { time, value: bottom }]);
        const meta = vLines.find(v => v.series === series);
        if (meta) meta.time = time;
      }
      e.preventDefault();
    }
  });

  container.addEventListener('mouseup', () => {
    if (draggingHLine || draggingVLine) setDragInteractions(true);
    draggingHLine = null;
    draggingVLine = null;
  });

  // Mobile touch drag support
  function getTouchPoint(e) {
    const touches = e.touches && e.touches.length ? e.touches : (e.changedTouches || []);
    if (!touches.length) return null;
    const t = touches[0];
    const rect = container.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top, target: t.target };
  }

  container.addEventListener('touchstart', (e) => {
    const pt = getTouchPoint(e);
    if (!pt) return;
    if (pt.target && pt.target.closest && pt.target.closest('#tools-button, #tools-panel')) return;

    // If add-V mode is active, create and immediately start dragging
    if (vLineAddActive) {
      const t = chart.timeScale().coordinateToTime(pt.x);
      if (t != null) {
        const series = chart.addLineSeries({
          priceScaleId: 'right',
          color: '#AAAAAA',
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        });
        const { top, bottom } = getViewportPrices();
        series.setData([{ time: t, value: top }, { time: t, value: bottom }]);
        vLines.push({ series, time: t });
        draggingVLine = { series };
        vLineAddActive = false;
        btnAddVLine.classList.remove('btn-active');
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }

    // H-line proximity
    if (hLines.length > 0) {
      let best = null;
      for (const entry of hLines) {
        const p = entry.price ?? (entry.line.options ? entry.line.options().price : null);
        if (p == null) continue;
        const py = chart.priceScale('right').priceToCoordinate ? chart.priceScale('right').priceToCoordinate(p) : null;
        if (py == null) continue;
        const diff = Math.abs(py - pt.y);
        if (!best || diff < best.diff) best = { line: entry.line, py, diff };
      }
    
      if (best && best.diff <= 20) {
        draggingHLine = { line: best.line, offsetY: 0 };
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }

    // V-line proximity
    if (vLines.length > 0) {
      let bestV = null;
      for (const v of vLines) {
        const tx = chart.timeScale().timeToCoordinate ? chart.timeScale().timeToCoordinate(v.time) : null;
        if (tx == null) continue;
        const diff = Math.abs(tx - pt.x);
        if (!bestV || diff < bestV.diff) bestV = { v, diff };
      }
      if (bestV && bestV.diff <= 20) {
        draggingVLine = { series: bestV.v.series };
        setDragInteractions(false);
        e.preventDefault();
        return;
      }
    }
  }, { passive: false });

  container.addEventListener('touchmove', (e) => {
    const pt = getTouchPoint(e);
    if (!pt) return;

    if (draggingHLine) {
      const price = priceSeries.coordinateToPrice(pt.y);
      if (price != null) {
        try { priceSeries.removePriceLine(draggingHLine.line); } catch (_) {}
        const newLine = priceSeries.createPriceLine({
          price,
          color: '#888888',
          lineStyle: LightweightCharts.LineStyle.Dotted,
          axisLabelVisible: true,
          title: formatCompactNumber(price),
        });
        const idx = hLines.findIndex(entry => entry.line === draggingHLine.line);
        if (idx >= 0) hLines[idx] = { line: newLine, price };
        draggingHLine.line = newLine;
      }
      e.preventDefault();
      return;
    }

    if (draggingVLine) {
      const time = chart.timeScale().coordinateToTime(pt.x);
      if (time != null) {
        const series = draggingVLine.series;
        const { top, bottom } = getViewportPrices();
        series.setData([{ time, value: top }, { time, value: bottom }]);
        const meta = vLines.find(v => v.series === series);
        if (meta) meta.time = time;
      }
      e.preventDefault();
      return;
    }
  }, { passive: false });

  container.addEventListener('touchend', () => {
    if (draggingHLine || draggingVLine) setDragInteractions(true);
    draggingHLine = null;
    draggingVLine = null;
  });

  chart.subscribeCrosshairMove(param => {
    if (!measureActive || !measureStart) return;
    if (!param || !param.time || !param.seriesPrices) return;
    const p = param.seriesPrices.get(priceSeries);
    if (p == null) return;
    updateMeasureLine(measureStart, { time: param.time, price: p });
  });
}

// Initialize everything
manager.initializeChart().then(() => {
  console.log('🎯 Chart ready with bid spread data and dual y-axis!');
  
  // Wire MA toggles
  setupMAToggles();

  // Wire Tools (measure, horizontal lines)
  setupTools();

  // Start with indicator hidden; user can toggle it on
  const ind = document.getElementById('indicator-chart');
  if (ind) ind.style.display = 'none';
  
  // Start update cycle
  manager.startUpdateCycle();
  
  // Add mobile optimizations after chart is ready
  setTimeout(addMobileOptimizations, 1000);
});

