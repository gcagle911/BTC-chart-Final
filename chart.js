// Simplified Bitcoin Chart - Clean Interface   
// Main price chart with Bid Spread MAs on LEFT y-axis and enhanced zoom capability

// =============================================================================
// TRIGGER CONFIGURATION - CLEAN SLATE
// =============================================================================
const TRIGGER_CONFIG = {
  skull: {
    enabled: true,
    triggerTime: "09:30",  // 9:30 AM EST
    timezone: "America/New_York"
  },
  goldX: {
    enabled: true,
    triggerTime: "20:00",  // 8:00 PM EST
    timezone: "America/New_York"
  }
};

// Data sources mapped by symbol
const API_BASE = 'https://storage.googleapis.com/bananazone';
let API_EXCHANGE = 'coinbase';

// Earliest available data date
const EARLIEST_DATA_DATE = new Date('2025-09-09T00:00:00Z');

// =============================================================================
// CLEAN SLATE - SIMPLE TIME-BASED TRIGGERS
// =============================================================================

// Check if skull trigger time (9:30 AM EST) falls within this candle's timeframe
function checkSkullTrigger(candleTime, timeframeSeconds) {
  if (!TRIGGER_CONFIG.skull.enabled) return false;
  
  // Parse target time
  const [targetHour, targetMinute] = TRIGGER_CONFIG.skull.triggerTime.split(':').map(Number);
  
  // Convert candle time to EST and get hour/minute
  const candleDate = new Date(candleTime * 1000);
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TRIGGER_CONFIG.skull.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const estParts = estFormatter.formatToParts(candleDate);
  const candleHour = parseInt(estParts.find(part => part.type === 'hour').value);
  const candleMinute = parseInt(estParts.find(part => part.type === 'minute').value);
  
  // For different timeframes, check if target time would fall within this candle
  const candleEndTime = candleTime + timeframeSeconds;
  const candleEndDate = new Date(candleEndTime * 1000);
  const candleEndParts = estFormatter.formatToParts(candleEndDate);
  const candleEndHour = parseInt(candleEndParts.find(part => part.type === 'hour').value);
  const candleEndMinute = parseInt(candleEndParts.find(part => part.type === 'minute').value);
  
  // Convert times to minutes for easier comparison
  const targetMinutes = targetHour * 60 + targetMinute;
  const candleStartMinutes = candleHour * 60 + candleMinute;
  const candleEndMinutes = candleEndHour * 60 + candleEndMinute;
  
  // Handle day boundary crossing
  let matches = false;
  if (candleEndMinutes > candleStartMinutes) {
    // Normal case - candle doesn't cross day boundary
    matches = targetMinutes >= candleStartMinutes && targetMinutes < candleEndMinutes;
  } else {
    // Candle crosses midnight
    matches = targetMinutes >= candleStartMinutes || targetMinutes < candleEndMinutes;
  }
  
  if (matches) {
    console.log(`💀 SKULL TRIGGER: Target ${TRIGGER_CONFIG.skull.triggerTime} EST falls within candle ${candleHour.toString().padStart(2,'0')}:${candleMinute.toString().padStart(2,'0')} - ${candleEndHour.toString().padStart(2,'0')}:${candleEndMinute.toString().padStart(2,'0')}`);
  }
  
  return matches;
}

// Check if Gold X trigger time (8:00 PM EST) falls within this candle's timeframe
function checkGoldXTrigger(candleTime, timeframeSeconds) {
  if (!TRIGGER_CONFIG.goldX.enabled) return false;
  
  // Parse target time
  const [targetHour, targetMinute] = TRIGGER_CONFIG.goldX.triggerTime.split(':').map(Number);
  
  // Convert candle time to EST and get hour/minute
  const candleDate = new Date(candleTime * 1000);
  const estFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TRIGGER_CONFIG.goldX.timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  
  const estParts = estFormatter.formatToParts(candleDate);
  const candleHour = parseInt(estParts.find(part => part.type === 'hour').value);
  const candleMinute = parseInt(estParts.find(part => part.type === 'minute').value);
  
  // For different timeframes, check if target time would fall within this candle
  const candleEndTime = candleTime + timeframeSeconds;
  const candleEndDate = new Date(candleEndTime * 1000);
  const candleEndParts = estFormatter.formatToParts(candleEndDate);
  const candleEndHour = parseInt(candleEndParts.find(part => part.type === 'hour').value);
  const candleEndMinute = parseInt(candleEndParts.find(part => part.type === 'minute').value);
  
  // Convert times to minutes for easier comparison
  const targetMinutes = targetHour * 60 + targetMinute;
  const candleStartMinutes = candleHour * 60 + candleMinute;
  const candleEndMinutes = candleEndHour * 60 + candleEndMinute;
  
  // Handle day boundary crossing
  let matches = false;
  if (candleEndMinutes > candleStartMinutes) {
    // Normal case - candle doesn't cross day boundary
    matches = targetMinutes >= candleStartMinutes && targetMinutes < candleEndMinutes;
  } else {
    // Candle crosses midnight
    matches = targetMinutes >= candleStartMinutes || targetMinutes < candleEndMinutes;
  }
  
  if (matches) {
    console.log(`✖️ GOLD X TRIGGER: Target ${TRIGGER_CONFIG.goldX.triggerTime} EST falls within candle ${candleHour.toString().padStart(2,'0')}:${candleMinute.toString().padStart(2,'0')} - ${candleEndHour.toString().padStart(2,'0')}:${candleEndMinute.toString().padStart(2,'0')}`);
  }
  
  return matches;
}

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
  // Handle futures exchanges with different URL structure
  if (API_EXCHANGE === 'coinbase_F') {
    return `${API_BASE}/futures/coinbase/${asset}/1min/${day}.jsonl`;
  } else if (API_EXCHANGE === 'okx' || API_EXCHANGE === 'upbit') {
    return `${API_BASE}/futures/${API_EXCHANGE}/${asset}/1min/${day}.jsonl`;
  } else {
    // Standard spot exchanges (coinbase, kraken)
    return `${API_BASE}/${API_EXCHANGE}/${asset}/1min/${day}.jsonl`;
  }
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
    autoScale: false, // Keep manual control but allow scaling
    mode: LightweightCharts.PriceScaleMode.Normal,
  },
  timeScale: { 
    timeVisible: true, 
    secondsVisible: false,
    borderVisible: false,
    rightOffset: 15,
    barSpacing: 10, // Wider candlestick bodies with less space between
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
    axisPressedMouseMove: { time: true, price: true }, // Restore price axis scaling
    mouseWheel: true, 
    pinch: true 
  },
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

// TRADINGVIEW-STYLE: Multiple indicators as part of main chart system
let volumeBidsSeries = null;
let volumeAsksSeries = null;
let volumeIndicatorEnabled = false;

// Interactive Signal System
let signalMarkerSeries = null;
let activeSignals = new Map(); // time -> signal data
let signalSystemEnabled = false;

// Indicator 2 series (timeframe-averaged volume)
let indicator2BidsSeries = null;
let indicator2AsksSeries = null;
let indicator2Enabled = false;

// Indicator 3 series (ready for your data)  
let indicator3Series = null;
let indicator3Enabled = false;

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

// Create Indicator 2 series on main chart (Timeframe-Averaged Volume)
function createIndicator2Series() {
  if (indicator2BidsSeries && indicator2AsksSeries) {
    console.log('📊 Indicator 2 series already exist');
    return true;
  }

  console.log('📊 Creating Indicator 2 series (Timeframe-Averaged Volume)');
  
  try {
    // Create two series for bids and asks like volume but averaged by timeframe
    indicator2BidsSeries = chart.addAreaSeries({
      topColor: 'rgba(255, 215, 0, 0.3)', // Gold for bids with less opacity
      bottomColor: 'rgba(255, 215, 0, 0.05)',
      lineColor: '#FFD700',
      lineWidth: 1.0,
      priceScaleId: 'indicator2',
      priceFormat: { type: 'volume' },
      title: 'Averaged Bids',
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false,
    });

    indicator2AsksSeries = chart.addAreaSeries({
      topColor: 'rgba(255, 255, 255, 0.3)', // White for asks with less opacity
      bottomColor: 'rgba(255, 255, 255, 0.05)',
      lineColor: '#FFFFFF',
      lineWidth: 1.0,
      priceScaleId: 'indicator2',
      priceFormat: { type: 'volume' },
      title: 'Averaged Asks',
      lastValueVisible: true,
      crosshairMarkerVisible: true,
      visible: false,
    });

    // Configure indicator 2 price scale (middle section)
    chart.priceScale('indicator2').applyOptions({
      visible: false,
      scaleMargins: { top: 0.4, bottom: 0.4 }, // Middle 20% of chart
      mode: LightweightCharts.PriceScaleMode.Normal,
      autoScale: true,
    });

    console.log('✅ Indicator 2 series (Timeframe-Averaged Volume) created');
    return true;
  } catch (error) {
    console.error('❌ Error creating Indicator 2 series:', error);
    return false;
  }
}

// Create Indicator 3 series on main chart  
function createIndicator3Series() {
  if (indicator3Series) {
    console.log('📊 Indicator 3 series already exists');
    return true;
  }

  console.log('📊 Creating Indicator 3 series on main chart');
  
  try {
    indicator3Series = chart.addLineSeries({
      priceScaleId: 'indicator3',
      color: '#FFFFFF', // White color
      lineWidth: 1.2,
      title: 'Indicator 3',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      visible: false,
    });

    // Configure indicator 3 price scale (top section)
    chart.priceScale('indicator3').applyOptions({
      visible: false,
      scaleMargins: { top: 0.05, bottom: 0.8 }, // Top 15% of chart
      mode: LightweightCharts.PriceScaleMode.Normal,
      autoScale: true,
    });

    console.log('✅ Indicator 3 series created');
    return true;
  } catch (error) {
    console.error('❌ Error creating Indicator 3 series:', error);
    return false;
  }
}

function destroyIndicator2Series() {
  try {
    if (indicator2BidsSeries) {
      chart.removeSeries(indicator2BidsSeries);
      indicator2BidsSeries = null;
    }
    if (indicator2AsksSeries) {
      chart.removeSeries(indicator2AsksSeries);
      indicator2AsksSeries = null;
    }
    console.log('✅ Indicator 2 series destroyed');
  } catch (e) {
    console.warn('Warning destroying Indicator 2 series:', e);
  }
}

function destroyIndicator3Series() {
  if (indicator3Series) {
    try {
      chart.removeSeries(indicator3Series);
      indicator3Series = null;
      console.log('✅ Indicator 3 series destroyed');
    } catch (e) {
      console.warn('Warning destroying Indicator 3 series:', e);
    }
  }
}

// Create interactive signal marker series
function createSignalMarkerSeries() {
  if (signalMarkerSeries) {
    console.log('📍 Signal marker series already exists');
    return signalMarkerSeries;
  }

  console.log('📍 Creating signal marker series');
  
  try {
    signalMarkerSeries = chart.addLineSeries({
      color: 'transparent', // Invisible line
      lineWidth: 0,
      priceScaleId: 'right',
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });

    console.log('✅ Signal marker series created');
    return signalMarkerSeries;
  } catch (error) {
    console.error('❌ Error creating signal marker series:', error);
    return null;
  }
}

function destroySignalMarkerSeries() {
  if (signalMarkerSeries) {
    try {
      chart.removeSeries(signalMarkerSeries);
      signalMarkerSeries = null;
      activeSignals.clear();
      console.log('✅ Signal marker series destroyed');
    } catch (e) {
      console.warn('Warning destroying signal marker series:', e);
    }
  }
}

// Dynamic MA series registry for multi-layer/duration combinations
function createMASeries(color, title) {
  return chart.addLineSeries({
    priceScaleId: 'left',
    color,
    lineWidth: 1.2, // Sleek, elegant line width
    title,
    lastValueVisible: true, // Show value on hover
    priceLineVisible: false,
    crosshairMarkerVisible: true, // Show crosshair marker for identification
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
    lastValueVisible: true, // Show value on hover
    priceLineVisible: false,
    crosshairMarkerVisible: true, // Show crosshair marker for identification
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
    lastValueVisible: true, // Show value on hover
    priceLineVisible: false,
    crosshairMarkerVisible: true, // Show crosshair marker for identification
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
    // Multiple indicators
    this.volumeIndicatorEnabled = false;
    this.indicator2Enabled = false;
    this.indicator3Enabled = false;
    
    // Trading tools
    this.horizontalLines = [];
    this.verticalLines = [];
    this.measureLines = [];
    this.activeTool = null;
    this.measureStart = null;
    this.yAxisControl = 'Right'; // Default to right axis for horizontal lines
    
    // Signal Indicator System
    this.skullIndicatorEnabled = false;
    this.goldXIndicatorEnabled = false;
    this.skullSignals = new Map(); // time -> signal data
    this.goldXSignals = new Map(); // time -> signal data
    this.signalsCalculated = false;
    this.signalSystemEnabled = false;
    
    // Skull Trigger System
    this.spreadThresholds = new Map(); // asset_exchange -> {top5Percent: value}
    this.slopeThresholds = new Map(); // asset_exchange -> {top5Percent: value}
    this.lastSkullTrigger = 0; // Timestamp of last skull trigger for cooloff
    this.cooloffPeriod = 60 * 60 * 1000; // 1 hour in milliseconds
    this.pendingSkullSignals = new Map(); // time -> {conditions: [], startTime}
    this.spreadHistory = []; // For slope calculation
    
    // Gold X Trigger System
    this.cumulativeAverages = new Map(); // asset_exchange -> {L50_avg: value}
    this.lastGoldXTrigger = 0; // Timestamp of last Gold X trigger for 30min cooldown
    
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
      chart.priceScale('right').applyOptions({ 
        autoScale: true
      });
      // Keep left axis manual but allow user scaling
      chart.priceScale('left').applyOptions({ 
        autoScale: false // Manual control, but scaling allowed
      });
      console.log('✅ Auto-scale applied: right=enabled, left=manual');
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
    
    // CRITICAL: Ensure data is properly sorted before processing
    const sortedData = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));
    
    // Always use 1-minute data for MAs, only aggregate prices
    const rawMinuteData = this.currentTimeframe === '1m' ? sortedData : this.rawData || sortedData;
    const aggregatedPriceData = this.aggregateData(sortedData, timeframeSeconds);

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

    // CRITICAL: Update indicators with processed data
    if (!isUpdate) {
      // Update volume chart (raw data)
      if (this.volumeIndicatorEnabled) {
        setTimeout(() => this.updateVolumeChart(rawMinuteData), 50);
      }
      
      // Update indicator 2 (timeframe-averaged data)
      if (this.indicator2Enabled) {
        setTimeout(() => this.updateIndicator2Chart(), 50);
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
        // CRITICAL FIX: Process full sorted dataset, not just new data
        this.processAndSetData(this.rawData, false);
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
    
    // CRITICAL: Clear signals when changing timeframes - they're timeframe-specific
    this.clearSignalsForTimeframeChange();
    
    // Update indicators after timeframe change
    if (this.indicator2Enabled) {
      setTimeout(() => this.updateIndicator2Chart(), 100);
    }
    
    // CRITICAL: Recalculate signals for new timeframe if indicators are enabled
    if (this.skullIndicatorEnabled || this.goldXIndicatorEnabled) {
      setTimeout(() => {
        console.log('🔄 Recalculating signals for new timeframe...');
        this.calculateAllSignals();
        this.updateSignalDisplay();
      }, 500);
    }
    
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
    console.log(`🔄 Volume Indicator: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    this.volumeIndicatorEnabled = enabled;
    
    if (enabled) {
      const success = createVolumeSeries();
      if (success) {
        volumeBidsSeries.applyOptions({ visible: true });
        volumeAsksSeries.applyOptions({ visible: true });
        
        if (this.rawData && this.rawData.length > 0) {
          this.processAndSetData(this.rawData, false);
        }
      }
    } else {
      if (volumeBidsSeries) volumeBidsSeries.applyOptions({ visible: false });
      if (volumeAsksSeries) volumeAsksSeries.applyOptions({ visible: false });
    }
    
    // CRITICAL: Recalculate layout for all indicators
    this.updateIndicatorLayout();
  }

  toggleIndicator2(enabled) {
    console.log(`🔄 Indicator 2 (Timeframe-Averaged Volume): ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    this.indicator2Enabled = enabled;
    
    if (enabled) {
      const success = createIndicator2Series();
      if (success) {
        indicator2BidsSeries.applyOptions({ visible: true });
        indicator2AsksSeries.applyOptions({ visible: true });
        
        if (this.rawData && this.rawData.length > 0) {
          this.updateIndicator2Chart();
        }
      }
    } else {
      if (indicator2BidsSeries) indicator2BidsSeries.applyOptions({ visible: false });
      if (indicator2AsksSeries) indicator2AsksSeries.applyOptions({ visible: false });
    }
    
    // CRITICAL: Recalculate layout for all indicators
    this.updateIndicatorLayout();
  }

  toggleIndicator3(enabled) {
    console.log(`🔄 Indicator 3: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    this.indicator3Enabled = enabled;
    
    if (enabled) {
      const success = createIndicator3Series();
      if (success) {
        indicator3Series.applyOptions({ visible: true });
      }
    } else {
      if (indicator3Series) indicator3Series.applyOptions({ visible: false });
    }
    
    // CRITICAL: Recalculate layout for all indicators
    this.updateIndicatorLayout();
  }

  // CRITICAL: Intelligent indicator layout management
  updateIndicatorLayout() {
    const activeIndicators = [];
    if (this.volumeIndicatorEnabled) activeIndicators.push('volume');
    if (this.indicator2Enabled) activeIndicators.push('indicator2');
    if (this.indicator3Enabled) activeIndicators.push('indicator3');
    
    const indicatorCount = activeIndicators.length;
    console.log(`📊 Layout update: ${indicatorCount} indicators active:`, activeIndicators);
    
    if (indicatorCount === 0) {
      // No indicators - main chart uses full space
      this.setMainChartMargins({ top: 0.02, bottom: 0.02 });
      this.hideAllIndicatorScales();
      
    } else if (indicatorCount === 1) {
      // 1 indicator - main chart 75%, indicator 25% at bottom
      this.setMainChartMargins({ top: 0.02, bottom: 0.27 });
      this.positionIndicators([
        { id: activeIndicators[0], top: 0.75, bottom: 0.02 }
      ]);
      
    } else if (indicatorCount === 2) {
      // 2 indicators - main chart 60%, indicators 20% each stacked
      this.setMainChartMargins({ top: 0.02, bottom: 0.42 });
      this.positionIndicators([
        { id: activeIndicators[0], top: 0.58, bottom: 0.22 },
        { id: activeIndicators[1], top: 0.78, bottom: 0.02 }
      ]);
      
    } else if (indicatorCount === 3) {
      // 3 indicators - main chart 50%, indicators ~16% each stacked
      this.setMainChartMargins({ top: 0.02, bottom: 0.52 });
      this.positionIndicators([
        { id: activeIndicators[0], top: 0.48, bottom: 0.35 },
        { id: activeIndicators[1], top: 0.65, bottom: 0.18 },
        { id: activeIndicators[2], top: 0.82, bottom: 0.02 }
      ]);
    }
    
    console.log(`✅ Layout updated for ${indicatorCount} indicators`);
  }

  // CRITICAL: Refresh all indicators after symbol/exchange switches
  refreshAllIndicators() {
    console.log('🔄 Refreshing all indicators after data switch');
    
    // Wait for data to be loaded, then refresh indicators
    setTimeout(() => {
      if (this.volumeIndicatorEnabled) {
        console.log('🔄 Refreshing Volume indicator');
        const success = createVolumeSeries();
        if (success) {
          volumeBidsSeries.applyOptions({ visible: true });
          volumeAsksSeries.applyOptions({ visible: true });
          this.updateVolumeChart(this.rawData);
        }
      }
      
      if (this.indicator2Enabled) {
        console.log('🔄 Refreshing Indicator 2');
        const success = createIndicator2Series();
        if (success) {
          indicator2BidsSeries.applyOptions({ visible: true });
          indicator2AsksSeries.applyOptions({ visible: true });
          this.updateIndicator2Chart();
        }
      }
      
      if (this.indicator3Enabled) {
        console.log('🔄 Refreshing Indicator 3');
        const success = createIndicator3Series();
        if (success) {
          indicator3Series.applyOptions({ visible: true });
          // Add data processing when Indicator 3 data is available
        }
      }
      
      // Recalculate layout for active indicators
      this.updateIndicatorLayout();
      
      console.log('✅ All indicators refreshed');
    
    // CRITICAL: Clear signals when switching asset/exchange
    this.clearSignalsForAssetSwitch();
    
    }, 500); // Wait for data to be processed
  }

  // Clear signals when switching assets or exchanges
  clearSignalsForAssetSwitch() {
    console.log(`🧹 Clearing signals for asset/exchange switch to ${this.currentSymbol}_${API_EXCHANGE}`);
    
    // Clear all signals - they're specific to the previous asset/exchange
    this.skullSignals.clear();
    this.goldXSignals.clear();
    this.signalsCalculated = false;
    
    // Reset cooloff for new asset/exchange
    this.lastSkullTrigger = 0;
    
    // Clear signal markers from chart
    if (priceSeries) {
      try {
        priceSeries.setMarkers([]);
        console.log('✅ Cleared signal markers from chart');
      } catch (e) {
        console.warn('Failed to clear signal markers:', e);
      }
    }
    
    // Update status
    const statusEl = document.getElementById('signal-status');
    if (statusEl) {
      statusEl.textContent = 'Toggle indicators to show historical signals';
    }
    
    console.log('✅ Signals cleared for new asset/exchange');
  }

  // Clear signals when changing timeframes
  clearSignalsForTimeframeChange() {
    console.log(`🧹 Clearing signals for timeframe change to ${this.currentTimeframe}`);
    
    // Clear all signals - they're specific to the previous timeframe
    this.skullSignals.clear();
    this.goldXSignals.clear();
    this.signalsCalculated = false;
    
    // Clear signal markers from chart
    if (priceSeries) {
      try {
        priceSeries.setMarkers([]);
        console.log('✅ Cleared signal markers for timeframe change');
      } catch (e) {
        console.warn('Failed to clear signal markers:', e);
      }
    }
    
    // Update status
    const statusEl = document.getElementById('signal-status');
    if (statusEl) {
      statusEl.textContent = 'Toggle indicators to show historical signals';
    }
    
    console.log('✅ Signals cleared for new timeframe');
  }

  // SKULL TRIGGER SYSTEM IMPLEMENTATION
  
  calculateSpreadThresholds() {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    console.log(`📊 Calculating SEPARATE spread thresholds for each layer - ${assetExchangeKey}`);
    
    if (!this.rawData || this.rawData.length < 100) {
      console.warn('⚠️ Insufficient data for threshold calculation');
      return;
    }
    
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    const layerThresholds = {};
    
    // Calculate separate thresholds for EACH layer
    for (const layer of layers) {
      const layerValues = [];
      
      // Collect values for THIS layer only
      for (const item of this.rawData) {
        const value = item[layer];
        if (value !== null && value !== undefined && isFinite(value)) {
          layerValues.push(value);
        }
      }
      
      if (layerValues.length === 0) {
        console.warn(`⚠️ No valid values for ${layer}`);
        continue;
      }
      
      // Sort to find top 15% for THIS layer (much more lenient to catch signals)
      layerValues.sort((a, b) => a - b);
      const top15Index = Math.floor(layerValues.length * 0.85);
      const threshold = layerValues[top15Index];
      
      layerThresholds[layer] = threshold;
      
      console.log(`📊 ${layer} threshold: ${threshold.toFixed(6)} (from ${layerValues.length} values, range: ${layerValues[0].toFixed(6)} - ${layerValues[layerValues.length-1].toFixed(6)})`);
    }
    
    this.spreadThresholds.set(assetExchangeKey, layerThresholds);
    console.log(`✅ Separate thresholds calculated for ${assetExchangeKey}:`, layerThresholds);
    
    // DEBUG: Show how many values would qualify with these thresholds
    for (const layer of layers) {
      const layerValues = [];
      for (const item of this.rawData) {
        const value = item[layer];
        if (value !== null && value !== undefined && isFinite(value)) {
          layerValues.push(value);
        }
      }
      if (layerValues.length > 0) {
        layerValues.sort((a, b) => a - b);
        const threshold = layerThresholds[layer];
        const qualifyingCount = layerValues.filter(v => v >= threshold).length;
        const percentage = (qualifyingCount / layerValues.length * 100).toFixed(1);
        console.log(`🔍 ${layer}: ${qualifyingCount}/${layerValues.length} values (${percentage}%) would qualify with threshold ${threshold.toFixed(6)}`);
      }
    }
  }

  calculateSlopeThresholds() {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    console.log(`📊 Calculating slope thresholds for ${assetExchangeKey}`);
    
    if (!this.rawData || this.rawData.length < 50) {
      console.warn('⚠️ Insufficient data for slope calculation');
      return;
    }
    
    const slopeValues = [];
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    
    // Calculate slopes for each layer
    for (const layer of layers) {
      const layerValues = this.rawData
        .map(item => ({ time: new Date(item.time).getTime(), value: item[layer] }))
        .filter(item => item.value !== null && isFinite(item.value))
        .sort((a, b) => a.time - b.time);
      
      // Calculate slope between consecutive points
      for (let i = 1; i < layerValues.length; i++) {
        const timeDiff = layerValues[i].time - layerValues[i-1].time;
        const valueDiff = layerValues[i].value - layerValues[i-1].value;
        
        if (timeDiff > 0) {
          const slope = Math.abs(valueDiff / timeDiff); // Absolute slope for acceleration
          slopeValues.push(slope);
        }
      }
    }
    
    if (slopeValues.length === 0) {
      console.warn('⚠️ No valid slope values calculated');
      return;
    }
    
    // Sort to find top 15% acceleration (much more lenient to catch signals)
    slopeValues.sort((a, b) => a - b);
    const top15PercentIndex = Math.floor(slopeValues.length * 0.85);
    const top15PercentSlope = slopeValues[top15PercentIndex];
    
    this.slopeThresholds.set(assetExchangeKey, {
      top5Percent: top15PercentSlope, // Keep same key name for compatibility
      totalSlopes: slopeValues.length,
      min: slopeValues[0],
      max: slopeValues[slopeValues.length - 1]
    });
    
    console.log(`📊 Slope thresholds for ${assetExchangeKey}:`, {
      top15Percent: top15PercentSlope.toExponential(3),
      totalSlopes: slopeValues.length
    });
  }

  // Check skull trigger conditions for current data
  checkSkullConditions(currentData) {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    const spreadThreshold = this.spreadThresholds.get(assetExchangeKey);
    const slopeThreshold = this.slopeThresholds.get(assetExchangeKey);
    
    if (!spreadThreshold || !slopeThreshold) {
      console.warn(`⚠️ Missing thresholds for ${assetExchangeKey}`);
      return false;
    }
    
    // Condition 1: Check if AT LEAST 2 of 3 spread layers are in their respective top 15%
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    let layersMet = 0;
    
    console.log(`🔍 Checking ≥2 of 3 layers in top 15%:`);
    
    for (const layer of layers) {
      const value = currentData[layer];
      const layerThreshold = spreadThreshold[layer];
      
      if (!layerThreshold) {
        console.warn(`⚠️ No threshold for ${layer}`);
        continue;
      }
      
      const layerConditionMet = value !== null && value >= layerThreshold;
      console.log(`🔍 ${layer}: ${value?.toFixed(6) || 'null'} >= ${layerThreshold.toFixed(6)} = ${layerConditionMet}`);
      
      if (layerConditionMet) {
        layersMet++;
      }
    }
    
    // Require majority (2 of 3) layers to be high relative to their own ranges
    const spreadConditionMet = layersMet >= 2;
    console.log(`📊 Spread condition: ${layersMet}/${layers.length} layers high (need ≥2) = ${spreadConditionMet}`);
    
    if (!spreadConditionMet) {
      return false;
    }
    
    // Condition 2: Check slope acceleration
    const currentSlope = this.calculateCurrentSlope(currentData);
    const slopeConditionMet = currentSlope >= slopeThreshold.top5Percent;
    
    console.log(`📊 Slope check: current=${currentSlope.toExponential(3)}, threshold=${slopeThreshold.top5Percent.toExponential(3)}, met=${slopeConditionMet}`);
    
    if (slopeConditionMet) {
      console.log(`📊 Slope condition MET: ${currentSlope.toExponential(3)} >= ${slopeThreshold.top5Percent.toExponential(3)}`);
    }
    
    // BOTH conditions must be true
    const bothConditionsMet = spreadConditionMet && slopeConditionMet;
    
    console.log(`📊 Skull conditions: Spread=${spreadConditionMet}, Slope=${slopeConditionMet}, Both=${bothConditionsMet}`);
    
    return bothConditionsMet;
  }

  // Version with data index for proper backtesting slope calculation
  checkSkullConditionsWithIndex(currentData, dataIndex) {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    const spreadThreshold = this.spreadThresholds.get(assetExchangeKey);
    const slopeThreshold = this.slopeThresholds.get(assetExchangeKey);
    
    if (!spreadThreshold || !slopeThreshold) return false;
    
    // Condition 1: Check if AT LEAST 2 of 3 spread layers are in their respective top 15%
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    let layersMet = 0;
    
    for (const layer of layers) {
      const value = currentData[layer];
      const layerThreshold = spreadThreshold[layer];
      
      if (!layerThreshold) continue;
      
      const layerConditionMet = value !== null && value >= layerThreshold;
      if (layerConditionMet) {
        layersMet++;
      }
    }
    
    // Require majority (2 of 3) layers
    const spreadConditionMet = layersMet >= 2;
    if (!spreadConditionMet) return false;
    
    // Condition 2: Slope check with proper index
    const currentSlope = this.calculateCurrentSlope(currentData, dataIndex);
    const slopeConditionMet = currentSlope >= slopeThreshold.top5Percent;
    
    // BOTH conditions must be true
    return spreadConditionMet && slopeConditionMet;
  }

  calculateCurrentSlope(currentData, dataIndex = null) {
    // For backtesting, use the data index to get proper slope calculation
    if (dataIndex !== null && this.rawData) {
      // Use surrounding data points for slope calculation
      const startIndex = Math.max(0, dataIndex - 5);
      const endIndex = Math.min(this.rawData.length - 1, dataIndex + 1);
      
      if (endIndex - startIndex < 2) return 0;
      
      const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
      let maxSlope = 0;
      
      // Calculate slope for each layer
      for (const layer of layers) {
        const values = this.rawData.slice(startIndex, endIndex + 1)
          .map(item => ({ 
            time: new Date(item.time).getTime(), 
            value: item[layer] 
          }))
          .filter(item => item.value !== null && isFinite(item.value));
        
        if (values.length < 2) continue;
        
        // Calculate slope between consecutive points
        for (let i = 1; i < values.length; i++) {
          const timeDiff = values[i].time - values[i-1].time;
          const valueDiff = values[i].value - values[i-1].value;
          
          if (timeDiff > 0) {
            const slope = Math.abs(valueDiff / timeDiff);
            maxSlope = Math.max(maxSlope, slope);
          }
        }
      }
      
      return maxSlope;
    }
    
    // For real-time, compute per-layer slope vs previous minute and take max
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    if (!this.rawData || this.rawData.length < 2) return 0;
    
    // Find current index by timestamp match
    let idx = this.rawData.length - 1;
    for (let i = this.rawData.length - 1; i >= 0; i--) {
      if (this.rawData[i].time === currentData.time) { idx = i; break; }
    }
    if (idx <= 0) return 0;
    
    const current = this.rawData[idx];
    const previous = this.rawData[idx - 1];
    const tDiff = new Date(current.time).getTime() - new Date(previous.time).getTime();
    if (tDiff <= 0) return 0;
    
    let maxSlope = 0;
    for (const layer of layers) {
      const cv = current[layer];
      const pv = previous[layer];
      if (cv !== null && pv !== null && isFinite(cv) && isFinite(pv)) {
        const slope = Math.abs((cv - pv) / tDiff);
        if (slope > maxSlope) maxSlope = slope;
      }
    }
    return maxSlope;
  }

  // Check cooloff period
  isInCooloff() {
    const now = Date.now();
    const timeSinceLastSkull = now - this.lastSkullTrigger;
    return timeSinceLastSkull < this.cooloffPeriod;
  }

  // Main skull trigger evaluation
  evaluateSkullTrigger(currentData) {
    if (!this.signalSystemEnabled) return;
    
    // Check cooloff period
    if (this.isInCooloff()) {
      const remaining = Math.ceil((this.cooloffPeriod - (Date.now() - this.lastSkullTrigger)) / (60 * 1000));
      console.log(`⏳ Skull cooloff: ${remaining} minutes remaining`);
      return;
    }
    
    // Check both conditions
    const conditionsMet = this.checkSkullConditions(currentData);
    
    if (conditionsMet) {
      console.log('💀 SKULL TRIGGER CONDITIONS MET!');
      this.triggerSignal('skull', true);
      this.lastSkullTrigger = Date.now();
    }
  }

  // Calculate all skull signals for current asset/exchange
  calculateSkullSignals() {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    console.log(`💀 Calculating skull signals for ${assetExchangeKey} (${this.currentTimeframe})...`);
    
    if (!this.rawData || this.rawData.length === 0) {
      console.warn('⚠️ No data available for skull calculation');
      return;
    }
    
    // Clear existing skull signals for this asset/exchange
    this.skullSignals.clear();
    
    // Calculate thresholds first
    this.calculateSpreadThresholds();
    this.calculateSlopeThresholds();
    
    // Group data by candle timeframe for duration-based checking
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    const candleBuckets = new Map();
    
    // Group raw data into candle buckets based on current timeframe
    for (const item of this.rawData) {
      const timestamp = this.toUnixTimestamp(item.time);
      const candleTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!candleBuckets.has(candleTime)) {
        candleBuckets.set(candleTime, []);
      }
      candleBuckets.get(candleTime).push(item);
    }
    
    console.log(`📊 Grouped data into ${candleBuckets.size} ${this.currentTimeframe} candles`);
    
    let skullCount = 0;
    let lastSkullTime = 0;
    
    // Check each candle for sustained conditions
    for (const [candleTime, candleData] of candleBuckets) {
      // Check cooloff (1 hour = 3600 seconds)
      if (candleTime - lastSkullTime < 3600) continue;
      
      // Check if conditions are met for ENTIRE candle duration
      if (this.checkCandleDurationConditions(candleData, candleTime)) {
        // Add skull signal for this candle
        const candlePrice = candleData[candleData.length - 1]?.price || 50000;
        
        this.skullSignals.set(candleTime, {
          type: 'skull',
          price: candlePrice * 1.02,
          active: true,
          asset: this.currentSymbol,
          exchange: API_EXCHANGE,
          timeframe: this.currentTimeframe,
          duration: `${candleData.length} minutes`
        });
        
        skullCount++;
        lastSkullTime = candleTime;
        console.log(`💀 Skull candle found at ${new Date(candleTime * 1000).toISOString()} (${candleData.length} data points)`);
      }
    }
    
    console.log(`✅ Skull calculation complete: Found ${skullCount} skull candles for ${this.currentTimeframe}`);
    console.log(`📊 Total skull signals: ${this.skullSignals.size}`);
    
    // DEBUG: Show why we might have 0 signals
    if (skullCount === 0) {
      console.log('🔍 DEBUG: No skull signals found. Checking first few candles...');
      let debugCount = 0;
      for (const [candleTime, candleData] of candleBuckets) {
        if (debugCount >= 3) break; // Only check first 3 candles
        console.log(`🔍 Candle ${debugCount + 1}: ${new Date(candleTime * 1000).toISOString()} with ${candleData.length} data points`);
        const conditionsMet = this.checkCandleDurationConditions(candleData, candleTime);
        console.log(`🔍 Candle ${debugCount + 1} conditions met: ${conditionsMet}`);
        debugCount++;
      }
    }
  }

  // GOLD X TRIGGER SYSTEM IMPLEMENTATION
  
  calculateGoldXThresholds() {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    console.log(`📊 Calculating Gold X cumulative average for ${assetExchangeKey}`);
    
    if (!this.rawData || this.rawData.length < 50) {
      console.warn('⚠️ Insufficient data for Gold X calculation');
      return;
    }
    
    // DEBUG: Check data source URL
    const todayUrl = buildDailyUrl(this.currentSymbol, getDateStringWithOffset(0));
    console.log(`🔍 Data source URL: ${todayUrl}`);
    
    // Calculate L50 cumulative average
    const l50Values = [];
    for (const item of this.rawData) {
      const value = item.spread_L50_pct_avg;
      if (value !== null && value !== undefined && isFinite(value)) {
        l50Values.push(value);
      }
    }
    
    if (l50Values.length === 0) {
      console.warn('⚠️ No valid L50 spread values found');
      return;
    }
    
    const l50CumulativeAvg = l50Values.reduce((sum, val) => sum + val, 0) / l50Values.length;
    
    this.cumulativeAverages.set(assetExchangeKey, {
      L50_avg: l50CumulativeAvg
    });
    
    console.log(`📊 Gold X cumulative average for ${assetExchangeKey}: ${l50CumulativeAvg.toFixed(6)} (from ${l50Values.length} values)`);
  }

  // EXACT SPECIFICATIONS - Check Gold X trigger conditions
  checkGoldXConditions(currentData, dataIndex) {
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    const cumulativeAvg = this.cumulativeAverages.get(assetExchangeKey);
    
    if (!cumulativeAvg) {
      console.warn(`⚠️ Missing Gold X cumulative average for ${assetExchangeKey}`);
      return false;
    }
    
    // Condition 1: Price drops 1.75% or more within 2 hours
    const priceDrop2HourMet = this.checkPriceDrop2Hour(currentData, dataIndex, 1.75);
    
    // Condition 2: 20, 50, and 100 MA for L50 are ALL < cumulative average
    const maConditionMet = this.checkL50MAsBelowAverage(currentData, cumulativeAvg.L50_avg);
    
    console.log(`📊 Gold X conditions: PriceDrop2H=${priceDrop2HourMet}, MAsBelow=${maConditionMet}`);
    
    return priceDrop2HourMet && maConditionMet;
  }

  // Check for price drop >= 1.75% within 2 hours
  checkPriceDrop2Hour(currentData, dataIndex, dropThreshold) {
    if (!this.rawData || dataIndex < 120) return false; // Need 2 hours of data (120 minutes)
    
    const currentPrice = currentData.price;
    if (!currentPrice) return false;
    
    // Look back through 2-hour window to find highest price
    let maxPriceIn2Hours = currentPrice;
    
    for (let i = 0; i < 120 && (dataIndex - i) >= 0; i++) {
      const pastData = this.rawData[dataIndex - i];
      if (pastData && pastData.price) {
        maxPriceIn2Hours = Math.max(maxPriceIn2Hours, pastData.price);
      }
    }
    
    // Calculate drop from highest price in 2-hour window to current
    const drop2Hour = ((currentPrice - maxPriceIn2Hours) / maxPriceIn2Hours) * 100;
    const dropMet = drop2Hour <= -dropThreshold; // More negative = bigger drop
    
    console.log(`📊 2-hour drop check: max=${maxPriceIn2Hours.toFixed(2)}, current=${currentPrice.toFixed(2)}, drop=${drop2Hour.toFixed(2)}% (need ≤-${dropThreshold}%) = ${dropMet}`);
    
    return dropMet;
  }

  // Check if 20, 50, and 100 MA for L50 are ALL below cumulative average
  checkL50MAsBelowAverage(currentData, cumulativeAvg) {
    // Calculate 20, 50, 100 period MAs for L50 spread
    const ma20 = this.calculateMA(currentData, 'spread_L50_pct_avg', 20);
    const ma50 = this.calculateMA(currentData, 'spread_L50_pct_avg', 50);  
    const ma100 = this.calculateMA(currentData, 'spread_L50_pct_avg', 100);
    
    if (ma20 === null || ma50 === null || ma100 === null) {
      console.log(`📊 MA calculation failed: ma20=${ma20}, ma50=${ma50}, ma100=${ma100}`);
      return false;
    }
    
    const ma20BelowAvg = ma20 < cumulativeAvg;
    const ma50BelowAvg = ma50 < cumulativeAvg;
    const ma100BelowAvg = ma100 < cumulativeAvg;
    
    const allMAsBelowAvg = ma20BelowAvg && ma50BelowAvg && ma100BelowAvg;
    
    console.log(`📊 L50 MAs vs cumulative avg (${cumulativeAvg.toFixed(6)}):`);
    console.log(`📊 MA20: ${ma20.toFixed(6)} < avg = ${ma20BelowAvg}`);
    console.log(`📊 MA50: ${ma50.toFixed(6)} < avg = ${ma50BelowAvg}`);
    console.log(`📊 MA100: ${ma100.toFixed(6)} < avg = ${ma100BelowAvg}`);
    console.log(`📊 All MAs below avg: ${allMAsBelowAvg}`);
    
    return allMAsBelowAvg;
  }

  // Calculate moving average for a specific field and period
  calculateMA(currentData, fieldName, period) {
    if (!this.rawData || this.rawData.length < period) return null;
    
    // Find current data index
    let currentIndex = -1;
    for (let i = this.rawData.length - 1; i >= 0; i--) {
      if (this.rawData[i].time === currentData.time) {
        currentIndex = i;
        break;
      }
    }
    
    if (currentIndex === -1 || currentIndex < period - 1) return null;
    
    // Calculate MA from current index backwards
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < period; i++) {
      const dataPoint = this.rawData[currentIndex - i];
      const value = dataPoint[fieldName];
      if (value !== null && value !== undefined && isFinite(value)) {
        sum += value;
        count++;
      }
    }
    
    return count > 0 ? sum / count : null;
  }

  checkPriceDrop3Hour(currentData, dataIndex, dropThreshold = 0.8) {
    if (!this.rawData || dataIndex < 180) return false; // Need 3 hours of data (180 minutes)
    
    const currentPrice = currentData.price;
    const threeHoursAgo = this.rawData[dataIndex - 180];
    
    if (!threeHoursAgo || !currentPrice) return false;
    
    const priceChange = ((currentPrice - threeHoursAgo.price) / threeHoursAgo.price) * 100;
    const dropMet = priceChange <= -dropThreshold; // Configurable drop threshold
    
    console.log(`📊 3h price check: ${threeHoursAgo.price.toFixed(2)} → ${currentPrice.toFixed(2)} = ${priceChange.toFixed(2)}% (drop >= ${dropThreshold}% = ${dropMet})`);
    
    return dropMet;
  }

  checkL50MAChange3Hour(currentData, dataIndex, changeThreshold) {
    if (!this.rawData || dataIndex < 180) return false;
    
    const currentL50 = currentData.spread_L50_pct_avg;
    const threeHoursAgoL50 = this.rawData[dataIndex - 180].spread_L50_pct_avg;
    
    if (!currentL50 || !threeHoursAgoL50) return false;
    
    const timeDiff = 3 * 60 * 60 * 1000; // 3 hours in ms
    const valueDiff = Math.abs(currentL50 - threeHoursAgoL50);
    const changeRate = valueDiff / timeDiff;
    
    const changeMet = changeRate >= changeThreshold;
    
    console.log(`📊 L50 MA change: ${threeHoursAgoL50.toFixed(6)} → ${currentL50.toFixed(6)}, rate=${changeRate.toExponential(3)}, threshold=${changeThreshold.toExponential(3)}, met=${changeMet}`);
    
    return changeMet;
  }

  // EXACT SPECIFICATIONS - Calculate Gold X signals with proper logic
  calculateGoldXSignals() {
    this.goldXSignals.clear();
    this.calculateGoldXThresholds();
    
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    const candleBuckets = new Map();
    
    for (const item of this.rawData) {
      const timestamp = this.toUnixTimestamp(item.time);
      const candleTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!candleBuckets.has(candleTime)) {
        candleBuckets.set(candleTime, []);
      }
      candleBuckets.get(candleTime).push(item);
    }
    
    let goldXCount = 0;
    let qualifyingCandles = 0;
    let checkedCandles = 0;
    
    // Process candles
    for (const [candleTime, candleData] of candleBuckets) {
      if (candleData.length === 0) continue;
      checkedCandles++;
      
      if (this.checkGoldXCandleConditions(candleData, candleTime)) {
        qualifyingCandles++;
        this.goldXSignals.set(candleTime, {
          type: 'goldX',
          price: candleData[candleData.length - 1]?.price * 1.02,
          active: true,
          asset: this.currentSymbol,
          exchange: API_EXCHANGE,
          timeframe: this.currentTimeframe
        });
        goldXCount++;
      }
    }
    
    console.log(`✖️ GOLD X ${this.currentTimeframe}: ${goldXCount} signals from ${checkedCandles} candles (${qualifyingCandles} qualified)`);
  }

  // Check if Gold X conditions are met for entire candlestick
  checkGoldXCandleConditions(candleData, candleTime) {
    if (!candleData || candleData.length === 0) return false;
    
    const cumulativeAvg = this.cumulativeAverages.get(`${this.currentSymbol}_${API_EXCHANGE}`);
    if (!cumulativeAvg) return false;
    
    let conditionsMetCount = 0;
    
    // Check each minute within the candle
    for (let i = 0; i < candleData.length; i++) {
      const minuteData = candleData[i];
      
      // Find data index for this minute
      let dataIndex = -1;
      for (let j = 0; j < this.rawData.length; j++) {
        if (this.rawData[j].time === minuteData.time) {
          dataIndex = j;
          break;
        }
      }
      
      if (dataIndex === -1 || dataIndex < 120) continue;
      
      // Check both conditions
      if (this.checkGoldXConditions(minuteData, dataIndex)) {
        conditionsMetCount++;
      }
    }
    
    // Require conditions for majority of candle
    const requiredMinutes = Math.ceil(candleData.length * 0.5);
    const conditionsMet = conditionsMetCount >= requiredMinutes;
    
    return conditionsMet;
  }

  // Check if skull conditions are sustained throughout entire candle
  checkCandleDurationConditions(candleData, candleTime) {
    if (!candleData || candleData.length === 0) return false;
    
    console.log(`🔍 Checking candle at ${new Date(candleTime * 1000).toISOString()} with ${candleData.length} data points`);
    
    const assetExchangeKey = `${this.currentSymbol}_${API_EXCHANGE}`;
    const spreadThreshold = this.spreadThresholds.get(assetExchangeKey);
    const slopeThreshold = this.slopeThresholds.get(assetExchangeKey);
    
    console.log(`🔍 Skull thresholds for ${assetExchangeKey}:`);
    console.log(`  - spreadThreshold:`, spreadThreshold);
    console.log(`  - slopeThreshold:`, slopeThreshold);
    
    if (!spreadThreshold || !slopeThreshold) {
      console.log(`❌ Missing thresholds - spreadThreshold: ${!!spreadThreshold}, slopeThreshold: ${!!slopeThreshold}`);
      return false;
    }
    
    let sustainedSpreadCount = 0;
    let sustainedSlopeCount = 0;
    
    // Check each minute within the candle
    for (let i = 0; i < candleData.length; i++) {
      const minuteData = candleData[i];
      
      // Check if AT LEAST 2 of 3 spread layers are in their top 15% for this minute
      const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
      let layersMetThisMinute = 0;
      
      for (const layer of layers) {
        const value = minuteData[layer];
        const layerThreshold = spreadThreshold[layer];
        
        if (layerThreshold && value !== null && value >= layerThreshold) {
          layersMetThisMinute++;
        }
      }
      
      // Require majority (2 of 3)
      if (layersMetThisMinute >= 2) {
        sustainedSpreadCount++;
      }
      
      // Check slope condition for this minute (if enough data)
      if (i > 0) {
        const currentSlope = this.calculateSlopeForMinute(candleData, i);
        if (currentSlope >= slopeThreshold.top5Percent) {
          sustainedSlopeCount++;
        }
      }
    }
    
    // Require conditions to be sustained for majority of candle (>70%)
    const requiredSustainedMinutes = Math.ceil(candleData.length * 0.7);
    const spreadSustained = sustainedSpreadCount >= requiredSustainedMinutes;
    const slopeSustained = sustainedSlopeCount >= requiredSustainedMinutes;
    
    const bothSustained = spreadSustained && slopeSustained;
    
    console.log(`📊 Candle conditions: Spread sustained ${sustainedSpreadCount}/${candleData.length} (${spreadSustained}), Slope sustained ${sustainedSlopeCount}/${candleData.length} (${slopeSustained}), Both=${bothSustained}`);
    
    // DEBUG: If skull triggered, show detailed breakdown
    if (bothSustained) {
      console.log(`🔍 SKULL TRIGGERED - Detailed breakdown:`);
      console.log(`🔍 Spread Thresholds:`, spreadThreshold);
      console.log(`🔍 Slope Threshold:`, slopeThreshold?.top5Percent?.toFixed(6) || 'undefined');
      console.log(`🔍 Candle spread values:`);
      
      candleData.forEach((minuteData, idx) => {
        const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
        const spreadValues = layers.map(layer => minuteData[layer]?.toFixed(6) || 'null');
        const maxSpread = Math.max(...layers.map(layer => minuteData[layer] || 0));
        // Check if all layers meet their individual thresholds
        const layersMet = layers.filter(layer => {
          const value = minuteData[layer];
          const layerThreshold = spreadThreshold[layer];
          return value !== null && layerThreshold && value >= layerThreshold;
        }).length;
        const meetsThreshold = layersMet === layers.length;
        
        console.log(`🔍 Minute ${idx}: [${spreadValues.join(', ')}] max=${maxSpread.toFixed(6)} >= threshold=${meetsThreshold}`);
      });
    }
    
    return bothSustained;
  }

  calculateSlopeForMinute(candleData, minuteIndex) {
    if (minuteIndex < 1) return 0;
    
    const current = candleData[minuteIndex];
    const previous = candleData[minuteIndex - 1];
    
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    let maxSlope = 0;
    
    for (const layer of layers) {
      const currentVal = current[layer];
      const previousVal = previous[layer];
      
      if (currentVal !== null && previousVal !== null && isFinite(currentVal) && isFinite(previousVal)) {
        const timeDiff = new Date(current.time).getTime() - new Date(previous.time).getTime();
        const valueDiff = currentVal - previousVal;
        
        if (timeDiff > 0) {
          const slope = Math.abs(valueDiff / timeDiff);
          maxSlope = Math.max(maxSlope, slope);
        }
      }
    }
    
    return maxSlope;
  }

  // TRADING TOOLS
  setActiveTool(tool) {
    this.activeTool = tool;
    // Update button visual states
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    if (tool) {
      const btnId = `btn-${tool.replace('_', '-')}`;
      document.getElementById(btnId)?.classList.add('active');
    }
  }

  addHorizontalLine(price) {
    let line;
    
    if (this.yAxisControl === 'Left') {
      // Create a dedicated series for left axis horizontal lines
      const leftLineSeries = chart.addLineSeries({
        color: 'transparent', // Invisible line series, just for price lines
        lineWidth: 0,
        priceScaleId: 'left',
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
        visible: false, // Invisible series
      });
      
      // Add empty data to the series
      leftLineSeries.setData([]);
      
      // Create price line on this left-axis series
      line = leftLineSeries.createPriceLine({
        price: price,
        color: '#FFFFFF', // White horizontal line
        lineWidth: 1.5,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: `L: ${price.toFixed(6)}`, // L for Left axis
      });
      
      // Store both the line and the series for cleanup
      this.horizontalLines.push({ line, price, axis: this.yAxisControl, series: leftLineSeries });
      console.log(`✅ Added horizontal line to LEFT axis at ${price.toFixed(6)}`);
      return line;
    } else {
      // Add line to right axis (price axis)
      line = priceSeries.createPriceLine({
        price: price,
        color: '#FFFFFF', // White horizontal line
        lineWidth: 1.5,
        lineStyle: LightweightCharts.LineStyle.Solid,
        axisLabelVisible: true,
        title: `R: ${price.toFixed(3)}`, // R for Right axis
      });
      console.log(`✅ Added horizontal line to RIGHT axis at ${price.toFixed(3)}`);
    }
    
    this.horizontalLines.push({ line, price, axis: this.yAxisControl });
    return line;
  }

  addVerticalLine(time) {
    try {
      // Use a dedicated invisible price scale that won't affect main chart
      const vLineSeries = chart.addLineSeries({
        color: '#FFFFFF',
        lineWidth: 2,
        lineStyle: LightweightCharts.LineStyle.Solid, // Solid white line
        priceScaleId: 'vline', // Separate price scale
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      
      // Configure invisible price scale for vertical lines
      chart.priceScale('vline').applyOptions({
        visible: false,
        autoScale: false,
        scaleMargins: { top: 0, bottom: 0 },
      });
      
      // Simple line data - just 2 points at same time
      vLineSeries.setData([
        { time, value: 1 },
        { time, value: 2 }
      ]);
      
      this.verticalLines.push({ series: vLineSeries, time });
      console.log(`✅ Added vertical line with invisible scale`);
      return vLineSeries;
    } catch (e) {
      console.error('Failed to create vertical line:', e);
      return null;
    }
  }

  startMeasuring(startPrice, startTime) {
    this.measureStart = { price: startPrice, time: startTime };
    console.log(`📏 Measurement started - click end point`);
  }

  completeMeasuring(endPrice, endTime) {
    if (!this.measureStart) return;
    
    const priceDiff = endPrice - this.measureStart.price;
    const timeDiff = endTime - this.measureStart.time;
    const pricePercent = ((priceDiff / this.measureStart.price) * 100);
    const bars = Math.abs(Math.floor(timeDiff / 60)); // Convert to minutes/bars
    
    // Show measurement result clearly
    const result = `MEASUREMENT RESULT:\n` +
                  `Price Change: ${priceDiff.toFixed(4)}\n` +
                  `Percentage: ${pricePercent.toFixed(2)}%\n` +
                  `Time: ${bars} bars (${Math.floor(bars/60)}h ${bars%60}m)\n` +
                  `From: ${this.measureStart.price.toFixed(4)}\n` +
                  `To: ${endPrice.toFixed(4)}`;
    
    console.log(result);
    alert(result);
    
    this.measureStart = null;
    this.setActiveTool(null);
  }


  clearAllLines() {
    console.log(`🗑️ Clearing ${this.horizontalLines.length} horizontal and ${this.verticalLines.length} vertical lines`);
    
    // Clear horizontal lines (from both axes)
    this.horizontalLines.forEach(({ line, axis, series }) => {
      try { 
        if (axis === 'Left' && series) {
          // Remove price line and the invisible series
          series.removePriceLine(line);
          chart.removeSeries(series);
        } else {
          // Remove from right axis (price series)
          priceSeries.removePriceLine(line);
        }
        console.log(`✅ Removed horizontal line from ${axis} axis`);
      } catch (e) {
        console.warn('Failed to remove horizontal line:', e);
      }
    });
    this.horizontalLines = [];
    
    // Clear vertical lines (chart series)
    this.verticalLines.forEach(({ series }) => {
      try { 
        chart.removeSeries(series);
        console.log('✅ Removed vertical line');
      } catch (e) {
        console.warn('Failed to remove vertical line:', e);
      }
    });
    this.verticalLines = [];
    
    // Clear measurement rectangles
    this.measureLines.forEach(({ series }) => {
      try { 
        chart.removeSeries(series); 
        console.log('✅ Removed measurement rectangle');
      } catch (e) {
        console.warn('Failed to remove measurement rectangle:', e);
      }
    });
    this.measureLines = [];
    
    console.log('✅ All lines cleared successfully');
  }

  setupTradingTools() {
    // Button event listeners
    document.getElementById('btn-horizontal-line')?.addEventListener('click', () => {
      this.setActiveTool(this.activeTool === 'horizontal' ? null : 'horizontal');
    });
    
    document.getElementById('btn-vertical-line')?.addEventListener('click', () => {
      this.setActiveTool(this.activeTool === 'vertical' ? null : 'vertical');
    });
    
    document.getElementById('btn-measure')?.addEventListener('click', () => {
      this.setActiveTool(this.activeTool === 'measure' ? null : 'measure');
    });
    
    document.getElementById('btn-clear-lines')?.addEventListener('click', () => {
      this.clearAllLines();
    });
    
    // Signal system buttons
    document.getElementById('btn-backtest-skulls')?.addEventListener('click', () => {
      if (this.signalSystemEnabled) {
        console.log(`🔍 Starting backtest with ${this.rawData?.length || 0} data points`);
        
        // Debug: Check data structure
        if (this.rawData && this.rawData.length > 0) {
          console.log('🔍 Sample data point:', this.rawData[0]);
          console.log('🔍 Sample spread values:', {
            L5: this.rawData[0].spread_L5_pct_avg,
            L50: this.rawData[0].spread_L50_pct_avg,
            L100: this.rawData[0].spread_L100_pct_avg
          });
        }
        
        this.backtestSkullSignals();
        console.log('🔄 Skull backtesting initiated');
      } else {
        console.warn('⚠️ Enable signal system first');
      }
    });
    
    document.getElementById('btn-backtest-goldx')?.addEventListener('click', () => {
      if (this.signalSystemEnabled) {
        this.backtestGoldXSignals();
        console.log('🔄 Gold X backtesting initiated');
      } else {
        console.warn('⚠️ Enable signal system first');
      }
    });
    
    // Calculate all signals button
    document.getElementById('btn-calculate-signals')?.addEventListener('click', () => {
      this.calculateAllSignals();
      console.log('🔄 Manual signal calculation triggered');
      
      // Update display if any indicators are enabled
      if (this.skullIndicatorEnabled || this.goldXIndicatorEnabled) {
        this.updateSignalDisplay();
      }
    });
    
    // Chart click handling
    chart.subscribeClick((param) => {
      if (!param?.point || !this.activeTool) return;
      
      const price = priceSeries.coordinateToPrice(param.point.y);
      const time = param.time;
      
      if (price === null || time === null) return;
      
      if (this.activeTool === 'horizontal') {
        this.addHorizontalLine(price);
        this.setActiveTool(null);
      } else if (this.activeTool === 'vertical') {
        this.addVerticalLine(time);
        this.setActiveTool(null);
      } else if (this.activeTool === 'measure') {
        if (!this.measureStart) {
          this.startMeasuring(price, time);
        } else {
          this.completeMeasuring(price, time);
        }
      }
    });
  }

  // SIGNAL INDICATOR SYSTEM
  
  toggleSkullIndicator(enabled) {
    this.skullIndicatorEnabled = enabled;
    console.log(`💀 Skull indicator ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      // Calculate signals if not already done
      if (!this.signalsCalculated) {
        this.calculateAllSignals();
      }
      // Create signal series if needed
      createSignalMarkerSeries();
    }
    // Enable the signal system when any signal indicator is on
    this.signalSystemEnabled = this.skullIndicatorEnabled || this.goldXIndicatorEnabled;
    
    // Update display
    this.updateSignalDisplay();
  }
  
  toggleGoldXIndicator(enabled) {
    this.goldXIndicatorEnabled = enabled;
    console.log(`✖️ Gold X indicator ${enabled ? 'enabled' : 'disabled'}`);
    
    if (enabled) {
      // Calculate signals if not already done
      if (!this.signalsCalculated) {
        this.calculateAllSignals();
      }
      // Create signal series if needed
      createSignalMarkerSeries();
    }
    // Enable the signal system when any signal indicator is on
    this.signalSystemEnabled = this.skullIndicatorEnabled || this.goldXIndicatorEnabled;
    
    // Update display
    this.updateSignalDisplay();
  }
  
  calculateAllSignals() {
    console.log(`🔄 CALCULATING SIGNALS: ${this.currentSymbol}_${API_EXCHANGE} on ${this.currentTimeframe} (${this.rawData?.length || 0} points)`);
    
    if (!this.rawData || this.rawData.length < 50) {
      console.warn(`⚠️ Insufficient data: ${this.rawData?.length || 0} points`);
      return;
    }
    
    // Use simple, clean trigger system
    this.calculateSimpleSignals();
    this.signalsCalculated = true;
  }

  // =============================================================================
  // CLEAN SLATE - TIME-BASED SIGNAL CALCULATION
  // =============================================================================
  calculateSimpleSignals() {
    console.log(`🔄 Calculating time-based signals for ${this.currentSymbol}_${API_EXCHANGE} on ${this.currentTimeframe}`);
    
    // Clear existing signals
    this.skullSignals.clear();
    this.goldXSignals.clear();
    
    // Group data into candles
    const candleBuckets = this.groupDataIntoCandleBuckets();
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    
    let skullCount = 0;
    let goldXCount = 0;
    
    // Check each candle for time-based triggers
    for (const [candleTime, candleData] of candleBuckets) {
      
      // Check skull trigger (9:30 AM EST) - pass timeframe seconds
      if (checkSkullTrigger(candleTime, timeframeSeconds)) {
        const price = candleData[candleData.length - 1]?.price || 50000;
        this.skullSignals.set(candleTime, {
          type: 'skull',
          price: price * 1.02,
          active: true,
          timeframe: this.currentTimeframe,
          triggerReason: '9:30 AM EST'
        });
        skullCount++;
      }
      
      // Check Gold X trigger (8:00 PM EST) - pass timeframe seconds
      if (checkGoldXTrigger(candleTime, timeframeSeconds)) {
        const price = candleData[candleData.length - 1]?.price || 50000;
        this.goldXSignals.set(candleTime, {
          type: 'goldx',
          price: price * 1.02,
          active: true,
          timeframe: this.currentTimeframe,
          triggerReason: '8:00 PM EST'
        });
        goldXCount++;
      }
    }
    
    console.log(`✅ Time-based signals: ${skullCount} skulls (9:30 AM), ${goldXCount} gold X (8:00 PM)`);
    console.log(`📊 DEBUG: Total candles processed: ${candleBuckets.size}`);
    console.log(`📊 DEBUG: Skull signals stored: ${this.skullSignals.size}`);
    console.log(`📊 DEBUG: Gold X signals stored: ${this.goldXSignals.size}`);
  }

  // Simple data grouping
  groupDataIntoCandleBuckets() {
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    const candleBuckets = new Map();
    
    for (const item of this.rawData) {
      const timestamp = this.toUnixTimestamp(item.time);
      const candleTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!candleBuckets.has(candleTime)) {
        candleBuckets.set(candleTime, []);
      }
      candleBuckets.get(candleTime).push(item);
    }
    
    return candleBuckets;
  }

  // External trigger function - call this when your condition is met
  triggerSignal(signalType = 'skull', active = true) {
    console.log(`🔍 triggerSignal called: type=${signalType}, active=${active}`);
    console.log(`🔍 signalSystemEnabled: ${this.signalSystemEnabled}`);
    console.log(`🔍 signalMarkerSeries exists: ${!!signalMarkerSeries}`);
    
    if (!this.signalSystemEnabled) {
      console.error('❌ Signal system not enabled');
      return;
    }
    
    if (!signalMarkerSeries) {
      console.error('❌ Signal marker series not available');
      return;
    }
    
    // Get current candle time
    const currentTime = this.getCurrentCandleTime();
    console.log(`🔍 Current candle time: ${currentTime} (${new Date(currentTime * 1000).toISOString()})`);
    
    if (!currentTime) {
      console.error('❌ No current candle time available');
      return;
    }
    
    console.log(`📍 Signal trigger: ${signalType} ${active ? 'ACTIVE' : 'INACTIVE'} at ${new Date(currentTime * 1000).toISOString()}`);
    
    if (active) {
      // Get current price for marker positioning
      const currentPrice = this.getCurrentPrice();
      console.log(`🔍 Current price: ${currentPrice}`);
      
      if (!currentPrice) {
        console.error('❌ No current price available');
        return;
      }
      
      // Add signal marker above current candlestick
      const markerPrice = currentPrice * 1.02; // 2% above current price
      
      const signalData = {
        type: signalType,
        price: markerPrice,
        active: true,
        triggered: Date.now()
      };
      
      this.activeSignals.set(currentTime, signalData);
      console.log(`📍 Signal stored:`, signalData);
      
      // Update marker display
      this.updateSignalDisplay();
      
    } else {
      // Remove signal if it exists
      this.activeSignals.delete(currentTime);
      this.updateSignalDisplay();
    }
  }

  getCurrentCandleTime() {
    // Get the current candle time based on timeframe
    const now = Date.now();
    const timeframeMs = this.timeframes[this.currentTimeframe].seconds * 1000;
    return Math.floor(now / timeframeMs) * (timeframeMs / 1000); // Convert to seconds
  }

  getCurrentPrice() {
    if (!this.rawData || this.rawData.length === 0) return null;
    return this.rawData[this.rawData.length - 1].price;
  }

  updateSignalDisplay() {
    console.log(`🔍 Updating signal display: skull=${this.skullIndicatorEnabled}, goldX=${this.goldXIndicatorEnabled}`);
    console.log(`🔍 DEBUG: skullSignals.size = ${this.skullSignals.size}, goldXSignals.size = ${this.goldXSignals.size}`);
    
    const markers = [];
    
    // Add skull markers if enabled
    if (this.skullIndicatorEnabled) {
      for (const [time, signal] of this.skullSignals) {
        markers.push({
          time: time,
          position: 'aboveBar',
          color: '#FF0000',
          shape: 'text',
          text: '💀',
          size: 2,
        });
      }
      console.log(`💀 Added ${this.skullSignals.size} skull markers`);
    }
    
    // Add Gold X markers if enabled
    if (this.goldXIndicatorEnabled) {
      for (const [time, signal] of this.goldXSignals) {
        markers.push({
          time: time,
          position: 'aboveBar', // TEMP: Same as skulls to test
          color: '#FFD700',
          shape: 'text',
          text: '✖️', // Use full emoji
          size: 2,
        });
      }
      console.log(`✖️ Added ${this.goldXSignals.size} Gold X markers`);
    }
    
    console.log(`📍 Setting ${markers.length} total markers on chart`);
    
    try {
      if (priceSeries) {
        priceSeries.setMarkers(markers);
        console.log(`✅ Signal display updated successfully`);
        
        // Update status
        const statusEl = document.getElementById('signal-status');
        if (statusEl) {
          const skullCount = this.skullIndicatorEnabled ? this.skullSignals.size : 0;
          const goldXCount = this.goldXIndicatorEnabled ? this.goldXSignals.size : 0;
          statusEl.textContent = `Showing: ${skullCount} skulls, ${goldXCount} gold X`;
        }
      } else {
        console.warn('⚠️ Price series not available');
      }
    } catch (error) {
      console.error('❌ Error updating signal display:', error);
    }
  }

  // Check for candle closes and make signals permanent
  checkCandleCloses() {
    const currentCandleTime = this.getCurrentCandleTime();
    
    if (this.currentCandleTime && this.currentCandleTime !== currentCandleTime) {
      // Candle closed - make any active signals permanent
      console.log(`🕯️ Candle closed at ${new Date(this.currentCandleTime * 1000).toISOString()}`);
      
      const closedSignal = this.activeSignals.get(this.currentCandleTime);
      if (closedSignal && closedSignal.active) {
        console.log(`📍 Signal made permanent at candle close`);
        // Signal becomes permanent - no longer needs to be "active"
        closedSignal.permanent = true;
      }
    }
    
    this.currentCandleTime = currentCandleTime;
  }

  setMainChartMargins(margins) {
    // Adjust price scale margins to make room for indicators
    chart.priceScale('right').applyOptions({ scaleMargins: margins });
    chart.priceScale('left').applyOptions({ 
      scaleMargins: { top: margins.top + 0.13, bottom: margins.bottom + 0.13 } 
    });
  }

  hideAllIndicatorScales() {
    chart.priceScale('volume').applyOptions({ visible: false });
    chart.priceScale('indicator2').applyOptions({ visible: false });
    chart.priceScale('indicator3').applyOptions({ visible: false });
  }

  positionIndicators(positions) {
    this.hideAllIndicatorScales(); // Hide all first
    
    positions.forEach(pos => {
      const scaleMargins = { top: pos.top, bottom: pos.bottom };
      
      if (pos.id === 'volume' && this.volumeIndicatorEnabled) {
        chart.priceScale('volume').applyOptions({ 
          visible: true, 
          scaleMargins 
        });
      } else if (pos.id === 'indicator2' && this.indicator2Enabled) {
        chart.priceScale('indicator2').applyOptions({ 
          visible: true, 
          scaleMargins 
        });
      } else if (pos.id === 'indicator3' && this.indicator3Enabled) {
        chart.priceScale('indicator3').applyOptions({ 
          visible: true, 
          scaleMargins 
        });
      }
    });
  }

  updateIndicator2Chart() {
    if (!this.indicator2Enabled || !indicator2BidsSeries || !indicator2AsksSeries) {
      return;
    }

    console.log(`📊 Updating Indicator 2 (Timeframe-Averaged Volume) for ${this.currentTimeframe}`);
    
    // Use the same bucketing logic as candlesticks for timeframe averaging
    const timeframeConfig = this.timeframes[this.currentTimeframe];
    const timeframeSeconds = timeframeConfig.seconds;
    const buckets = new Map();

    // Sort data by timestamp
    const sortedData = [...this.rawData].sort((a, b) => new Date(a.time) - new Date(b.time));

    // Group volume data into timeframe buckets
    sortedData.forEach(item => {
      if (item.vol_L50_bids && item.vol_L50_asks) {
        const timestamp = this.toUnixTimestamp(item.time);
        const bucketTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
        
        if (!buckets.has(bucketTime)) {
          buckets.set(bucketTime, {
            bidsValues: [],
            asksValues: []
          });
        }

        buckets.get(bucketTime).bidsValues.push(parseFloat(item.vol_L50_bids));
        buckets.get(bucketTime).asksValues.push(parseFloat(item.vol_L50_asks));
      }
    });

    // Calculate averages for each bucket
    const bidsData = [];
    const asksData = [];
    
    for (const [bucketTime, bucket] of buckets) {
      if (bucket.bidsValues.length > 0 && bucket.asksValues.length > 0) {
        const avgBids = bucket.bidsValues.reduce((a, b) => a + b, 0) / bucket.bidsValues.length;
        const avgAsks = bucket.asksValues.reduce((a, b) => a + b, 0) / bucket.asksValues.length;
        
        bidsData.push({ time: bucketTime, value: avgBids });
        asksData.push({ time: bucketTime, value: avgAsks });
      }
    }

    console.log(`📊 Indicator 2: ${bidsData.length} averaged ${this.currentTimeframe} volume points`);

    if (bidsData.length > 0) {
      console.log('📊 Sample Indicator 2 data:', {
        first: { time: new Date(bidsData[0].time * 1000).toISOString(), bids: bidsData[0].value, asks: asksData[0].value },
        last: { time: new Date(bidsData[bidsData.length-1].time * 1000).toISOString(), bids: bidsData[bidsData.length-1].value, asks: asksData[asksData.length-1].value }
      });
      
      indicator2BidsSeries.setData(bidsData);
      indicator2AsksSeries.setData(asksData);
      console.log('✅ Indicator 2 (Timeframe-Averaged Volume) data set successfully');
    } else {
      console.warn('⚠️  No averaged volume data generated for Indicator 2');
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
      
      // Clear all indicator series
      destroyVolumeSeries();
      destroyIndicator2Series();
      destroyIndicator3Series();
    } catch (e) { 
      console.error('❌ Failed clearing series during symbol switch:', e); 
    }

    // Load data and restart update cycles
    await this.initializeChart();
    // Apply autoscale after loading new symbol
    this.applyAutoScale();
    this.startUpdateCycle();
    
    // CRITICAL: Refresh indicators after symbol switch
    this.refreshAllIndicators();
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
    
    // CRITICAL: Refresh indicators after exchange switch
    this.refreshAllIndicators();
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
    
    console.log(`🔄 Cumulative Avg: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    // Reprocess data to show/hide cumulative averages
    if (this.rawData && this.rawData.length > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData, false);
    }
  }

  setNormalize(enabled) {
    this.normalizeEnabled = !!enabled;
    const badge = document.getElementById('scaled-badge');
    if (badge) badge.style.display = this.normalizeEnabled ? 'inline-block' : 'none';
    
    console.log(`🔄 Normalization: ${enabled ? 'ENABLED' : 'DISABLED'}`);
    
    if (enabled) {
      // Calculate scaling factors for each layer
      this.calculateScalingFactors();
    } else {
      // Clear scaling factors
      this.scaleFactorsByKey.clear();
      this.emaScaleFactorsByKey.clear();
    }
    
    // Reprocess data to apply/remove normalization
    if (this.rawData && this.rawData.length > 0) {
      this.lastTimestamp = 0;
      this.processAndSetData(this.rawData, false);
    }
  }

  calculateScalingFactors() {
    console.log('📊 Calculating scaling factors for spread layers');
    
    if (!this.rawData || this.rawData.length === 0) return;
    
    // Calculate median values for each layer from recent data
    const layerMedians = new Map();
    const layers = ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'];
    
    for (const layerKey of layers) {
      const values = this.rawData
        .map(item => item[layerKey])
        .filter(val => val !== null && val !== undefined && isFinite(val))
        .slice(-500); // Use recent 500 points for median calculation
      
      if (values.length > 0) {
        values.sort((a, b) => a - b);
        const median = values[Math.floor(values.length / 2)];
        layerMedians.set(layerKey, median);
        console.log(`📊 ${layerKey} median: ${median.toFixed(6)}`);
      }
    }
    
    // Use L50 as reference layer (middle layer)
    const referenceMedian = layerMedians.get('spread_L50_pct_avg');
    if (!referenceMedian) {
      console.warn('⚠️  No reference median found for L50');
      return;
    }
    
    console.log(`📊 Using L50 median ${referenceMedian.toFixed(6)} as reference`);
    
    // Calculate scaling factors for each layer and duration combination
    for (const layerKey of this.selectedLayers) {
      const layerMedian = layerMedians.get(layerKey);
      if (!layerMedian) continue;
      
      // Calculate scaling factor to match L50 range
      const scaleFactor = referenceMedian / layerMedian;
      
      console.log(`📊 ${layerKey}: median ${layerMedian.toFixed(6)} → scale factor ${scaleFactor.toFixed(3)}`);
      
      // Apply scaling factor to all durations for this layer
      for (const duration of this.selectedDurations) {
        const key = `${layerKey}|${duration}`;
        this.scaleFactorsByKey.set(key, scaleFactor);
      }
      
      // Apply scaling factor to EMAs
      for (const duration of this.selectedEMADurations) {
        const key = `${layerKey}|EMA${duration}`;
        this.emaScaleFactorsByKey.set(key, scaleFactor);
      }
      
      // Apply to cumulative averages
      this.scaleFactorsByKey.set(`avg|${layerKey}`, scaleFactor);
    }
    
    console.log('✅ Scaling factors calculated for all layers');
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

function toggleIndicator2(enabled) {
  manager.toggleIndicator2(enabled);
}

function toggleIndicator3(enabled) {
  manager.toggleIndicator3(enabled);
}

function setYAxisControl(mode) {
  manager.setYAxisControl(mode);
}

// Signal Indicator Toggle Functions
function toggleSkullIndicator(enabled) {
  manager.toggleSkullIndicator(enabled);
}

function toggleGoldXIndicator(enabled) {
  manager.toggleGoldXIndicator(enabled);
}

function calculateAllSignals() {
  manager.calculateAllSignals();
  // Update display if any indicators are enabled
  if (manager.skullIndicatorEnabled || manager.goldXIndicatorEnabled) {
    manager.updateSignalDisplay();
  }
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
  
  // CRITICAL: Initialize all indicator series for TradingView-style indicators
  createVolumeSeries();
  createIndicator2Series();
  createIndicator3Series();
  createSignalMarkerSeries();
  
  // Setup trading tools
  manager.setupTradingTools();
  
  // Auto-calculate thresholds when data is loaded
  setTimeout(() => {
    if (manager.rawData && manager.rawData.length > 0) {
      console.log('🔄 Auto-calculating skull thresholds from loaded data');
      manager.calculateSpreadThresholds();
      manager.calculateSlopeThresholds();
    }
  }, 2000);
  
  // Start update cycle
  manager.startUpdateCycle();
  
  // Add mobile optimizations after chart is ready
  setTimeout(() => {
    addMobileOptimizations();
    addScaleResetButton();
  }, 1000);
});

// Better approach: Add a "Reset Scales" button instead of blocking scaling
function addScaleResetButton() {
  // Add a reset scales button to the tools menu if it doesn't exist
  const toolsMenu = document.querySelector('.ma-toggle-list');
  if (toolsMenu && !document.getElementById('btn-reset-scales')) {
    const resetButton = document.createElement('button');
    resetButton.id = 'btn-reset-scales';
    resetButton.className = 'tool-btn';
    resetButton.style.cssText = 'background: #2962ff; color: #fff; margin-top: 8px;';
    resetButton.textContent = '🔄 Reset Y-Scales';
    resetButton.onclick = () => {
      // Reset both axes to sensible defaults
      chart.priceScale('right').applyOptions({ autoScale: true });
      chart.priceScale('left').applyOptions({ autoScale: false });
      console.log('✅ Y-axis scales reset');
    };
    toolsMenu.appendChild(resetButton);
  }
}


