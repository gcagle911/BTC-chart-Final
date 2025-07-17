// Main chart setup
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
      top: 0.01,
      bottom: 0.01,
    },
    borderVisible: false,
  },
  leftPriceScale: { 
    visible: true,
    scaleMargins: {
      top: 0.01,
      bottom: 0.01,
    },
    borderVisible: false,
  },
  timeScale: { 
    timeVisible: true, 
    secondsVisible: false,
    borderVisible: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
  },
});

const priceSeries = chart.addCandlestickSeries({
  priceScaleId: 'right',
  upColor: '#26a69a',
  downColor: '#ef5350',
  borderVisible: false,
  wickUpColor: '#26a69a',
  wickDownColor: '#ef5350',
});

const ma50 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ffffff',
  lineWidth: 1,
});

const ma100 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ffd700',
  lineWidth: 1,
});

const ma200 = chart.addLineSeries({
  priceScaleId: 'left',
  color: '#ff69b4',
  lineWidth: 1,
});

// Indicator panel setup - X-axis locked, Y-axis independent
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
    autoScale: true, // Allow Y-axis auto-scaling
    entireTextOnly: false,
    ticksVisible: true,
    mode: LightweightCharts.PriceScaleMode.Normal,
  },
  timeScale: { 
    visible: false, // Hide to avoid confusion - follows main chart
    borderVisible: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
  },
  handleScroll: {
    mouseWheel: true,     // Enable mouse wheel for Y-axis
    pressedMouseMove: true, // Enable drag for Y-axis
    horzTouchDrag: false,  // Disable horizontal touch drag
    vertTouchDrag: true,   // Enable vertical touch drag
  },
  handleScale: {
    mouseWheel: true,      // Enable Y-axis zoom with mouse wheel
    pinch: true,           // Enable pinch zoom for Y-axis
    axisPressedMouseMove: {
      time: false,         // Disable X-axis drag
      price: true,         // Enable Y-axis drag
    },
    axisDoubleClickReset: {
      time: false,         // Disable X-axis reset
      price: true,         // Enable Y-axis reset
    },
  },
});

// Custom indicator series and reference lines
let customIndicatorSeries = null;
let topReferenceLine = null;
let middleReferenceLine = null;
let bottomReferenceLine = null;

// Timeframe management
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

  // Aggregate data maintaining full MA technical accuracy and create OHLC
  aggregateData(data, timeframeSeconds) {
    // For 1-minute data, create OHLC from price data
    if (timeframeSeconds === 60) {
      return data.map(item => ({
        ...item,
        open: item.open || item.price,
        high: item.high || item.price,
        low: item.low || item.price,
        close: item.close || item.price
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
        ma_200: item.ma_200
      });
    });

    // Convert buckets maintaining MA technical accuracy
    for (const [bucketTime, bucket] of buckets) {
      if (bucket.dataPoints.length > 0) {
        // Sort by timestamp
        bucket.dataPoints.sort((a, b) => a.timestamp - b.timestamp);
        
        // For price: Use proper OHLC aggregation
        const openPoint = bucket.dataPoints[0];
        const closePoint = bucket.dataPoints[bucket.dataPoints.length - 1];
        const highPrice = Math.max(...bucket.dataPoints.map(p => p.price));
        const lowPrice = Math.min(...bucket.dataPoints.map(p => p.price));
        
        // For MAs: Use the MA value at the close time of the timeframe period
        // This maintains the technical accuracy of the MA calculations
        // The MA at the close represents the true MA value for that timeframe period
        const closeMAs = closePoint;
        
        // Alternative approach: For maximum accuracy, we could interpolate or use
        // the MA value that best represents the timeframe, but using close time
        // is the standard professional approach
        
        // CRITICAL: Use consistent bucket timestamp for all timeframes
        const bucketTimestamp = new Date(bucketTime * 1000).toISOString();
        
        aggregated.push({
          time: bucketTimestamp, // Consistent bucket timestamp
          // OHLC price data
          price: closePoint.price, // Close price for line chart
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: closePoint.price,
          
          // MAs maintain their original technical calculation accuracy
          // These are the actual MA values calculated from full 1-minute granularity
          // at the close of each timeframe period
          ma_50: closeMAs.ma_50,
          ma_100: closeMAs.ma_100,
          ma_200: closeMAs.ma_200,
          
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
    const aggregatedData = this.aggregateData(data, timeframeSeconds);

    const priceData = [];
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];
    const indicatorData = [];

    // Set loading flag to skip heavy indicator calculations during initial load
    if (!isUpdate && aggregatedData.length > 1000) {
      this.isInitialLoad = true;
    }

    // Process all data points and ensure perfect timestamp alignment
    for (let i = 0; i < aggregatedData.length; i++) {
      const d = aggregatedData[i];
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) continue;
      
      // CRITICAL: Create all data points with IDENTICAL timestamps
      const sharedTime = t; // Ensure all series use the exact same timestamp
      
      // Price data (main chart)
      priceData.push({ 
        time: sharedTime, 
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close)
      });
      
      // MA data (main chart)
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
      
      // Indicator data (bottom chart) - MUST use identical timestamp
      const indicatorValue = this.calculateCustomIndicator(d);
      if (indicatorValue !== null) {
        indicatorData.push({ 
          time: sharedTime, // EXACT same timestamp as price data
          value: indicatorValue
        });
      }
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    }

    // Log timestamp alignment for debugging
    if (priceData.length > 0 && indicatorData.length > 0) {
      const priceStart = priceData[0].time;
      const priceEnd = priceData[priceData.length - 1].time;
      const indicatorStart = indicatorData[0].time;
      const indicatorEnd = indicatorData[indicatorData.length - 1].time;
      
      console.log(`🕐 ${this.currentTimeframe} Timestamp Alignment:`);
      console.log(`   Price Data: ${priceData.length} points | ${new Date(priceStart * 1000).toISOString()} → ${new Date(priceEnd * 1000).toISOString()}`);
      console.log(`   Indicator Data: ${indicatorData.length} points | ${new Date(indicatorStart * 1000).toISOString()} → ${new Date(indicatorEnd * 1000).toISOString()}`);
      console.log(`   Perfect Match: ${priceStart === indicatorStart && priceEnd === indicatorEnd ? '✅ YES' : '❌ NO'}`);
      
      // Show sample timestamps for verification
      if (priceData.length >= 3 && indicatorData.length >= 3) {
        console.log(`   Sample timestamps:`);
        for (let i = 0; i < Math.min(3, priceData.length); i++) {
          const pTime = priceData[i].time;
          const iTime = indicatorData[i] ? indicatorData[i].time : 'MISSING';
          const match = pTime === iTime ? '✅' : '❌';
          console.log(`     [${i}] Price: ${new Date(pTime * 1000).toISOString()} | Indicator: ${iTime !== 'MISSING' ? new Date(iTime * 1000).toISOString() : 'MISSING'} ${match}`);
        }
      }
    }

    // Clear loading flag
    this.isInitialLoad = false;

    if (isUpdate) {
      // Add new data points
      priceData.forEach(p => priceSeries.update(p));
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
      this.updateSpreadStatus(aggregatedData);
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

  // Volatility Indicator - Spread MA Crossover with Meaningful Signal Filtering
  calculateCustomIndicator(dataPoint) {
    const { ma_50, ma_100, ma_200 } = dataPoint;
    
    // Quick validation
    if (ma_50 === null || ma_100 === null || ma_200 === null) {
      return null;
    }
    
    // Skip during initial load to improve performance
    if (this.isInitialLoad) {
      return 0.0; // Return low volatility during loading
    }
    
    // Initialize volatility state tracking
    if (!this.indicatorState) {
      this.indicatorState = {
        lastSpreadColor: '#26a69a',
        crossoverHistory: [],
        confirmedState: 0.0, // Start with low volatility
        pendingCross: null,
        candlesSinceCross: 0,
        lastMA50: null,
        lastMA100: null,
        lastMA200: null,
        crossoverStartTime: null
      };
    }
    
    // VOLATILITY LOGIC: MA50 & MA100 vs MA200 crossovers
    const ma50AboveMA200 = ma_50 > ma_200;
    const ma100AboveMA200 = ma_100 > ma_200;
    
    // Current volatility state based on crossovers (BINARY ONLY)
    let currentVolatilityState;
    if (ma50AboveMA200 && ma100AboveMA200) {
      currentVolatilityState = 1.0; // HIGH VOLATILITY (Both above baseline)
    } else {
      currentVolatilityState = 0.0; // LOW VOLATILITY (Both below or mixed)
    }
    
    // Track current data point for crossover analysis
    this.indicatorState.crossoverHistory.push({
      ma50: ma_50,
      ma100: ma_100,
      ma200: ma_200,
      ma50Above: ma50AboveMA200,
      ma100Above: ma100AboveMA200,
      volatilityState: currentVolatilityState,
      timestamp: Date.now()
    });
    
    // Keep rolling history for crossover rate analysis
    if (this.indicatorState.crossoverHistory.length > 50) {
      this.indicatorState.crossoverHistory.shift();
    }
    
    // Detect crossover events and apply filters
    const previousConfirmedState = this.indicatorState.confirmedState;
    
    // Check for new crossover (state change from confirmed state)
    if (currentVolatilityState !== previousConfirmedState && !this.indicatorState.pendingCross) {
      
      // FILTER 1: Calculate Rate of Crossover (speed matters)
      const crossoverRate = this.calculateCrossoverRate();
      
      // FILTER 2: Calculate Distance Between MAs (gap significance)
      const maDistance = this.calculateMADistance(ma_50, ma_100, ma_200);
      
      // FILTER 3: Check Absolute Thresholds (meaningful levels)
      const meaningfulThresholds = this.checkMeaningfulThresholds(ma_50, ma_100, ma_200);
      
      // FILTER 4: Calculate current duration in target state
      const duration = this.calculateCrossoverDuration(currentVolatilityState);
      
      // Calculate overall signal strength including duration
      const signalStrength = this.calculateSignalStrength(crossoverRate, maDistance, meaningfulThresholds, duration);
      
      // Dynamic threshold based on timeframe (shorter timeframes more tolerant)
      const strengthThreshold = this.getStrengthThreshold();
      
      // Only proceed if signal meets minimum strength threshold
      if (signalStrength > strengthThreshold) {
        
        // Calculate dynamic confirmation period based on signal quality
        const confirmationPeriod = this.calculateConfirmationPeriod(signalStrength, crossoverRate);
        
        this.indicatorState.pendingCross = {
          targetState: currentVolatilityState,
          startCandle: this.indicatorState.crossoverHistory.length - 1,
          candlesRequired: confirmationPeriod,
          signalStrength: signalStrength,
          crossoverRate: crossoverRate,
          maDistance: maDistance,
          meaningfulThresholds: meaningfulThresholds,
          duration: duration
        };
        this.indicatorState.candlesSinceCross = 1;
        this.indicatorState.crossoverStartTime = Date.now();
        
        const direction = currentVolatilityState === 1.0 ? 'HIGH VOLATILITY' : 'LOW VOLATILITY';
        console.log(`🌊 VOLATILITY CROSSOVER detected: ${direction}`);
        console.log(`   Signal Strength: ${signalStrength.toFixed(3)} (threshold: ${strengthThreshold.toFixed(3)})`);
        console.log(`   Crossover Rate: ${crossoverRate.toFixed(4)}`);
        console.log(`   MA Distance: ${maDistance.toFixed(4)}`);
        console.log(`   Meaningful Levels: ${meaningfulThresholds.toFixed(3)}`);
        console.log(`   Duration: ${duration} candles`);
        console.log(`   Confirmation Required: ${confirmationPeriod} candles`);
      } else {
        console.log(`🚫 Weak volatility signal ignored (strength: ${signalStrength.toFixed(3)}, threshold: ${strengthThreshold.toFixed(3)})`);
      }
    }
    
    // Process pending crossover confirmation
    if (this.indicatorState.pendingCross) {
      this.indicatorState.candlesSinceCross++;
      
      // Check if crossover still valid
      if (currentVolatilityState === this.indicatorState.pendingCross.targetState) {
        // Still valid, check if confirmed
        if (this.indicatorState.candlesSinceCross >= this.indicatorState.pendingCross.candlesRequired) {
          // CONFIRMATION COMPLETE
          this.indicatorState.confirmedState = this.indicatorState.pendingCross.targetState;
          
          const direction = this.indicatorState.confirmedState === 1.0 ? 'HIGH VOLATILITY' : 'LOW VOLATILITY';
          const elapsedTime = Math.round((Date.now() - this.indicatorState.crossoverStartTime) / 1000);
          
          console.log(`✅ VOLATILITY CONFIRMED: ${direction} after ${this.indicatorState.candlesSinceCross} candles (${elapsedTime}s)`);
          console.log(`   Final Signal Strength: ${this.indicatorState.pendingCross.signalStrength.toFixed(3)}`);
          
          // Clear pending state
          this.indicatorState.pendingCross = null;
          this.indicatorState.candlesSinceCross = 0;
          this.indicatorState.crossoverStartTime = null;
          
        } else {
          // Still waiting for confirmation
          const remaining = this.indicatorState.pendingCross.candlesRequired - this.indicatorState.candlesSinceCross;
          if (remaining % 5 === 0 || remaining <= 3) {
            console.log(`⏳ Volatility confirmation: ${this.indicatorState.candlesSinceCross}/${this.indicatorState.pendingCross.candlesRequired} candles (${remaining} remaining)`);
          }
        }
      } else {
        // Crossover invalidated
        console.log(`❌ VOLATILITY CROSSOVER INVALIDATED after ${this.indicatorState.candlesSinceCross} candles`);
        this.indicatorState.pendingCross = null;
        this.indicatorState.candlesSinceCross = 0;
        this.indicatorState.crossoverStartTime = null;
      }
    }
    
    // Update indicator line color
    this.updateIndicatorLineColor(ma_50, ma_100, ma_200);
    
    // Update spread color for status display
    this.updateSpreadColorIndicator(ma_50, ma_100, ma_200);
    
    // Store current values for next iteration
    this.indicatorState.lastMA50 = ma_50;
    this.indicatorState.lastMA100 = ma_100;
    this.indicatorState.lastMA200 = ma_200;
    
    return this.indicatorState.confirmedState;
  }

  // Update spread color for status display
  updateSpreadColorIndicator(ma_50, ma_100, ma_200) {
    // Color coding based on spread levels
    if (ma_50 > 0.03) {
      this.indicatorState.lastSpreadColor = '#ff4444'; // Red - High spread
    } else if (ma_50 > 0.02) {
      this.indicatorState.lastSpreadColor = '#ff8800'; // Orange - Medium-high spread
    } else if (ma_50 > 0.01) {
      this.indicatorState.lastSpreadColor = '#ffcc00'; // Yellow - Medium spread
    } else {
      this.indicatorState.lastSpreadColor = '#26a69a'; // Green - Low spread
    }
  }

  // FILTER 1: Calculate Rate of Crossover (speed of MA movement)
  calculateCrossoverRate() {
    if (this.indicatorState.crossoverHistory.length < 5) return 0.001; // Default for insufficient data
    
    const recent = this.indicatorState.crossoverHistory.slice(-5);
    let totalMA50Change = 0;
    let totalMA100Change = 0;
    
    for (let i = 1; i < recent.length; i++) {
      totalMA50Change += Math.abs(recent[i].ma50 - recent[i-1].ma50);
      totalMA100Change += Math.abs(recent[i].ma100 - recent[i-1].ma100);
    }
    
    const avgMA50Rate = totalMA50Change / (recent.length - 1);
    const avgMA100Rate = totalMA100Change / (recent.length - 1);
    const averageRate = (avgMA50Rate + avgMA100Rate) / 2;
    
    return averageRate;
  }

  // FILTER 2: Calculate Distance Between MAs (gap significance)
  calculateMADistance(ma_50, ma_100, ma_200) {
    const gap50_200 = Math.abs(ma_50 - ma_200);
    const gap100_200 = Math.abs(ma_100 - ma_200);
    const averageGap = (gap50_200 + gap100_200) / 2;
    
    return averageGap;
  }

  // FILTER 3: Check Absolute Thresholds (most significant)
  checkMeaningfulThresholds(ma_50, ma_100, ma_200) {
    let score = 0;
    
    // Primary thresholds (most important)
    if (ma_50 >= 0.03) score += 2;
    if (ma_100 >= 0.03) score += 2;
    
    // Secondary threshold (slower, less weighted)
    if (ma_200 >= 2.5) score += 1;
    
    // Normalize to 0-1 scale (max possible score = 5)
    return Math.min(score / 5, 1.0);
  }

  // FILTER 4: Calculate Duration of Crossover
  calculateCrossoverDuration(targetState) {
    if (this.indicatorState.crossoverHistory.length < 3) return 0;
    
    let consecutiveCount = 0;
    const history = this.indicatorState.crossoverHistory;
    
    // Count consecutive candles in target state from end
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].volatilityState === targetState) {
        consecutiveCount++;
      } else {
        break;
      }
    }
    
    return consecutiveCount;
  }

  // Calculate Overall Signal Strength with proper weighting
  calculateSignalStrength(crossoverRate, maDistance, meaningfulThresholds, duration = 0) {
    // Normalize rate of change (higher = better)
    const normalizedRate = Math.min(crossoverRate / 0.01, 1.0); // 0.01 = very fast
    
    // Normalize MA distance (higher = better) 
    const normalizedDistance = Math.min(maDistance / 0.02, 1.0); // 0.02 = significant gap
    
    // Normalize duration (more time = better, but diminishing returns)
    const normalizedDuration = Math.min(duration / 10, 1.0); // 10 candles = good duration
    
    // Weighted signal strength calculation
    const signalStrength = (
      meaningfulThresholds * 0.4 +    // 40% - Most significant (MA absolute values)
      normalizedRate * 0.3 +          // 30% - Second most significant (speed)
      normalizedDuration * 0.2 +      // 20% - Significant but dynamic (time)
      normalizedDistance * 0.1        // 10% - Least significant (gap size)
    );
    
    return Math.min(signalStrength, 1.0);
  }

  // Calculate Adaptive Confirmation Period
  calculateConfirmationPeriod(signalStrength, crossoverRate) {
    // Base confirmation periods by timeframe
    const baseConfirmation = {
      '1m': 15,
      '5m': 10, 
      '15m': 6,
      '1h': 4,
      '4h': 3,
      '1d': 2
    };
    
    const base = baseConfirmation[this.currentTimeframe] || 15;
    
    // Adaptive multiplier based on signal strength
    let multiplier;
    if (signalStrength > 0.8) {
      multiplier = 0.3; // Very strong signal = 30% of base time
    } else if (signalStrength > 0.6) {
      multiplier = 0.5; // Strong signal = 50% of base time
    } else if (signalStrength > 0.4) {
      multiplier = 1.0; // Medium signal = normal time
    } else if (signalStrength > 0.2) {
      multiplier = 2.0; // Weak signal = 200% of base time
    } else {
      multiplier = 4.0; // Very weak signal = 400% of base time
    }
    
    // Additional adjustment for crossover rate
    if (crossoverRate > 0.005) {
      multiplier *= 0.8; // Fast crossover = reduce time needed
    } else if (crossoverRate < 0.001) {
      multiplier *= 1.5; // Slow crossover = increase time needed
    }
    
    const finalPeriod = Math.max(2, Math.round(base * multiplier));
    return Math.min(finalPeriod, 50); // Cap at 50 candles max
  }

  // Get dynamic strength threshold based on timeframe
  getStrengthThreshold() {
    const thresholds = {
      '1m': 0.25,   // More tolerant on 1-minute (noisy but responsive)
      '5m': 0.35,   // Moderate filtering
      '15m': 0.45,  // Stricter filtering
      '1h': 0.55,   // Much stricter (less noise tolerance)
      '4h': 0.65,   // Very strict
      '1d': 0.75    // Extremely strict
    };
    
    return thresholds[this.currentTimeframe] || 0.35;
  }

  // Update indicator line color based on volatility state and MA levels
  updateIndicatorLineColor(ma_50, ma_100, ma_200) {
    if (!customIndicatorSeries) return;
    
    // Color based on confirmed volatility state and threshold breaches
    const allMAsAbove003 = ma_50 > 0.03 && ma_100 > 0.03 && ma_200 > 0.03;
    const confirmedHighVolatility = this.indicatorState.confirmedState === 1.0;
    
    let newColor;
    if (confirmedHighVolatility && allMAsAbove003) {
      newColor = '#ff0000'; // Bright red - High volatility + significant levels
    } else if (confirmedHighVolatility) {
      newColor = '#ff8800'; // Orange - High volatility
    } else if (allMAsAbove003) {
      newColor = '#ffff00'; // Yellow - Significant levels but low volatility
    } else {
      newColor = '#00ff00'; // Green - Low volatility, normal levels
    }
    
    // Only update if color changed
    if (!this.lastIndicatorColor || newColor !== this.lastIndicatorColor) {
      customIndicatorSeries.applyOptions({
        color: newColor
      });
      this.lastIndicatorColor = newColor;
      
      console.log(`🎨 Volatility indicator color: ${newColor} (volatility: ${confirmedHighVolatility ? 'HIGH' : 'LOW'}, significant levels: ${allMAsAbove003})`);
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
        const bothAbove = ma50AboveMA200 && ma100AboveMA200;
        
        let statusText;
        
        // Check if we're in a pending confirmation period
        if (this.indicatorState.pendingCross) {
          const remaining = this.indicatorState.pendingCross.candlesRequired - this.indicatorState.candlesSinceCross;
          const targetDirection = this.indicatorState.pendingCross.targetState === 1.0 ? 'HIGH VOLATILITY' : 'LOW VOLATILITY';
          statusText = `CONFIRMING ${targetDirection} (${remaining} candles left)`;
        } else {
          // Show confirmed volatility state
          if (this.indicatorState.confirmedState === 1.0) {
            statusText = bothAbove ? "HIGH VOLATILITY CONFIRMED" : "HIGH VOLATILITY (crossover invalidated)";
          } else {
            statusText = !bothAbove ? "LOW VOLATILITY CONFIRMED" : "LOW VOLATILITY (crossover invalidated)";
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
  
  // Setup the Volatility Indicator
  setupCustomIndicator({
    type: 'line',
    title: 'Volatility Indicator (Spread MA Crossover)',
    color: '#00ff00',
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
  
  console.log('🌊 VOLATILITY INDICATOR loaded with adaptive confirmation');
  console.log('🎯 Logic: 1.0=HIGH VOLATILITY (MA50&100 above MA200) | 0.0=LOW VOLATILITY (MA50&100 below MA200)');
  console.log('🔍 Filters: MA thresholds (40%) + Rate of change (30%) + Duration (20%) + Distance (10%)');
  console.log('⚡ Adaptive Confirmation: Strong signals confirmed faster, weak signals take longer');
  console.log('📊 Timeframe scaling: 1m=noisy/responsive → 1d=strict/filtered');
  console.log('🎮 Controls:');
  console.log('   • Horizontal scroll/zoom: Use MAIN chart');
  console.log('   • Vertical scroll/zoom: Use INDICATOR panel');
  console.log('   • Mouse wheel on indicator: Y-axis zoom');
  console.log('   • Right-click drag on indicator: Y-axis pan');
});

