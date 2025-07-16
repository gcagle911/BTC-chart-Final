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

  setActiveButton(timeframe) {
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.timeframe === timeframe) {
        btn.classList.add('active');
      }
    });
  }

  disableButtons() {
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  enableButtons() {
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.disabled = false;
    });
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

  // MA Crossover - Shows the spread between MA50 and MA100 normalized
  calculateCustomIndicator(dataPoint) {
    const { ma_50, ma_100, ma_200, price } = dataPoint;
    
    // Quick validation
    if (ma_50 === null || ma_100 === null || ma_200 === null || price === null) {
      return null;
    }
    
    // Skip during initial load to improve performance
    if (this.isInitialLoad) {
      return 0.5; // Return neutral during loading
    }
    
    // Initialize state for spread tracking
    if (!this.indicatorState) {
      this.indicatorState = {
        lastSpreadColor: '#26a69a',
        spreadHistory: []
      };
    }
    
    // Calculate the actual spread between MA50 and MA100
    const spread = ma_50 - ma_100;
    const spreadPercentage = (spread / price) * 100; // Convert to percentage of price
    
    // Store spread history for dynamic scaling (keep last 100 values)
    this.indicatorState.spreadHistory.push(spreadPercentage);
    if (this.indicatorState.spreadHistory.length > 100) {
      this.indicatorState.spreadHistory.shift();
    }
    
    // Calculate dynamic range for normalization
    const recentSpreads = this.indicatorState.spreadHistory.slice(-50); // Last 50 values
    const maxSpread = Math.max(...recentSpreads);
    const minSpread = Math.min(...recentSpreads);
    const spreadRange = maxSpread - minSpread;
    
    // Normalize to 0-1 range with some padding to avoid extremes
    let normalizedValue = 0.5; // Default to middle
    if (spreadRange > 0) {
      normalizedValue = (spreadPercentage - minSpread) / spreadRange;
      // Add some padding to prevent hitting exact 0 or 1
      normalizedValue = Math.max(0.05, Math.min(0.95, normalizedValue));
    }
    
    // Determine color based on MA50 vs MA100 relationship and trend strength
    if (spread > 0) {
      // MA50 above MA100 - bullish
      if (spreadPercentage > 0.1) {
        this.indicatorState.lastSpreadColor = '#00ff00'; // Strong green
      } else if (spreadPercentage > 0.05) {
        this.indicatorState.lastSpreadColor = '#26a69a'; // Medium green
      } else {
        this.indicatorState.lastSpreadColor = '#66bb6a'; // Light green
      }
    } else {
      // MA50 below MA100 - bearish
      if (spreadPercentage < -0.1) {
        this.indicatorState.lastSpreadColor = '#ff4444'; // Strong red
      } else if (spreadPercentage < -0.05) {
        this.indicatorState.lastSpreadColor = '#ef5350'; // Medium red
      } else {
        this.indicatorState.lastSpreadColor = '#ffab91'; // Light red
      }
    }
    
    // Store the actual spread value for status display
    this.indicatorState.currentSpread = spreadPercentage;
    
    return normalizedValue;
  }

  // Update spread status display (ultra-light)
  updateSpreadStatus(data) {
    if (data.length === 0 || !this.indicatorState || this.isInitialLoad) return;
    
    // Skip during heavy processing
    if (data.length > 5000) return;
    
    // Use the actual calculated spread value
    const spreadValue = this.indicatorState.currentSpread;
    
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
    
    if (spreadElement && spreadValue !== null && spreadValue !== undefined) {
      // Show spread as percentage with proper sign
      const sign = spreadValue >= 0 ? '+' : '';
      spreadElement.textContent = `${sign}${spreadValue.toFixed(3)}%`;
      spreadElement.style.color = this.indicatorState.lastSpreadColor;
    }
    
    if (statusElement && this.indicatorState && this.rawData.length > 0) {
      // Get latest MA data to determine current status
      const latest = this.rawData[this.rawData.length - 1];
      if (latest && latest.ma_50 !== null && latest.ma_100 !== null && latest.ma_200 !== null) {
        const spread = latest.ma_50 - latest.ma_100;
        
        let statusText;
        if (spread > 0) {
          if (spreadValue > 0.1) {
            statusText = "STRONG BULLISH - MA50 >> MA100";
          } else if (spreadValue > 0.05) {
            statusText = "BULLISH - MA50 > MA100";
          } else {
            statusText = "WEAK BULLISH - MA50 ≈ MA100";
          }
        } else {
          if (spreadValue < -0.1) {
            statusText = "STRONG BEARISH - MA50 << MA100";
          } else if (spreadValue < -0.05) {
            statusText = "BEARISH - MA50 < MA100";
          } else {
            statusText = "WEAK BEARISH - MA50 ≈ MA100";
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
    this.disableButtons();
    
    console.log(`🔄 Switching to ${timeframe} timeframe - ensuring perfect alignment`);
    
    const oldTimeframe = this.currentTimeframe;
    this.currentTimeframe = timeframe;
    this.setActiveButton(timeframe);
    
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
    this.enableButtons();
    
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
  
  // Setup the MA50-MA100 Spread Indicator
  setupCustomIndicator({
    type: 'line',
    title: 'MA50-MA100 Spread',
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
  
  console.log('📊 MA50-MA100 Spread indicator loaded');
  console.log('🎯 Logic: Shows normalized spread between MA50 and MA100');
  console.log('🎯 Above middle = MA50 > MA100 (Bullish) | Below middle = MA50 < MA100 (Bearish)');
  console.log('🎮 Controls:');
  console.log('   • Horizontal scroll/zoom: Use MAIN chart');
  console.log('   • Vertical scroll/zoom: Use INDICATOR panel');
  console.log('   • Mouse wheel on indicator: Y-axis zoom');
  console.log('   • Right-click drag on indicator: Y-axis pan');
});

