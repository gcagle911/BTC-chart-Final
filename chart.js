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
  if (!text || text.trim() === '') {
    console.log('📄 Empty or null text received');
    return [];
  }
  
  const lines = text.trim().split('\n').filter(line => line.trim());
  console.log(`📄 Found ${lines.length} non-empty lines`);
  
  if (lines.length > 0) {
    console.log('📄 First line sample:', lines[0].substring(0, 200) + '...');
  }
  
  const parsed = lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.warn(`Failed to parse JSON line ${index + 1}:`, line.substring(0, 100), e.message);
      return null;
    }
  }).filter(Boolean);
  
  if (parsed.length > 0) {
    console.log('📊 Sample parsed object:', JSON.stringify(parsed[0], null, 2));
  }
  
  return parsed;
}

// CRITICAL: Deterministic UTC time bucketing for perfect sync
function resampleData(rows, tfMinutes, fields) {
  const step = tfMinutes * 60_000; // Timeframe in milliseconds
  const buckets = new Map();
  
  console.log(`🔄 Resampling ${rows.length} rows to ${tfMinutes}m timeframe`);
  
  for (const r of rows) {
    if (!r.ts || typeof r.ts !== 'number') continue;
    
    // CRITICAL: Floor-based UTC bucketing - deterministic
    const bucketStart = Math.floor(r.ts / step) * step;
    
    let bucket = buckets.get(bucketStart);
    if (!bucket) {
      bucket = {};
      buckets.set(bucketStart, bucket);
    }
    
    // Aggregate all specified fields
    for (const field of fields) {
      const value = r[field];
      if (typeof value === 'number' && Number.isFinite(value)) {
        if (!bucket[field]) bucket[field] = [];
        bucket[field].push(value);
      }
    }
  }
  
  // Convert buckets to sorted array
  const bucketKeys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const resampled = [];
  
  for (const bucketStart of bucketKeys) {
    const bucket = buckets.get(bucketStart);
    const row = { ts: bucketStart };
    
    // Calculate mean for each field
    for (const field of fields) {
      const values = bucket[field];
      if (values && values.length > 0) {
        row[field] = values.reduce((a, b) => a + b, 0) / values.length;
      } else {
        row[field] = null;
      }
    }
    
    resampled.push(row);
  }
  
  console.log(`✅ Resampled to ${resampled.length} ${tfMinutes}m buckets`);
  return resampled;
}

// CRITICAL: Pad missing minutes with nulls to maintain MA alignment
function padMissingMinutes(rows, tfMinutes) {
  if (!rows.length) return rows;
  
  const step = tfMinutes * 60_000;
  const out = [];
  let currentTime = rows[0].ts;
  let dataIndex = 0;
  
  while (currentTime <= rows[rows.length - 1].ts) {
    if (dataIndex < rows.length && rows[dataIndex].ts === currentTime) {
      // Data exists for this timestamp
      out.push(rows[dataIndex]);
      dataIndex++;
    } else {
      // Missing data - insert null row
      out.push({ ts: currentTime });
    }
    currentTime += step;
  }
  
  console.log(`📊 Padded ${out.length - rows.length} missing ${tfMinutes}m intervals`);
  return out;
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
  console.log(`🔄 Normalizing ${items.length} items`);
  
  const normalized = items
    .map((row, index) => {
      // Map the new data format fields
      const time = row.t || row.time || null;
      const price = row.mid ?? row.price ?? row.price_avg ?? row.close ?? row.open ?? row.high ?? row.low ?? null;
      
      // Map the spread fields from the new format
      const spreadL5 = row.spread_L5_pct ?? row.spread_L5_pct_avg ?? row.spread_avg_L5_pct ?? null;
      const spreadL50 = row.spread_L50_pct ?? row.spread_L50_pct_avg ?? row.spread_avg_L50_pct ?? null;
      const spreadL100 = row.spread_L100_pct ?? row.spread_L100_pct_avg ?? row.spread_avg_L100_pct ?? null;
      
      // Extract volume data
      const volL50Bids = row.vol_L50_bids ?? null;
      const volL50Asks = row.vol_L50_asks ?? null;
      
      if (!time || price === null || price === undefined) {
        if (index < 3) console.warn(`⚠️  Skipping row ${index}: missing time or price`, {time, price});
        return null;
      }
      
      // CRITICAL: Convert to UTC epoch milliseconds
      const utcTimestamp = new Date(time).getTime(); // Parse as UTC
      
      const normalized = {
        time, // Keep original for compatibility
        ts: utcTimestamp, // CRITICAL: UTC epoch ms for deterministic bucketing
        price: parseFloat(price),
        // Expose all spread layer fields with expected naming
        spread_L5_pct_avg: spreadL5 ? parseFloat(spreadL5) : null,
        spread_L50_pct_avg: spreadL50 ? parseFloat(spreadL50) : null,
        spread_L100_pct_avg: spreadL100 ? parseFloat(spreadL100) : null,
        // Expose volume data
        vol_L50_bids: volL50Bids ? parseFloat(volL50Bids) : null,
        vol_L50_asks: volL50Asks ? parseFloat(volL50Asks) : null
      };
      
      if (index < 2) {
        console.log(`📊 Sample normalized row ${index}:`, normalized);
      }
      
      return normalized;
    })
    .filter(Boolean)
    .sort((a, b) => new Date(a.time) - new Date(b.time));
    
  console.log(`✅ Normalized to ${normalized.length} valid data points`);
  return normalized;
}

// Chart configuration with LEFT/RIGHT dual y-axis and massive zoom range
window.chart = LightweightCharts.createChart(document.getElementById('main-chart'), {
  layout: {
    background: { 
      type: LightweightCharts.ColorType.Solid,
      color: 'transparent',
    },
    textColor: '#ffffff',
    fontSize: 9,
  },
  grid: {
    vertLines: { color: 'rgba(255, 255, 255, 0.1)' },
    horzLines: { color: 'rgba(255, 255, 255, 0.1)' },
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
  upColor: '#26a69a', // Professional green
  downColor: '#ef5350', // Professional red
  borderVisible: true,
  borderUpColor: '#26a69a', // Green borders
  borderDownColor: '#ef5350', // Red borders
  wickUpColor: '#26a69a', // Green wicks
  wickDownColor: '#ef5350', // Red wicks
  wickVisible: true,
});
chart.priceScale('right').applyOptions({
  minTick: 0.001,
  scaleMargins: { top: 0.02, bottom: 0.02 },
});
priceSeries.applyOptions({ priceFormat: { type: 'price', precision: 3, minMove: 0.001 } });

// TRADINGVIEW-STYLE: Volume indicator as part of main chart system
let volumeBidsSeries = null;
let volumeAsksSeries = null;
let volumeIndicatorEnabled = false;

// Create volume series on the main chart with separate price scale
function createVolumeSeries() {
  if (volumeBidsSeries && volumeAsksSeries) {
    console.log('📊 Volume series already exist');
    return true;
  }

  console.log('📊 Creating volume series on main chart');
  
  try {
    // CRITICAL: Use main chart but with separate 'volume' price scale
    volumeBidsSeries = chart.addAreaSeries({
      topColor: 'rgba(255, 215, 0, 0.4)', // Gold for bids with subtle opacity
      bottomColor: 'rgba(255, 215, 0, 0.1)',
      lineColor: '#FFD700', // Gold line
      lineWidth: 1.0, // Thin, elegant lines
      priceScaleId: 'volume', // CRITICAL: Separate price scale for volume
      priceFormat: { type: 'volume' },
      title: 'Bids Volume',
      visible: false, // Start hidden
    });

    volumeAsksSeries = chart.addAreaSeries({
      topColor: 'rgba(255, 255, 255, 0.4)', // White for asks with subtle opacity
      bottomColor: 'rgba(255, 255, 255, 0.1)', 
      lineColor: '#FFFFFF', // White line
      lineWidth: 1.0, // Thin, elegant lines
      priceScaleId: 'volume', // CRITICAL: Same volume price scale
      priceFormat: { type: 'volume' },
      title: 'Asks Volume',
      visible: false, // Start hidden
    });

    // Configure the volume price scale
    chart.priceScale('volume').applyOptions({
      visible: false, // Hidden by default
      scaleMargins: { top: 0.7, bottom: 0.05 }, // Position at bottom
      mode: LightweightCharts.PriceScaleMode.Normal,
      autoScale: true,
    });

    console.log('✅ Volume series created on main chart with separate price scale');
    return true;
    
  } catch (error) {
    console.error('❌ Error creating volume series:', error);
    return false;
  }
}

function destroyVolumeSeries() {
  console.log('📊 Destroying volume series');
  try {
    if (volumeBidsSeries) {
      chart.removeSeries(volumeBidsSeries);
      volumeBidsSeries = null;
    }
    if (volumeAsksSeries) {
      chart.removeSeries(volumeAsksSeries);
      volumeAsksSeries = null;
    }
    console.log('✅ Volume series destroyed');
  } catch (e) {
    console.warn('Warning destroying volume series:', e);
  }
}

// Dynamic MA series registry for multi-layer/duration combinations
function createMASeries(color, title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color,
    lineWidth: 1.2, // Sleek, elegant line width
    title,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });
}

// Dynamic EMA series registry for multi-layer/duration combinations
function createEMASeries(color, title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color,
    lineWidth: 1.2, // Sleek, elegant line width
    lineStyle: LightweightCharts.LineStyle.Dashed, // Distinguish EMAs with dashed lines
    title,
    lastValueVisible: false,
    priceLineVisible: false,
    crosshairMarkerVisible: false,
  });
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(data, period) {
  if (!data || data.length === 0 || period <= 0) return [];
  
  const emaData = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA value is the SMA of the first 'period' values
  if (data.length < period) return [];
  
  let smaSum = 0;
  for (let i = 0; i < period; i++) {
    smaSum += data[i].value;
  }
  const firstEMA = smaSum / period;
  emaData.push({ time: data[period - 1].time, value: firstEMA });
  
  // Calculate subsequent EMA values
  let previousEMA = firstEMA;
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i].value * multiplier) + (previousEMA * (1 - multiplier));
    emaData.push({ time: data[i].time, value: currentEMA });
    previousEMA = currentEMA;
  }
  
  return emaData;
}

function createAvgSeries(title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color: '#FFFFFF',
    lineWidth: 1.0, // Elegant thin white lines
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
  '#FFD700', '#FFFFFF', '#FFA500', '#F5F5DC',
  '#DAA520', '#FFFACD', '#B8860B', '#FFEFD5',
  '#FFDF00', '#FAF0E6', '#F0E68C', '#FFF8DC',
  '#EEE8AA', '#FAFAD2', '#DDD700', '#FFFFF0'
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
    // Multi-layer MA controls with sensible defaults
    this.selectedLayers = new Set(['spread_L50_pct_avg']); // Default to L50 layer
    this.selectedDurations = new Set([50, 200]); // Default to 50 and 200 period MAs
    this.selectedEMADurations = new Set([50]); // Default to 50 period EMA
    this.maSeriesByKey = new Map(); // key: `${layerKey}|${duration}` -> lineSeries
    this.emaSeriesByKey = new Map(); // key: `${layerKey}|${duration}` -> EMA lineSeries
    this.avgSeriesByLayer = new Map(); // key: layerKey -> white average line series
    this.maRawDataByKey = new Map(); // key: `${layerKey}|${duration}` -> raw [{time,value}]
    this.emaRawDataByKey = new Map(); // key: `${layerKey}|${duration}` -> raw EMA [{time,value}]
    this.scaleFactorsByKey = new Map(); // key -> factor number
    this.emaScaleFactorsByKey = new Map(); // key -> EMA factor number
    this.normalizeEnabled = false;
    // Volume indicator
    this.volumeIndicatorEnabled = false;
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
      // Only auto-scale right axis (price data)
      chart.priceScale('right').applyOptions({ autoScale: true });
      // Never auto-scale left axis to prevent MA visibility issues
      // Left axis is manually controlled via Y-axis drag overlay
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
        spread_avg_L20_pct: item.spread_avg_L20_pct ?? item.spread_pct ?? null,
        // CRITICAL: Include ALL spread and volume fields for bucketing
        spread_L5_pct_avg: item.spread_L5_pct_avg,
        spread_L50_pct_avg: item.spread_L50_pct_avg,
        spread_L100_pct_avg: item.spread_L100_pct_avg,
        vol_L50_bids: item.vol_L50_bids,
        vol_L50_asks: item.vol_L50_asks
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
        
        // CRITICAL: Calculate average volume for the bucket
        const avgVolBids = bucket.dataPoints
          .filter(p => p.vol_L50_bids !== null)
          .reduce((sum, p, _, arr) => sum + p.vol_L50_bids / arr.length, 0) || null;
        const avgVolAsks = bucket.dataPoints
          .filter(p => p.vol_L50_asks !== null)
          .reduce((sum, p, _, arr) => sum + p.vol_L50_asks / arr.length, 0) || null;

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
          // CRITICAL: Include spread fields from close point
          spread_L5_pct_avg: closePoint.spread_L5_pct_avg,
          spread_L50_pct_avg: closePoint.spread_L50_pct_avg,
          spread_L100_pct_avg: closePoint.spread_L100_pct_avg,
          // CRITICAL: Include aggregated volume data
          vol_L50_bids: avgVolBids,
          vol_L50_asks: avgVolAsks,
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

    // Calculate and set/update EMA series for each combination
    const activeEMADurations = Array.from(this.selectedEMADurations);
    for (const layerKey of activeLayers) {
      const series = layerToSeries.get(layerKey);
      if (!series || series.length === 0) continue;
      for (const duration of activeEMADurations) {
        const key = `${layerKey}|EMA${duration}`;
        if (!this.emaSeriesByKey.has(key)) {
          const color = colorFor(layerKey, duration + 1000); // Offset color index for EMAs
          const title = `${formatLayerShort(layerKey)}EMA${duration}`;
          this.emaSeriesByKey.set(key, createEMASeries(color, title));
          // start hidden; visibility applied after computation
          this.emaSeriesByKey.get(key).applyOptions({ visible: false });
        }
        const emaLineSeries = this.emaSeriesByKey.get(key);
        const emaPoints = calculateEMA(series, duration);
        this.emaRawDataByKey.set(key, emaPoints);
        const emaFactor = this.normalizeEnabled ? (this.emaScaleFactorsByKey.get(key) || 1) : 1;
        const emaScaled = emaFactor === 1 ? emaPoints : emaPoints.map(p => ({ time: p.time, value: p.value * emaFactor }));
        if (isUpdate) {
          emaScaled.forEach(p => emaLineSeries.update(p));
        } else {
          emaLineSeries.setData(emaScaled);
        }
      }
    }

    // CRITICAL: Update volume chart with SAME data as candlesticks
    if (this.volumeIndicatorEnabled && !isUpdate) {
      // Use the raw data since volume series are on the same chart now
      setTimeout(() => this.updateVolumeChart(rawMinuteData), 50);
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
      
      // Only fit content on initial load, not on updates to preserve user's zoom/pan position
      if (!isUpdate) {
        chart.timeScale().fitContent();
      }
      // Ensure right axis scales to new data range (left axis stays manual)
      this.applyAutoScale();
    }

    // Apply visibility after any computation
    this.applyMAVisibility();
  }

  applyMAVisibility() {
    try {
      let visibleCount = 0;
      let totalSeries = 0;
      
      // Apply MA series visibility
      for (const [key, series] of this.maSeriesByKey.entries()) {
        if (!series) {
          console.warn(`⚠️  Missing series for key: ${key}`);
          continue;
        }
        
        totalSeries++;
        const [layerKey, durationStr] = key.split('|');
        const duration = parseInt(durationStr, 10);
        const shouldBeVisible = this.selectedLayers.has(layerKey) && this.selectedDurations.has(duration);
        
        // Force visibility state - don't rely on previous state
        series.applyOptions({ visible: shouldBeVisible });
        
        if (shouldBeVisible) {
          visibleCount++;
          // Ensure the series has data
          const rawData = this.maRawDataByKey.get(key);
          if (!rawData || rawData.length === 0) {
            console.warn(`⚠️  Series ${key} is visible but has no data`);
          }
        }
        
        // Update title suffix for current factor
        const factor = this.normalizeEnabled ? (this.scaleFactorsByKey.get(key) || 1) : 1;
        const baseTitle = `${formatLayerShort(layerKey)}MA${duration}`;
        const suffix = this.normalizeEnabled ? ` ×${factor.toFixed(2)}` : '';
        series.applyOptions({ title: baseTitle + suffix });
      }
      
      // Apply EMA series visibility
      for (const [key, series] of this.emaSeriesByKey.entries()) {
        if (!series) {
          console.warn(`⚠️  Missing EMA series for key: ${key}`);
          continue;
        }
        
        totalSeries++;
        const [layerKey, emaDurationStr] = key.split('|');
        const duration = parseInt(emaDurationStr.replace('EMA', ''), 10);
        const shouldBeVisible = this.selectedLayers.has(layerKey) && this.selectedEMADurations.has(duration);
        
        // Force visibility state - don't rely on previous state
        series.applyOptions({ visible: shouldBeVisible });
        
        if (shouldBeVisible) {
          visibleCount++;
          // Ensure the series has data
          const rawData = this.emaRawDataByKey.get(key);
          if (!rawData || rawData.length === 0) {
            console.warn(`⚠️  EMA Series ${key} is visible but has no data`);
          }
        }
        
        // Update title suffix for current factor
        const factor = this.normalizeEnabled ? (this.emaScaleFactorsByKey.get(key) || 1) : 1;
        const baseTitle = `${formatLayerShort(layerKey)}EMA${duration}`;
        const suffix = this.normalizeEnabled ? ` ×${factor.toFixed(2)}` : '';
        series.applyOptions({ title: baseTitle + suffix });
      }

      // Apply cumulative avg visibility
      for (const [layerKey, series] of this.avgSeriesByLayer.entries()) {
        if (!series) {
          console.warn(`⚠️  Missing avg series for layer: ${layerKey}`);
          continue;
        }
        
        const avgVisible = !!this.cumulativeAvgVisible;
        series.applyOptions({ visible: avgVisible });
        if (avgVisible) visibleCount++;
      }
      
      console.log(`✅ MA Visibility: ${visibleCount}/${totalSeries} series visible`);
      
      if (visibleCount === 0 && totalSeries > 0) {
        console.warn(`⚠️  No MA series are visible despite ${totalSeries} series existing`);
        console.log(`📊 Selected layers: [${Array.from(this.selectedLayers).join(', ')}]`);
        console.log(`📊 Selected durations: [${Array.from(this.selectedDurations).join(', ')}]`);
        this.validateMASeriesState();
      }
    } catch (e) {
      console.error('❌ Failed to apply MA visibility:', e);
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
      console.log(`🔍 Fetching: ${url}`);
      const res = await fetch(url);
      console.log(`📡 Response status: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        console.warn(`❌ Failed to fetch ${url}: ${res.status} ${res.statusText}`);
        return [];
      }
      const text = await res.text();
      console.log(`📄 Response length: ${text.length} characters`);
      const jsonLines = parseJsonLines(text);
      console.log(`📊 Parsed ${jsonLines.length} JSON lines`);
      const data = normalizeApiData(jsonLines);
      console.log(`✅ Normalized to ${data.length} data points`);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(`❌ Error fetching ${dateStr}:`, error);
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
      console.log(`🔄 Update fetch: ${url}`);
      const res = await fetch(url);
      console.log(`📡 Update response: ${res.status} ${res.statusText}`);
      if (!res.ok) {
        console.warn(`❌ Update failed: ${res.status} ${res.statusText}`);
        return;
      }
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
    
    // Only auto-scale right axis on timeframe change
    this.applyAutoScale();
    
    // Volume automatically syncs since it's on the same chart
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label}`);
  }

  toggleLayer(layerKey, enabled) {
    const allowed = new Set(['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg']);
    if (!allowed.has(layerKey)) return;
    
    console.log(`🔄 Layer toggle: ${layerKey} -> ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      this.selectedLayers.add(layerKey);
    } else {
      this.selectedLayers.delete(layerKey);
    }
    
    console.log(`📊 Selected layers: [${Array.from(this.selectedLayers).join(', ')}]`);
    console.log(`📊 Selected durations: [${Array.from(this.selectedDurations).join(', ')}]`);
    
    // Always reprocess data to ensure proper series creation/deletion
    if (this.rawData && this.rawData.length > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
      console.log(`✅ Layer toggle complete - reprocessed ${this.rawData.length} data points`);
    } else {
      // If no data yet, just apply visibility
      this.applyMAVisibility();
    }
  }

  toggleDuration(duration, enabled) {
    const allowed = new Set([20, 50, 100, 200]);
    if (!allowed.has(duration)) return;
    
    console.log(`🔄 MA Duration toggle: ${duration} -> ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      this.selectedDurations.add(duration);
    } else {
      this.selectedDurations.delete(duration);
    }
    
    console.log(`📊 Selected layers: [${Array.from(this.selectedLayers).join(', ')}]`);
    console.log(`📊 Selected MA durations: [${Array.from(this.selectedDurations).join(', ')}]`);
    
    // Always reprocess data to ensure proper series creation/deletion
    if (this.rawData && this.rawData.length > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
      console.log(`✅ MA Duration toggle complete - reprocessed ${this.rawData.length} data points`);
    } else {
      // If no data yet, just apply visibility
      this.applyMAVisibility();
    }
  }

  toggleEMADuration(duration, enabled) {
    const allowed = new Set([20, 50, 100, 200]);
    if (!allowed.has(duration)) return;
    
    console.log(`🔄 EMA Duration toggle: ${duration} -> ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      this.selectedEMADurations.add(duration);
    } else {
      this.selectedEMADurations.delete(duration);
    }
    
    console.log(`📊 Selected layers: [${Array.from(this.selectedLayers).join(', ')}]`);
    console.log(`📊 Selected EMA durations: [${Array.from(this.selectedEMADurations).join(', ')}]`);
    
    // Always reprocess data to ensure proper series creation/deletion
    if (this.rawData && this.rawData.length > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData);
      console.log(`✅ EMA Duration toggle complete - reprocessed ${this.rawData.length} data points`);
    } else {
      // If no data yet, just apply visibility
      this.applyMAVisibility();
    }
  }


  toggleVolumeIndicator(enabled) {
    console.log(`🔄 TRADINGVIEW-STYLE Volume Indicator: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    this.volumeIndicatorEnabled = enabled;
    
    if (enabled) {
      // CRITICAL: Create volume series on main chart (TradingView style)
      const success = createVolumeSeries();
      if (success) {
        // Show volume price scale
        chart.priceScale('volume').applyOptions({ visible: true });
        
        // Show volume series
        volumeBidsSeries.applyOptions({ visible: true });
        volumeAsksSeries.applyOptions({ visible: true });
        
        // Process existing data if available
        if (this.rawData && this.rawData.length > 0) {
          console.log(`📊 Processing existing data for TradingView-style volume`);
          // Reprocess data to include volume in bucketing
          this.processAndSetData(this.rawData, false);
        }
        
        console.log('✅ TRADINGVIEW-STYLE: Volume indicator enabled on main chart');
      } else {
        console.error('❌ Failed to create volume series');
      }
      
    } else {
      // Hide volume series and price scale
      if (volumeBidsSeries) volumeBidsSeries.applyOptions({ visible: false });
      if (volumeAsksSeries) volumeAsksSeries.applyOptions({ visible: false });
      chart.priceScale('volume').applyOptions({ visible: false });
      
      console.log('✅ TRADINGVIEW-STYLE: Volume indicator disabled');
    }
  }

  updateVolumeChart(rawData = null) {
    if (!this.volumeIndicatorEnabled || !volumeBidsSeries || !volumeAsksSeries) {
      return;
    }

    // Use raw data since volume series are on the same chart
    const dataToUse = rawData || this.rawData;
    if (!dataToUse || dataToUse.length === 0) {
      console.warn('⚠️  No data for volume');
      return;
    }
    
    console.log(`📊 TRADINGVIEW-STYLE: Updating volume with ${dataToUse.length} data points`);
    
    const bidsData = [];
    const asksData = [];
    
    // Process volume data from raw minute data
    for (const item of dataToUse) {
      if (item.vol_L50_bids !== null && item.vol_L50_asks !== null) {
        const time = this.toUnixTimestamp(item.time);
        bidsData.push({ time, value: parseFloat(item.vol_L50_bids) });
        asksData.push({ time, value: parseFloat(item.vol_L50_asks) });
      }
    }
    
    console.log(`📊 TRADINGVIEW-STYLE: Setting ${bidsData.length} volume points on main chart`);
    
    if (bidsData.length > 0) {
      volumeBidsSeries.setData(bidsData);
      volumeAsksSeries.setData(asksData);
      console.log('✅ TRADINGVIEW-STYLE: Volume data set on main chart');
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
    // Remove dynamic MA, EMA, avg, and volume series completely
    console.log(`🧹 Clearing ${this.maSeriesByKey.size} MA series, ${this.emaSeriesByKey.size} EMA series, and ${this.avgSeriesByLayer.size} avg series for symbol switch`);
    try {
      for (const [key, series] of this.maSeriesByKey.entries()) {
        chart.removeSeries(series);
      }
      this.maSeriesByKey.clear();
      for (const [key, series] of this.emaSeriesByKey.entries()) {
        chart.removeSeries(series);
      }
      this.emaSeriesByKey.clear();
      for (const [key, series] of this.avgSeriesByLayer.entries()) {
        chart.removeSeries(series);
      }
      this.avgSeriesByLayer.clear();
      
      // Clear volume series
      destroyVolumeSeries();
    } catch (e) { 
      console.error('❌ Failed clearing series during symbol switch:', e); 
    }

    // Load data and restart update cycles
    await this.initializeChart();
    // Apply autoscale after loading new symbol
    this.applyAutoScale();
    this.startUpdateCycle();
    
    // Volume automatically syncs since it's on the same chart
  }

  async switchExchange(exchange) {
    if (!exchange || API_EXCHANGE === exchange) return;
    console.log(`🔁 Switching exchange to ${exchange}`);
    API_EXCHANGE = exchange;
    // Reload everything for current symbol using new exchange
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    // Clear series
    console.log(`🧹 Clearing ${this.maSeriesByKey.size} MA series, ${this.emaSeriesByKey.size} EMA series, and ${this.avgSeriesByLayer.size} avg series for exchange switch`);
    try {
      priceSeries.setData([]);
      for (const [key, series] of this.maSeriesByKey.entries()) { chart.removeSeries(series); }
      this.maSeriesByKey.clear();
      for (const [key, series] of this.emaSeriesByKey.entries()) { chart.removeSeries(series); }
      this.emaSeriesByKey.clear();
      for (const [key, series] of this.avgSeriesByLayer.entries()) { chart.removeSeries(series); }
      this.avgSeriesByLayer.clear();
    } catch(e) {
      console.error('❌ Failed clearing series during exchange switch:', e);
    }
    this.rawData = [];
    this.lastTimestamp = 0;
    this.isFullDataLoaded = false;
    await this.initializeChart();
    this.applyAutoScale();
    this.startUpdateCycle();
    
    // Volume automatically syncs since it's on the same chart
  }

  startUpdateCycle() {
    // Clear existing intervals
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Update with recent data every 30 seconds
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), 30000);

    // Refresh complete historical data every hour
    this.refreshInterval = setInterval(() => this.refreshHistoricalData(), 3600000);

    // DISABLED: Subscribe to visible range changes to prevent MA disappearing during scroll
    // This was causing MAs to disappear randomly during chart interactions
    // Normalization will only update when explicitly toggled or when data changes
    /*
    try {
      const debounced = () => this.recomputeScaleFactorsAndRefresh();
      chart.timeScale().subscribeVisibleTimeRangeChange(debounced);
    } catch (_) {}
    */
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
      // Only recompute if normalization is enabled, otherwise skip to avoid axis interference
      if (this.normalizeEnabled) {
        this.computeScaleFactorsForVisibleRange();
        this.refreshVisibleMALines();
      }
      // Don't call applyMAVisibility here as it's not needed for range changes
      // and can interfere with manual left axis positioning
    }, 100); // Reduced debounce time to minimize flicker
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

  // Debug function to validate MA and EMA series state
  validateMASeriesState() {
    const expectedMASeries = [];
    const expectedEMASeries = [];
    
    for (const layerKey of this.selectedLayers) {
      for (const duration of this.selectedDurations) {
        expectedMASeries.push(`${layerKey}|${duration}`);
      }
      for (const duration of this.selectedEMADurations) {
        expectedEMASeries.push(`${layerKey}|EMA${duration}`);
      }
    }
    
    const actualMASeries = Array.from(this.maSeriesByKey.keys());
    const actualEMASeries = Array.from(this.emaSeriesByKey.keys());
    
    const missingMASeries = expectedMASeries.filter(key => !this.maSeriesByKey.has(key));
    const extraMASeries = actualMASeries.filter(key => !expectedMASeries.includes(key));
    const missingEMASeries = expectedEMASeries.filter(key => !this.emaSeriesByKey.has(key));
    const extraEMASeries = actualEMASeries.filter(key => !expectedEMASeries.includes(key));
    
    let hasIssues = false;
    
    if (missingMASeries.length > 0 || extraMASeries.length > 0) {
      console.warn(`⚠️  MA Series State Mismatch:`);
      console.warn(`   Expected: [${expectedMASeries.join(', ')}]`);
      console.warn(`   Actual: [${actualMASeries.join(', ')}]`);
      if (missingMASeries.length > 0) console.warn(`   Missing: [${missingMASeries.join(', ')}]`);
      if (extraMASeries.length > 0) console.warn(`   Extra: [${extraMASeries.join(', ')}]`);
      hasIssues = true;
    }
    
    if (missingEMASeries.length > 0 || extraEMASeries.length > 0) {
      console.warn(`⚠️  EMA Series State Mismatch:`);
      console.warn(`   Expected: [${expectedEMASeries.join(', ')}]`);
      console.warn(`   Actual: [${actualEMASeries.join(', ')}]`);
      if (missingEMASeries.length > 0) console.warn(`   Missing: [${missingEMASeries.join(', ')}]`);
      if (extraEMASeries.length > 0) console.warn(`   Extra: [${extraEMASeries.join(', ')}]`);
      hasIssues = true;
    }
    
    return !hasIssues;
  }

  refreshVisibleMALines() {
    // Preserve current left axis range if it was manually set
    let preservedLeftRange = null;
    try {
      const leftScale = chart.priceScale('left');
      const currentRange = leftScale.getPriceRange?.();
      if (currentRange && isFinite(currentRange.minValue) && isFinite(currentRange.maxValue)) {
        preservedLeftRange = { minValue: currentRange.minValue, maxValue: currentRange.maxValue };
      }
    } catch (_) {}
    
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
      
      // IMPORTANT: Maintain visibility state during refresh
      const shouldBeVisible = this.selectedLayers.has(layerKey) && this.selectedDurations.has(duration);
      series.applyOptions({ 
        title: baseTitle + suffix,
        visible: shouldBeVisible  // Explicitly maintain visibility
      });
    }
    
    // Restore preserved left axis range to prevent snapping
    if (preservedLeftRange) {
      try {
        setTimeout(() => {
          chart.priceScale('left').setPriceRange(preservedLeftRange);
        }, 10); // Small delay to ensure setData operations are complete
      } catch (_) {}
    }

    // Also refresh EMA series
    for (const [key, series] of this.emaSeriesByKey.entries()) {
      const raw = this.emaRawDataByKey.get(key) || [];
      const factor = this.normalizeEnabled ? (this.emaScaleFactorsByKey.get(key) || 1) : 1;
      const points = raw.map(p => ({ time: p.time, value: p.value * factor }));
      series.setData(points);
      
      // Update title with multiplier
      const [layerKey, emaDurationStr] = key.split('|');
      const duration = parseInt(emaDurationStr.replace('EMA', ''), 10);
      const baseTitle = `${formatLayerShort(layerKey)}EMA${duration}`;
      const clampedNote = this.normalizeEnabled && (factor <= 0.1001 || factor >= 9.999) ? ' (clamped)' : '';
      const suffix = this.normalizeEnabled ? ` ×${(factor).toFixed(2)}${clampedNote}` : '';
      
      // IMPORTANT: Maintain visibility state during refresh
      const shouldBeVisible = this.selectedLayers.has(layerKey) && this.selectedEMADurations.has(duration);
      series.applyOptions({ 
        title: baseTitle + suffix,
        visible: shouldBeVisible  // Explicitly maintain visibility
      });
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

function toggleEMADuration(duration, enabled) {
  manager.toggleEMADuration(duration, enabled);
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

function toggleVolumeIndicator(enabled) {
  manager.toggleVolumeIndicator(enabled);
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
      const newVisibleRange = {
        from: middle - newRange / 2,
        to: middle + newRange / 2
      };
      timeScale.setVisibleRange(newVisibleRange);
      
      // CRITICAL: Sync volume chart immediately after zoom
      if (volumeChart && manager.volumeIndicatorEnabled) {
        setTimeout(() => {
          volumeChart.timeScale().setVisibleRange(newVisibleRange);
          console.log('🔄 ZOOM SYNC: Volume chart synced after zoom in');
        }, 10);
      }
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
      const newVisibleRange = {
        from: middle - newRange / 2,
        to: middle + newRange / 2
      };
      timeScale.setVisibleRange(newVisibleRange);
      
      // CRITICAL: Sync volume chart immediately after zoom
      if (volumeChart && manager.volumeIndicatorEnabled) {
        setTimeout(() => {
          volumeChart.timeScale().setVisibleRange(newVisibleRange);
          console.log('🔄 ZOOM SYNC: Volume chart synced after zoom out');
        }, 10);
      }
    }
  }
}

function fitContent() {
  if (window.chart) {
    window.chart.timeScale().fitContent();
    
    // CRITICAL: Sync volume chart after fit content
    if (volumeChart && manager.volumeIndicatorEnabled) {
      setTimeout(() => {
        volumeChart.timeScale().fitContent();
        console.log('🔄 FIT SYNC: Volume chart synced after fit content');
      }, 10);
    }
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
  
  // CRITICAL: Initialize volume series for TradingView-style indicators
  createVolumeSeries();
  
  // Start update cycle
  manager.startUpdateCycle();
  
  // Add mobile optimizations after chart is ready
  setTimeout(addMobileOptimizations, 1000);
});

