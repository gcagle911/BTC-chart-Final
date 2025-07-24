// Advanced Mobile Trading Chart with TradingView-like functionality
// Enhanced touch handling, pinch-to-zoom, and multi-timeframe support

// Global variables for mobile optimization
let miniCharts = {};
let timeframePanelsVisible = false;
let touchStartTime = 0;
let lastTouchEnd = 0;
let gestureHintTimeout = null;

// Main chart setup with enhanced mobile configuration
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
    alignLabels: false,
  },
  timeScale: { 
    timeVisible: true, 
    secondsVisible: false,
    borderVisible: false,
    rightOffset: 50,
    barSpacing: 8,
    minBarSpacing: 2,
    fixLeftEdge: false,
    fixRightEdge: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
    vertLine: {
      width: 1,
      color: '#758696',
      style: LightweightCharts.LineStyle.Dashed,
    },
    horzLine: {
      width: 1,
      color: '#758696',
      style: LightweightCharts.LineStyle.Dashed,
    },
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

const priceSeries = chart.addCandlestickSeries({
  priceScaleId: 'right',
  upColor: '#00ff88',
  downColor: '#ff4976',
  borderVisible: false,
  wickUpColor: '#00ff88',
  wickDownColor: '#ff4976',
  borderUpColor: '#00ff88',
  borderDownColor: '#ff4976',
});

// MA lines with enhanced mobile visibility
const ma50 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FF6B6B',
  lineWidth: 2,
  lineStyle: LightweightCharts.LineStyle.Solid,
  title: 'MA50',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma100 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#4ADF86',
  lineWidth: 2,
  lineStyle: LightweightCharts.LineStyle.Solid,
  title: 'MA100',
  lastValueVisible: false,
  priceLineVisible: false,
});

const ma200 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#FFD700',
  lineWidth: 2,
  lineStyle: LightweightCharts.LineStyle.Solid,
  title: 'MA200',
  lastValueVisible: false,
  priceLineVisible: false,
});

// Enhanced indicator panel with mobile optimization
window.indicatorChart = LightweightCharts.createChart(document.getElementById('indicator-panel'), {
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
  timeScale: { 
    visible: false,
    borderVisible: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
    vertLine: {
      width: 1,
      color: '#758696',
      style: LightweightCharts.LineStyle.Dashed,
    },
    horzLine: {
      width: 1,
      color: '#758696',
      style: LightweightCharts.LineStyle.Dashed,
    },
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

// Custom indicator series and reference lines
let customIndicatorSeries = null;
let topReferenceLine = null;
let middleReferenceLine = null;
let bottomReferenceLine = null;

// Multi-timeframe mini chart setup
function initializeMiniCharts() {
  const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];
  
  timeframes.forEach(tf => {
    const container = document.getElementById(`mini-chart-${tf}`);
    if (container) {
      try {
        miniCharts[tf] = LightweightCharts.createChart(container, {
          layout: {
            background: { color: '#1e222d' },
            textColor: '#d1d4dc',
          },
          grid: {
            vertLines: { visible: false },
            horzLines: { visible: false },
          },
          rightPriceScale: { 
            visible: false,
          },
          leftPriceScale: { 
            visible: false,
          },
          timeScale: { 
            visible: false,
            borderVisible: false,
          },
          crosshair: {
            mode: LightweightCharts.CrosshairMode.Hidden,
          },
          handleScroll: {
            mouseWheel: false,
            pressedMouseMove: false,
            horzTouchDrag: false,
            vertTouchDrag: false,
          },
          handleScale: {
            mouseWheel: false,
            pinch: false,
            axisPressedMouseMove: false,
            axisDoubleClickReset: false,
          },
        });
        
        // Add candlestick series to mini chart
        miniCharts[tf].series = miniCharts[tf].addCandlestickSeries({
          upColor: '#00ff88',
          downColor: '#ff4976',
          borderVisible: false,
          wickUpColor: '#00ff88',
          wickDownColor: '#ff4976',
          borderUpColor: '#00ff88',
          borderDownColor: '#ff4976',
        });
        
        // Add click handler for timeframe switching
        container.parentElement.addEventListener('click', () => {
          setTimeframe(tf);
          showGestureHint('Switched to ' + tf.toUpperCase());
        });
        
        console.log(`✅ Mini chart initialized for ${tf}`);
      } catch (error) {
        console.error(`❌ Failed to initialize mini chart for ${tf}:`, error);
      }
    }
  });
}

// Toggle timeframe panels visibility
function toggleTimeframePanels() {
  const panels = document.getElementById('timeframe-panels');
  const controls = document.getElementById('top-controls');
  
  timeframePanelsVisible = !timeframePanelsVisible;
  
  if (timeframePanelsVisible) {
    panels.classList.add('visible');
    controls.classList.remove('panels-hidden');
    showGestureHint('Tap any timeframe to switch');
  } else {
    panels.classList.remove('visible');
    controls.classList.add('panels-hidden');
  }
}

// Show gesture hints to help users
function showGestureHint(message) {
  if (gestureHintTimeout) {
    clearTimeout(gestureHintTimeout);
  }
  
  const existingHint = document.querySelector('.gesture-hint');
  if (existingHint) {
    existingHint.remove();
  }
  
  const hint = document.createElement('div');
  hint.className = 'gesture-hint';
  hint.textContent = message;
  document.body.appendChild(hint);
  
  gestureHintTimeout = setTimeout(() => {
    hint.remove();
  }, 3000);
}

// Enhanced Timeframe Manager with multi-chart support
class TimeframeManager {
  constructor() {
    this.currentTimeframe = '1m';
    this.rawData = [];
    this.lastTimestamp = 0;
    this.isFullDataLoaded = false;
    this.updateInterval = null;
    this.refreshInterval = null;
    this.miniChartsData = {};
    
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

  showLoading() {
    document.getElementById('loading-indicator').style.display = 'block';
  }

  hideLoading() {
    document.getElementById('loading-indicator').style.display = 'none';
  }

  setActiveDropdown(timeframe) {
    const dropdown = document.getElementById('timeframe-dropdown');
    if (dropdown) {
      dropdown.value = timeframe;
    }
    
    // Update active mini chart
    document.querySelectorAll('.timeframe-mini-chart').forEach(chart => {
      chart.classList.remove('active');
    });
    
    const activeChart = document.querySelector(`[data-timeframe="${timeframe}"]`);
    if (activeChart) {
      activeChart.classList.add('active');
    }
  }

  disableDropdown() {
    const dropdown = document.getElementById('timeframe-dropdown');
    if (dropdown) {
      dropdown.disabled = true;
    }
  }

  enableDropdown() {
    const dropdown = document.getElementById('timeframe-dropdown');
    if (dropdown) {
      dropdown.disabled = false;
    }
  }

  // Aggregate data maintaining full MA technical accuracy and create synthetic OHLC
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
        // This ensures MAs remain identical across all timeframes
        const closeMAs = closePoint;
        
        // CRITICAL: Use consistent bucket timestamp for all timeframes
        const bucketTimestamp = new Date(bucketTime * 1000).toISOString();
        
        aggregated.push({
          time: bucketTimestamp, // Consistent bucket timestamp
          // Proper OHLC data for candlestick display
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          price: closePoint.price, // Keep for compatibility
          
          // Bid Spread L20 MAs STAY THE SAME - using exact values from close time
          // This ensures MAs remain identical across all timeframes
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
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];
    const indicatorData = [];

    // Set loading flag to skip heavy indicator calculations during initial load
    if (!isUpdate && aggregatedPriceData.length > 1000) {
      this.isInitialLoad = true;
    }

    // Process aggregated price data for price series
    for (let i = 0; i < aggregatedPriceData.length; i++) {
      const d = aggregatedPriceData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      // CRITICAL: Create all data points with IDENTICAL timestamps
      const sharedTime = t; // Ensure all series use the exact same timestamp
      
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
    for (let i = 0; i < rawMinuteData.length; i++) {
      const d = rawMinuteData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      const sharedTime = t;
      
            // MA data ALWAYS from 1-minute data - IDENTICAL across all timeframes
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
      
      // Indicator data from raw minute data as well
      const indicatorValue = this.calculateCustomIndicator(d);
      if (indicatorValue !== null) {
        indicatorData.push({ 
          time: sharedTime, // EXACT same timestamp as price data
          value: indicatorValue
        });
      }
    }

    // Log timestamp alignment for debugging
    if (priceData.length > 0 && ma50Data.length > 0) {
      console.log(`🕐 ${this.currentTimeframe} Data Processing:`);
      console.log(`   Candlestick Data: ${priceData.length} points (OHLC aggregated by timeframe)`);
      console.log(`   Bid Spread L20 MA Data: ${ma50Data.length} points (always 1-minute granularity)`);
      console.log(`   Result: Spread MAs stay identical across timeframes, OHLC created from price points`);
    }

    // Clear loading flag
    this.isInitialLoad = false;

           if (isUpdate) {
         // Add new data points
         priceSeries.update(priceData);
         ma50Data.forEach(p => ma50.update(p));
        ma100Data.forEach(p => ma100.update(p));
        ma200Data.forEach(p => ma200.update(p));
        
        // Update indicator panel with perfect time sync
        if (customIndicatorSeries && indicatorData.length > 0) {
          indicatorData.forEach(p => customIndicatorSeries.update(p));
          
          // Update reference lines with exact same timestamps
          if (topReferenceLine && indicatorData.length > 0) {
            indicatorData.forEach(p => topReferenceLine.update({ time: p.time, value: 1.0 }));
          }
          if (middleReferenceLine && indicatorData.length > 0) {
            indicatorData.forEach(p => middleReferenceLine.update({ time: p.time, value: 0.5 }));
          }
          if (bottomReferenceLine && indicatorData.length > 0) {
            indicatorData.forEach(p => bottomReferenceLine.update({ time: p.time, value: 0.0 }));
          }
        }
      } else {
        // Set complete dataset
        priceSeries.setData(priceData);
        ma50.setData(ma50Data);
        ma100.setData(ma100Data);
        ma200.setData(ma200Data);
        
        // Set indicator panel data (optimized)
        if (customIndicatorSeries && indicatorData.length > 0) {
          customIndicatorSeries.setData(indicatorData);
          
          // Simplified reference lines (only set once)
          this.setReferenceLinesOnce(indicatorData);
        }
      }

      // Throttled status updates
      if (!isUpdate || this.shouldUpdateStatus()) {
        this.updateSpreadStatus(rawMinuteData);
      }
    
    // Force immediate and aggressive time scale sync
    setTimeout(() => {
      this.syncTimeScales();
      
      // Double-check alignment with visible ranges
      const mainRange = chart.timeScale().getVisibleTimeRange();
      const indicatorRange = indicatorChart.timeScale().getVisibleTimeRange();
      
      if (mainRange && indicatorRange) {
        console.log('🔍 Time Range Check:');
        console.log(`   Main: ${new Date(mainRange.from * 1000).toISOString()} → ${new Date(mainRange.to * 1000).toISOString()}`);
        console.log(`   Indicator: ${new Date(indicatorRange.from * 1000).toISOString()} → ${new Date(indicatorRange.to * 1000).toISOString()}`);
        
        // Force perfect alignment if they don't match
        if (Math.abs(mainRange.from - indicatorRange.from) > 1 || Math.abs(mainRange.to - indicatorRange.to) > 1) {
          console.log('❌ Time ranges misaligned - forcing correction');
          indicatorChart.timeScale().setVisibleTimeRange(mainRange);
        } else {
          console.log('✅ Time ranges perfectly aligned');
        }
      }
      
      console.log('🔗 Charts synchronized and aligned');
    }, 200);
  }

  // Helper to set reference lines using exact same timestamps as indicator
  setReferenceLinesOnce(indicatorData) {
    if (this.referenceLinesSet || indicatorData.length === 0) return;
    
    console.log(`🎯 Setting reference lines with ${indicatorData.length} aligned timestamps`);
    
    if (topReferenceLine) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 1.0 }));
      topReferenceLine.setData(refData);
    }
    if (middleReferenceLine) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 0.5 }));
      middleReferenceLine.setData(refData);
    }
    if (bottomReferenceLine) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 0.0 }));
      bottomReferenceLine.setData(refData);
    }
    
    this.referenceLinesSet = true;
    console.log('✅ Reference lines aligned with indicator timestamps');
  }

  // Helper to throttle status updates  
  shouldUpdateStatus() {
    if (!this.lastStatusUpdate) this.lastStatusUpdate = 0;
    const now = Date.now();
    if (now - this.lastStatusUpdate > 3000) { // 3 second throttle
      this.lastStatusUpdate = now;
      return true;
    }
    return false;
  }

  // Bid Spread L20 MA Crossover - Dynamic MA-Based Confirmation
  calculateCustomIndicator(dataPoint) {
    const { ma_50, ma_100, ma_200 } = dataPoint;
    
    // Quick validation
    if (ma_50 === null || ma_100 === null || ma_200 === null) {
      return null;
    }
    
    // Skip during initial load to improve performance
    if (this.isInitialLoad) {
      return 0.5; // Return neutral during loading
    }
    
    // Initialize enhanced state for Bid Spread L20 MA-based tracking
    if (!this.indicatorState) {
      this.indicatorState = {
        lastSpreadColor: '#26a69a',
        crossoverHistory: [],
        confirmedState: 0.5, // Start neutral
        pendingCross: null,
        candlesSinceCross: 0,
        maGapHistory: [], // Track MA separation changes
        lastMAGap: null
      };
    }
    
    // Determine current Bid Spread L20 MA positioning
    const ma50AboveMA200 = ma_50 > ma_200;
    const ma100AboveMA200 = ma_100 > ma_200;
    
    // Current raw state (what it would be without delay)
    let currentRawState;
    if (ma50AboveMA200 && ma100AboveMA200) {
      currentRawState = 1.0; // Both spread MAs above MA200 (higher spreads)
    } else if (!ma50AboveMA200 && !ma100AboveMA200) {
      currentRawState = 0.0; // Both spread MAs below MA200 (lower spreads)
    } else {
      currentRawState = 0.5; // Mixed
    }
    
    // Calculate dynamic confirmation period based on MA behavior
    const dynamicConfirmation = this.calculateMABasedConfirmation(ma_50, ma_100, ma_200);
    
    // Track crossover history to detect changes
    this.indicatorState.crossoverHistory.push({
      ma50Above: ma50AboveMA200,
      ma100Above: ma100AboveMA200,
      rawState: currentRawState,
      timestamp: Date.now(),
      ma50: ma_50,
      ma100: ma_100,
      ma200: ma_200
    });
    
    // Keep only recent history (last 50 candles should be enough)
    if (this.indicatorState.crossoverHistory.length > 50) {
      this.indicatorState.crossoverHistory.shift();
    }
    
    // Detect if we have a new crossover (change from previous confirmed state)
    const previousConfirmedState = this.indicatorState.confirmedState;
    
    // Check if current raw state is different from confirmed state and we're not already tracking a pending cross
    if (currentRawState !== previousConfirmedState && currentRawState !== 0.5 && !this.indicatorState.pendingCross) {
      // New crossover detected - start tracking with dynamic confirmation
      this.indicatorState.pendingCross = {
        targetState: currentRawState,
        startCandle: this.indicatorState.crossoverHistory.length - 1,
        candlesRequired: dynamicConfirmation
      };
      this.indicatorState.candlesSinceCross = 1;
      console.log(`🔄 New Bid Spread L20 MA crossover detected: ${currentRawState === 1.0 ? 'HIGH SPREAD' : 'LOW SPREAD'} - waiting for ${dynamicConfirmation} candle confirmation (MA-based)`);
    }
    
    // If we have a pending crossover, check confirmation progress
    if (this.indicatorState.pendingCross) {
      this.indicatorState.candlesSinceCross++;
      
      // Check if the crossover is still valid (MAs haven't crossed back)
      if (currentRawState === this.indicatorState.pendingCross.targetState) {
        // Crossover still valid, check if we've waited long enough
        if (this.indicatorState.candlesSinceCross >= this.indicatorState.pendingCross.candlesRequired) {
          // Confirmation complete - update confirmed state
          this.indicatorState.confirmedState = this.indicatorState.pendingCross.targetState;
          console.log(`✅ Bid Spread L20 MA Crossover CONFIRMED after ${this.indicatorState.candlesSinceCross} candles: ${this.indicatorState.confirmedState === 1.0 ? 'HIGH SPREAD' : 'LOW SPREAD'}`);
          this.indicatorState.pendingCross = null;
          this.indicatorState.candlesSinceCross = 0;
          
          // Update indicator line color when all MAs above 0.03
          this.updateIndicatorLineColor(ma_50, ma_100, ma_200);
        } else {
          // Still waiting for confirmation
          const remaining = this.indicatorState.pendingCross.candlesRequired - this.indicatorState.candlesSinceCross;
          if (remaining % 5 === 0 || remaining <= 3) { // Log every 5 candles or last 3
            console.log(`⏳ Bid Spread L20 MA crossover confirmation: ${this.indicatorState.candlesSinceCross}/${this.indicatorState.pendingCross.candlesRequired} candles (${remaining} remaining)`);
          }
        }
      } else {
        // Crossover invalidated - MAs crossed back before confirmation
        console.log(`❌ Bid Spread L20 MA Crossover INVALIDATED after ${this.indicatorState.candlesSinceCross} candles - MAs crossed back`);
        this.indicatorState.pendingCross = null;
        this.indicatorState.candlesSinceCross = 0;
      }
    }
    
    // Update spread color (for status display)
    if (ma_50 > 0.03) {
      this.indicatorState.lastSpreadColor = '#ff4444'; // Red
    } else if (ma_50 > 0.02) {
      this.indicatorState.lastSpreadColor = '#ff8800'; // Orange
    } else if (ma_50 > 0.01) {
      this.indicatorState.lastSpreadColor = '#ffcc00'; // Yellow
    } else {
      this.indicatorState.lastSpreadColor = '#26a69a'; // Green
    }
    
    // Update indicator line color based on MA values
    this.updateIndicatorLineColor(ma_50, ma_100, ma_200);
    
    // Return the confirmed state (not the raw state)
    return this.indicatorState.confirmedState;
  }

  // Calculate dynamic confirmation based purely on MA behavior
  calculateMABasedConfirmation(ma_50, ma_100, ma_200) {
    // Base confirmation periods by timeframe
    const baseConfirmation = {
      '1m': 16,
      '5m': 12, 
      '15m': 8,
      '1h': 6,
      '4h': 4,
      '1d': 3
    };
    
    const base = baseConfirmation[this.currentTimeframe] || 16;
    
    // Factor 1: MA Separation Strength (60% weight)
    const separation = Math.abs(ma_50 - ma_200) / ma_200;
    let strengthFactor;
    if (separation > 0.01) {        // 1%+ separation = very strong
      strengthFactor = 0.5;
    } else if (separation > 0.005) { // 0.5%+ = strong  
      strengthFactor = 0.7;
    } else if (separation > 0.002) { // 0.2%+ = medium
      strengthFactor = 1.0;
    } else {                        // <0.2% = weak
      strengthFactor = 1.5;
    }
    
    // Factor 2: MA Convergence Speed (40% weight)
    const convergenceSpeed = this.getMAConvergenceSpeed();
    let speedFactor;
    if (convergenceSpeed > 0.003) {     // Fast convergence
      speedFactor = 0.7;
    } else if (convergenceSpeed > 0.001) { // Medium speed
      speedFactor = 1.0;
    } else {                          // Slow convergence
      speedFactor = 1.3;
    }
    
    // Combine factors (weighted average)
    const finalMultiplier = (strengthFactor * 0.6) + (speedFactor * 0.4);
    const confirmationCandles = Math.max(4, Math.min(25, Math.round(base * finalMultiplier)));
    
    console.log(`📊 MA-Based Confirmation: ${confirmationCandles} candles (separation: ${(separation * 100).toFixed(3)}%, speed: ${convergenceSpeed.toFixed(4)}, factors: ${strengthFactor.toFixed(2)}/${speedFactor.toFixed(2)})`);
    
    return confirmationCandles;
  }

  // Calculate how fast the MAs converged
  getMAConvergenceSpeed() {
    // Track MA gap changes for speed calculation
    const currentGap = Math.abs(this.indicatorState.crossoverHistory[this.indicatorState.crossoverHistory.length - 1]?.ma50 - 
                               this.indicatorState.crossoverHistory[this.indicatorState.crossoverHistory.length - 1]?.ma200) || 0;
    
    this.indicatorState.maGapHistory.push(currentGap);
    
    // Keep only last 10 gaps for speed calculation
    if (this.indicatorState.maGapHistory.length > 10) {
      this.indicatorState.maGapHistory.shift();
    }
    
    // Need at least 5 points to calculate speed
    if (this.indicatorState.maGapHistory.length < 5) {
      return 0.001; // Default medium speed
    }
    
    // Calculate average change per candle over last 5 candles
    const recent = this.indicatorState.maGapHistory.slice(-5);
    let totalChange = 0;
    for (let i = 1; i < recent.length; i++) {
      totalChange += Math.abs(recent[i] - recent[i-1]);
    }
    
    return totalChange / (recent.length - 1);
  }

  // Update indicator line color when all MAs are above 0.03
  updateIndicatorLineColor(ma_50, ma_100, ma_200) {
    if (!customIndicatorSeries) return;
    
    // Check if all MAs are above 0.03
    const allMAsAbove003 = ma_50 > 0.03 && ma_100 > 0.03 && ma_200 > 0.03;
    
    // Store current color state to avoid unnecessary updates
    if (!this.lastIndicatorColor) {
      this.lastIndicatorColor = '#00d4ff'; // Default blue
    }
    
    const newColor = allMAsAbove003 ? '#00ff00' : '#00d4ff'; // Bright green or blue
    
    // Only update if color changed
    if (newColor !== this.lastIndicatorColor) {
      customIndicatorSeries.applyOptions({
        color: newColor
      });
      this.lastIndicatorColor = newColor;
      
      console.log(`🎨 Indicator line color: ${allMAsAbove003 ? 'BRIGHT GREEN (all MAs > 0.03)' : 'BLUE (normal)'}`);
    }
  }

  // Update spread status display (ultra-light)
  updateSpreadStatus(data) {
    if (data.length === 0 || !this.indicatorState || this.isInitialLoad) return;
    
    // Skip during heavy processing
    if (data.length > 5000) return;
    
    const latest = data[data.length - 1];
    const spreadValue = latest.ma_50;
    
    // Use requestAnimationFrame for smooth DOM updates
    if (!this.pendingStatusUpdate) {
      this.pendingStatusUpdate = true;
      requestAnimationFrame(() => {
        this.updateStatusDOM(spreadValue);
        this.pendingStatusUpdate = false;
      });
    }
  }

  updateStatusDOM(spreadValue) {
    const spreadElement = document.getElementById('spread-value');
    const statusElement = document.getElementById('spread-status-text');
    
    if (spreadElement && spreadValue !== null) {
      spreadElement.textContent = spreadValue.toFixed(4);
      spreadElement.style.color = this.indicatorState.lastSpreadColor;
    }
    
    if (statusElement && this.indicatorState && this.rawData.length > 0) {
      // Get latest MA data to determine current status
      const latest = this.rawData[this.rawData.length - 1];
      if (latest && latest.ma_50 !== null && latest.ma_100 !== null && latest.ma_200 !== null) {
        const ma50AboveMA200 = latest.ma_50 > latest.ma_200;
        const ma100AboveMA200 = latest.ma_100 > latest.ma_200;
        
        let statusText;
        
        // Check if we're in a pending confirmation period
        if (this.indicatorState.pendingCross) {
          const remaining = this.indicatorState.pendingCross.candlesRequired - this.indicatorState.candlesSinceCross;
          const targetDirection = this.indicatorState.pendingCross.targetState === 1.0 ? 'BULLISH' : 'BEARISH';
          statusText = `CONFIRMING ${targetDirection} (${remaining} candles left)`;
        } else {
          // Show confirmed state
          if (ma50AboveMA200 && ma100AboveMA200) {
            statusText = this.indicatorState.confirmedState === 1.0 ? "CONFIRMED BULLISH" : "BULLISH - Not Confirmed";
          } else if (!ma50AboveMA200 && !ma100AboveMA200) {
            statusText = this.indicatorState.confirmedState === 0.0 ? "CONFIRMED BEARISH" : "BEARISH - Not Confirmed";
          } else {
            statusText = "MIXED - MAs Diverging";
          }
        }
        
        statusElement.textContent = statusText;
        statusElement.style.color = this.indicatorState.lastSpreadColor;
      } else {
        statusElement.textContent = "LOADING...";
      }
    }
  }

  // Force sync indicator chart to main chart with full configuration
  syncTimeScales() {
    try {
      const timeRange = chart.timeScale().getVisibleTimeRange();
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      
      if (timeRange) {
        indicatorChart.timeScale().setVisibleTimeRange(timeRange);
      }
      
      if (logicalRange) {
        indicatorChart.timeScale().setVisibleLogicalRange(logicalRange);
      }
      
      // Force identical time scale configuration
      const mainOptions = chart.timeScale().options();
      indicatorChart.timeScale().applyOptions({
        rightOffset: mainOptions.rightOffset,
        barSpacing: mainOptions.barSpacing,
        minBarSpacing: mainOptions.minBarSpacing,
      });
      
      console.log(`🔗 Sync completed - TF: ${this.currentTimeframe}`);
    } catch (err) {
      console.error('❌ Sync failed:', err);
    }
  }

  async initializeChart() {
    try {
      this.showLoading();
      console.log('🚀 Loading chart...');
      
      // Phase 1: Load recent data first (fast startup)
      const recentRes = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
      const recentData = await recentRes.json();
      
      this.rawData = recentData;
      this.processAndSetData(recentData);
      console.log(`✅ Recent data loaded (${recentData.length} points)`);
      
      // Phase 2: Load complete historical data
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
        console.log('✅ Fallback loaded');
      } catch (fallbackErr) {
        console.error('❌ All endpoints failed');
      }
    } finally {
      this.hideLoading();
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

  async refreshHistoricalData() {
    if (!this.isFullDataLoaded) return;
    
    try {
      console.log('🔄 Refreshing historical data...');
      const res = await fetch('https://btc-spread-test-pipeline.onrender.com/historical.json');
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
    
    this.showLoading();
    this.disableDropdown();
    
    console.log(`🔄 Switching to ${timeframe} timeframe - ensuring perfect alignment`);
    
    const oldTimeframe = this.currentTimeframe;
    this.currentTimeframe = timeframe;
    this.setActiveDropdown(timeframe);
    
    // Reset sync state for clean timeframe switch
    this.referenceLinesSet = false;
    
    // Reprocess data with new timeframe
    this.lastTimestamp = 0; // Reset to reprocess all data
    this.processAndSetData(this.rawData);
    
    // Aggressive multi-stage synchronization after timeframe switch
    setTimeout(() => {
      console.log(`📊 Stage 1: Initial sync from ${oldTimeframe} to ${timeframe}`);
      this.syncTimeScales();
      
      // Get ranges for verification
      const mainRange = chart.timeScale().getVisibleTimeRange();
      const indicatorRange = indicatorChart.timeScale().getVisibleTimeRange();
      
      if (mainRange && indicatorRange) {
        console.log(`🕐 Post-switch ranges:`);
        console.log(`   Main: ${new Date(mainRange.from * 1000).toISOString()} → ${new Date(mainRange.to * 1000).toISOString()}`);
        console.log(`   Indicator: ${new Date(indicatorRange.from * 1000).toISOString()} → ${new Date(indicatorRange.to * 1000).toISOString()}`);
        
        // Force exact alignment
        indicatorChart.timeScale().setVisibleTimeRange(mainRange);
      }
    }, 200);
    
    // Second sync wave
    setTimeout(() => {
      console.log(`📊 Stage 2: Secondary sync verification`);
      this.syncTimeScales();
      
      // Final verification
      const finalMain = chart.timeScale().getVisibleTimeRange();
      const finalIndicator = indicatorChart.timeScale().getVisibleTimeRange();
      
      if (finalMain && finalIndicator) {
        const timeDiff = Math.abs(finalMain.from - finalIndicator.from);
        if (timeDiff > 1) {
          console.log(`❌ Still misaligned by ${timeDiff}s - forcing correction`);
          indicatorChart.timeScale().setVisibleTimeRange(finalMain);
        } else {
          console.log(`✅ Perfect alignment achieved (diff: ${timeDiff}s)`);
        }
      }
    }, 600);
    
    this.hideLoading();
    this.enableDropdown();
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label} - Multi-stage sync initiated`);
  }

  startUpdateCycle() {
    // Clear existing intervals
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Update with recent data every 30 seconds (reduced frequency)
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), 30000);

    // Refresh complete historical data every hour
    this.refreshInterval = setInterval(() => this.refreshHistoricalData(), 3600000);
  }
}

// Global timeframe manager instance
const timeframeManager = new TimeframeManager();

// Global function for timeframe buttons
function setTimeframe(timeframe) {
  timeframeManager.switchTimeframe(timeframe);
}

// Helper function to setup custom indicators
function setupCustomIndicator(indicatorConfig) {
  // Remove existing series if any
  if (customIndicatorSeries) {
    indicatorChart.removeSeries(customIndicatorSeries);
  }
  if (topReferenceLine) {
    indicatorChart.removeSeries(topReferenceLine);
  }
  if (middleReferenceLine) {
    indicatorChart.removeSeries(middleReferenceLine);
  }
  if (bottomReferenceLine) {
    indicatorChart.removeSeries(bottomReferenceLine);
  }

  // Add reference lines for better visualization
  topReferenceLine = indicatorChart.addLineSeries({
    color: '#444444',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  middleReferenceLine = indicatorChart.addLineSeries({
    color: '#666666',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dotted,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  bottomReferenceLine = indicatorChart.addLineSeries({
    color: '#444444',
    lineWidth: 1,
    lineStyle: LightweightCharts.LineStyle.Dashed,
    priceLineVisible: false,
    lastValueVisible: false,
  });

  // Create main indicator series
  customIndicatorSeries = indicatorChart.addLineSeries({
    color: indicatorConfig.color || '#00d4ff',
    lineWidth: indicatorConfig.lineWidth || 3,
    title: indicatorConfig.title || 'Custom Indicator'
  });

  // Update the calculation function
  timeframeManager.calculateCustomIndicator = indicatorConfig.calculate;

  // Reprocess current data with new indicator
  timeframeManager.processAndSetData(timeframeManager.rawData);

  console.log(`✅ Custom indicator "${indicatorConfig.title}" configured and active!`);
}

// Setup chart synchronization - main chart controls indicator
function setupChartSync() {
  console.log('🔗 Setting up chart synchronization...');
  
  // Only sync FROM main chart TO indicator chart (one-way)
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    try {
      const range = chart.timeScale().getVisibleTimeRange();
      if (range) {
        indicatorChart.timeScale().setVisibleTimeRange(range);
        console.log('📅 Synced to range:', range);
      }
    } catch (e) {
      console.error('❌ Sync error:', e);
    }
  });

  // Also sync logical range for zoom levels
  chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
    try {
      const logicalRange = chart.timeScale().getVisibleLogicalRange();
      if (logicalRange) {
        indicatorChart.timeScale().setVisibleLogicalRange(logicalRange);
      }
    } catch (e) {
      console.error('❌ Logical sync error:', e);
    }
  });

  console.log('✅ Chart sync listeners attached');
}

// Initialize chart and start update cycle
timeframeManager.initializeChart().then(() => {
  timeframeManager.startUpdateCycle();
  
  // Setup the Bid Spread L20 MA Crossover Indicator
  setupCustomIndicator({
    type: 'line',
    title: 'Bid Spread L20 MA Crossover',
    color: '#00d4ff',
    lineWidth: 3,
    calculate: timeframeManager.calculateCustomIndicator.bind(timeframeManager)
  });
  
  // Setup synchronization AFTER all data is loaded
  setTimeout(() => {
    setupChartSync();
    
    // Force immediate lock
    const timeRange = chart.timeScale().getVisibleTimeRange();
    const logicalRange = chart.timeScale().getVisibleLogicalRange();
    
    if (timeRange) {
      indicatorChart.timeScale().setVisibleTimeRange(timeRange);
      console.log('🔗 Locked time range:', timeRange);
    }
    
    if (logicalRange) {
      indicatorChart.timeScale().setVisibleLogicalRange(logicalRange);
      console.log('🔗 Locked logical range:', logicalRange);
    }
    
    // Final alignment verification and correction
    const finalMainRange = chart.timeScale().getVisibleTimeRange();
    const finalIndicatorRange = indicatorChart.timeScale().getVisibleTimeRange();
    
    if (finalMainRange && finalIndicatorRange) {
      console.log('🎯 Final Alignment Check:');
      console.log(`   Main Chart: ${new Date(finalMainRange.from * 1000).toISOString()} → ${new Date(finalMainRange.to * 1000).toISOString()}`);
      console.log(`   Indicator: ${new Date(finalIndicatorRange.from * 1000).toISOString()} → ${new Date(finalIndicatorRange.to * 1000).toISOString()}`);
      
      // Force absolute perfect alignment
      indicatorChart.timeScale().setVisibleTimeRange(finalMainRange);
      
      setTimeout(() => {
        const verifyRange = indicatorChart.timeScale().getVisibleTimeRange();
        if (verifyRange) {
          console.log(`🔒 Final Sync: ${new Date(verifyRange.from * 1000).toISOString()} → ${new Date(verifyRange.to * 1000).toISOString()}`);
        }
      }, 100);
    }
    
    console.log('✅ Charts are now LOCKED TOGETHER!');
    console.log('📊 X-axis: Locked together (scroll main chart)');
    console.log('📊 Y-axis: Independent (scroll/zoom indicator panel)');
  }, 1000);
  
  console.log('📊 Bid Spread L20 MA Crossover indicator loaded (20 candle confirmation delay)');
  console.log('🎯 Logic: 1.0=Both Spread MAs above MA200 (Higher spreads) | 0.0=Both below (Lower spreads) | 0.5=Mixed/Unconfirmed');
  console.log('⏱️ Confirmation: Waits 20 candles after crossover before confirming signal');
  console.log('🎮 Controls:');
  console.log('   • Horizontal scroll/zoom: Use MAIN chart');
  console.log('   • Vertical scroll/zoom: Use INDICATOR panel');
  console.log('   • Mouse wheel on indicator: Y-axis zoom');
  console.log('   • Right-click drag on indicator: Y-axis pan');
  console.log('   • Use zoom buttons: +/- for zoom, ⌐ for fit all');
});

// Zoom and navigation functions
function zoomIn() {
  if (window.chart) {
    const timeScale = window.chart.timeScale();
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      const middle = (visibleRange.from + visibleRange.to) / 2;
      const range = visibleRange.to - visibleRange.from;
      const newRange = range * 0.7; // Zoom in by 30%
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
      const newRange = range * 1.3; // Zoom out by 30%
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
  if (window.indicatorChart) {
    window.indicatorChart.timeScale().fitContent();
  }
}

// Advanced TradingView-like mobile touch handling system
function addMobileOptimizations() {
  const chartElement = document.getElementById('main-chart');
  const indicatorElement = document.getElementById('indicator-panel');
  
  if (!chartElement || !indicatorElement) return;
  
  console.log('🚀 Initializing advanced mobile touch system...');
  
  // Touch state tracking
  let touchState = {
    touches: new Map(),
    gestureStartDistance: null,
    gestureStartScale: null,
    lastPinchScale: 1,
    isPinching: false,
    lastTapTime: 0,
    tapCount: 0,
    longPressTimer: null,
    panStartPosition: null,
    isScrolling: false,
    scrollDirection: null
  };
  
  // Enhanced touch handlers for main chart
  setupChartTouchHandlers(chartElement, 'main', touchState);
  setupChartTouchHandlers(indicatorElement, 'indicator', touchState);
  
  // Add mobile-specific chart optimizations
  addMobileChartOptimizations();
  
  // Initialize gesture hints
  setTimeout(() => {
    showGestureHint('👆 Pinch to zoom • 👆👆 Double-tap to fit • ←→ Swipe to scroll');
  }, 2000);
  
  console.log('✅ Advanced mobile touch system initialized');
}

function setupChartTouchHandlers(element, chartType, touchState) {
  const chart = chartType === 'main' ? window.chart : window.indicatorChart;
  
  // Touch start handler
  element.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
    const touches = Array.from(e.touches);
    
    // Clear long press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    // Handle single touch
    if (touches.length === 1) {
      const touch = touches[0];
      touchState.touches.set(touch.identifier, {
        startX: touch.clientX,
        startY: touch.clientY,
        lastX: touch.clientX,
        lastY: touch.clientY,
        startTime: touchStartTime
      });
      
      // Detect double tap
      const currentTime = Date.now();
      if (currentTime - touchState.lastTapTime < 300) {
        touchState.tapCount++;
        if (touchState.tapCount === 2) {
          handleDoubleTap(chartType);
          touchState.tapCount = 0;
        }
      } else {
        touchState.tapCount = 1;
      }
      touchState.lastTapTime = currentTime;
      
      // Set up long press detection
      touchState.longPressTimer = setTimeout(() => {
        handleLongPress(touch, chartType);
      }, 500);
      
    }
    // Handle pinch gesture
    else if (touches.length === 2) {
      touchState.isPinching = true;
      touchState.gestureStartDistance = getTouchDistance(touches[0], touches[1]);
      touchState.gestureStartScale = 1;
      
      touches.forEach(touch => {
        touchState.touches.set(touch.identifier, {
          startX: touch.clientX,
          startY: touch.clientY,
          lastX: touch.clientX,
          lastY: touch.clientY,
          startTime: touchStartTime
        });
      });
      
      showGestureHint('🔍 Pinch to zoom');
    }
    
    e.preventDefault();
  }, { passive: false });
  
  // Touch move handler
  element.addEventListener('touchmove', (e) => {
    const touches = Array.from(e.touches);
    
    // Clear long press timer on move
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    if (touches.length === 1 && !touchState.isPinching) {
      handleSingleTouchMove(touches[0], chartType, touchState);
    }
    else if (touches.length === 2) {
      handlePinchMove(touches, chartType, touchState);
    }
    
    e.preventDefault();
  }, { passive: false });
  
  // Touch end handler
  element.addEventListener('touchend', (e) => {
    const endTime = Date.now();
    const touchDuration = endTime - touchStartTime;
    
    // Clear long press timer
    if (touchState.longPressTimer) {
      clearTimeout(touchState.longPressTimer);
      touchState.longPressTimer = null;
    }
    
    // Handle quick tap (< 200ms)
    if (touchDuration < 200 && touchState.tapCount === 1) {
      handleQuickTap(chartType);
    }
    
    // Reset pinch state
    if (e.touches.length < 2) {
      touchState.isPinching = false;
      touchState.gestureStartDistance = null;
      touchState.lastPinchScale = 1;
    }
    
    // Clean up touch tracking
    Array.from(e.changedTouches).forEach(touch => {
      touchState.touches.delete(touch.identifier);
    });
    
    // Reset scroll state
    touchState.isScrolling = false;
    touchState.scrollDirection = null;
    
    lastTouchEnd = endTime;
  }, { passive: false });
}

function handleSingleTouchMove(touch, chartType, touchState) {
  const touchData = touchState.touches.get(touch.identifier);
  if (!touchData) return;
  
  const deltaX = touch.clientX - touchData.lastX;
  const deltaY = touch.clientY - touchData.lastY;
  const totalDeltaX = Math.abs(touch.clientX - touchData.startX);
  const totalDeltaY = Math.abs(touch.clientY - touchData.startY);
  
  // Determine scroll direction if not already set
  if (!touchState.isScrolling && (totalDeltaX > 10 || totalDeltaY > 10)) {
    touchState.isScrolling = true;
    touchState.scrollDirection = totalDeltaX > totalDeltaY ? 'horizontal' : 'vertical';
  }
  
  if (touchState.isScrolling) {
    if (touchState.scrollDirection === 'horizontal') {
      // Horizontal scrolling - pan time axis
      handleHorizontalPan(deltaX, chartType);
      showGestureHint('📅 Scrolling timeline');
    } else if (chartType === 'indicator') {
      // Vertical scrolling on indicator - pan price axis
      handleVerticalPan(deltaY, chartType);
      showGestureHint('📊 Scrolling price axis');
    }
  }
  
  // Update touch position
  touchData.lastX = touch.clientX;
  touchData.lastY = touch.clientY;
}

function handlePinchMove(touches, chartType, touchState) {
  if (touches.length !== 2) return;
  
  const currentDistance = getTouchDistance(touches[0], touches[1]);
  if (!touchState.gestureStartDistance) return;
  
  const scale = currentDistance / touchState.gestureStartDistance;
  const scaleChange = scale / touchState.lastPinchScale;
  
  // Apply zoom
  if (Math.abs(scaleChange - 1) > 0.01) {
    handlePinchZoom(scaleChange, chartType);
    touchState.lastPinchScale = scale;
    showGestureHint(`🔍 Zoom: ${Math.round(scale * 100)}%`);
  }
}

function handleDoubleTap(chartType) {
  console.log(`📱 Double tap detected on ${chartType} chart`);
  if (chartType === 'main') {
    fitContent();
  } else {
    resetIndicatorScale();
  }
  showGestureHint('🎯 Fit to screen');
}

function handleLongPress(touch, chartType) {
  console.log(`📱 Long press detected on ${chartType} chart`);
  
  // Enable crosshair mode
  const chart = chartType === 'main' ? window.chart : window.indicatorChart;
  if (chart) {
    chart.applyOptions({
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Magnet,
      }
    });
    
    setTimeout(() => {
      chart.applyOptions({
        crosshair: {
          mode: LightweightCharts.CrosshairMode.Normal,
        }
      });
    }, 3000);
  }
  
  showGestureHint('🎯 Crosshair activated');
}

function handleQuickTap(chartType) {
  // Toggle timeframe panels on quick tap
  if (!timeframePanelsVisible) {
    toggleTimeframePanels();
  }
}

function handleHorizontalPan(deltaX, chartType) {
  const chart = chartType === 'main' ? window.chart : window.indicatorChart;
  if (!chart) return;
  
  try {
    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleTimeRange();
    
    if (visibleRange) {
      const rangeSize = visibleRange.to - visibleRange.from;
      const panFactor = deltaX / window.innerWidth;
      const panAmount = rangeSize * panFactor * 0.1;
      
      timeScale.setVisibleTimeRange({
        from: visibleRange.from - panAmount,
        to: visibleRange.to - panAmount
      });
    }
  } catch (error) {
    console.error('Error handling horizontal pan:', error);
  }
}

function handleVerticalPan(deltaY, chartType) {
  const chart = chartType === 'main' ? window.chart : window.indicatorChart;
  if (!chart) return;
  
  try {
    const priceScale = chart.priceScale('right');
    priceScale.applyOptions({ autoScale: false });
    
    // Implement custom vertical panning logic here
    // This is a simplified version - you may need to adjust based on chart library capabilities
    
  } catch (error) {
    console.error('Error handling vertical pan:', error);
  }
}

function handlePinchZoom(scaleChange, chartType) {
  if (scaleChange > 0.98 && scaleChange < 1.02) return; // Ignore very small changes
  
  const chart = chartType === 'main' ? window.chart : window.indicatorChart;
  if (!chart) return;
  
  try {
    const timeScale = chart.timeScale();
    const visibleRange = timeScale.getVisibleTimeRange();
    
    if (visibleRange) {
      const center = (visibleRange.from + visibleRange.to) / 2;
      const currentSize = visibleRange.to - visibleRange.from;
      const newSize = currentSize / scaleChange;
      
      // Limit zoom levels
      const minSize = 3600; // 1 hour minimum
      const maxSize = 86400 * 30; // 30 days maximum
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

function getTouchDistance(touch1, touch2) {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function addMobileChartOptimizations() {
  // Prevent default browser zoom
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());
  
  // Prevent double-tap zoom on iOS
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // Add viewport meta tag enforcement
  const viewport = document.querySelector('meta[name=viewport]');
  if (viewport) {
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=5.0, minimum-scale=0.5, user-scalable=yes, viewport-fit=cover'
    );
  }
  
  // Optimize chart performance for mobile
  if (window.chart) {
    window.chart.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
      kineticScroll: {
        touch: true,
        mouse: false,
      }
    });
  }
  
  if (window.indicatorChart) {
    window.indicatorChart.applyOptions({
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
      },
      kineticScroll: {
        touch: true,
        mouse: false,
      }
    });
  }
  
  console.log('📱 Mobile chart optimizations applied');
}

// Enhanced zoom functions with Y-axis control
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

function resetIndicatorScale() {
  if (window.indicatorChart) {
    window.indicatorChart.priceScale('right').applyOptions({ autoScale: true });
    setTimeout(() => {
      window.indicatorChart.priceScale('right').applyOptions({ autoScale: false });
    }, 100);
  }
}

// Initialize mobile optimizations after charts are loaded
setTimeout(addMobileOptimizations, 1000);

