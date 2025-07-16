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

// Indicator panel setup
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
      top: 0.1,
      bottom: 0.1,
    },
    borderVisible: false,
  },
  timeScale: { 
    visible: false, // Hide to avoid duplication - sync with main chart
    borderVisible: false,
  },
  crosshair: {
    mode: LightweightCharts.CrosshairMode.Normal,
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
        
        aggregated.push({
          time: new Date(bucketTime * 1000).toISOString(),
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
          ma_200: closeMAs.ma_200
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

    aggregatedData.forEach(d => {
      const t = this.toUnixTimestamp(d.time);
      
      // For updates, only add new data
      if (isUpdate && t <= this.lastTimestamp) return;
      
      // Maintain full precision OHLC data for candlesticks
      priceData.push({ 
        time: t, 
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close)
      });
      
      if (d.ma_50 !== null && d.ma_50 !== undefined) {
        ma50Data.push({ 
          time: t, 
          value: parseFloat(d.ma_50) 
        });
      }
      
      if (d.ma_100 !== null && d.ma_100 !== undefined) {
        ma100Data.push({ 
          time: t, 
          value: parseFloat(d.ma_100) 
        });
      }
      
      if (d.ma_200 !== null && d.ma_200 !== undefined) {
        ma200Data.push({ 
          time: t, 
          value: parseFloat(d.ma_200) 
        });
      }
      
      // Only calculate indicator for last 100 points during initial load
      if (!this.isInitialLoad || indicatorData.length < 100) {
        const indicatorValue = this.calculateCustomIndicator(d);
        if (indicatorValue !== null) {
          indicatorData.push({ 
            time: t, 
            value: indicatorValue
          });
        }
      }
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    });

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
        
        // Update reference lines to maintain sync
        if (topReferenceLine) {
          indicatorData.forEach(p => topReferenceLine.update({ time: p.time, value: 1.0 }));
        }
        if (middleReferenceLine) {
          indicatorData.forEach(p => middleReferenceLine.update({ time: p.time, value: 0.5 }));
        }
        if (bottomReferenceLine) {
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
    
    // Force time scale sync for perfect alignment
    this.syncTimeScales();
  }

  // Helper to set reference lines only once
  setReferenceLinesOnce(indicatorData) {
    if (this.referenceLinesSet) return;
    
    if (topReferenceLine && indicatorData.length > 0) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 1.0 }));
      topReferenceLine.setData(refData);
    }
    if (middleReferenceLine && indicatorData.length > 0) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 0.5 }));
      middleReferenceLine.setData(refData);
    }
    if (bottomReferenceLine && indicatorData.length > 0) {
      const refData = indicatorData.map(d => ({ time: d.time, value: 0.0 }));
      bottomReferenceLine.setData(refData);
    }
    
    this.referenceLinesSet = true;
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

  // MA Crossover - Immediate Response (optimized)
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
    
    // Initialize state for spread color tracking
    if (!this.indicatorState) {
      this.indicatorState = {
        lastSpreadColor: '#26a69a'
      };
    }
    
    // Determine current MA positioning - immediate response
    const ma50AboveMA200 = ma_50 > ma_200;
    const ma100AboveMA200 = ma_100 > ma_200;
    
    let positionValue;
    if (ma50AboveMA200 && ma100AboveMA200) {
      positionValue = 1.0; // Both above - top
    } else if (!ma50AboveMA200 && !ma100AboveMA200) {
      positionValue = 0.0; // Both below - bottom
    } else {
      positionValue = 0.5; // Mixed - middle
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
    
    return positionValue;
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
        if (ma50AboveMA200 && ma100AboveMA200) {
          statusText = "BULLISH - Both MAs Above";
        } else if (!ma50AboveMA200 && !ma100AboveMA200) {
          statusText = "BEARISH - Both MAs Below";
        } else {
          statusText = "MIXED - MAs Diverging";
        }
        
        statusElement.textContent = statusText;
        statusElement.style.color = this.indicatorState.lastSpreadColor;
      } else {
        statusElement.textContent = "LOADING...";
      }
    }
  }

  // Sync time scales between charts for perfect alignment
  syncTimeScales() {
    try {
      const mainTimeScale = chart.timeScale();
      const indicatorTimeScale = indicatorChart.timeScale();
      
      // Sync both logical and time ranges for perfect alignment
      const visibleLogicalRange = mainTimeScale.getVisibleLogicalRange();
      const visibleTimeRange = mainTimeScale.getVisibleTimeRange();
      
      if (visibleLogicalRange) {
        indicatorTimeScale.setVisibleLogicalRange(visibleLogicalRange);
      }
      
      if (visibleTimeRange) {
        indicatorTimeScale.setVisibleTimeRange(visibleTimeRange);
      }
      
      // Ensure both charts have the same time scale settings
      indicatorTimeScale.applyOptions({
        timeVisible: false,
        borderVisible: false,
        rightOffset: mainTimeScale.options().rightOffset || 0,
        barSpacing: mainTimeScale.options().barSpacing || undefined
      });
      
    } catch (err) {
      // Silent fail for sync issues
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
    
    console.log(`🔄 Switching to ${timeframe} timeframe with full MA technical accuracy`);
    
    this.currentTimeframe = timeframe;
    this.setActiveButton(timeframe);
    
    // Reprocess data with new timeframe
    // Important: MAs maintain their original 1-minute calculation accuracy
    // We sample the MA values at timeframe close points, not re-calculate them
    this.lastTimestamp = 0; // Reset to reprocess all data
    this.processAndSetData(this.rawData);
    
    // Force perfect synchronization after timeframe switch
    setTimeout(() => {
      this.syncTimeScales();
      console.log('🔗 Timeframe sync complete');
    }, 200);
    
    this.hideLoading();
    this.enableButtons();
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label} - Charts synchronized`);
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

// Setup perfect chart synchronization
function setupChartSync() {
  // Sync main chart to indicator chart
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    try {
      const mainRange = chart.timeScale().getVisibleTimeRange();
      if (mainRange) {
        indicatorChart.timeScale().setVisibleTimeRange(mainRange);
      }
    } catch (e) {
      // Silent fail
    }
  });

  // Sync indicator chart to main chart  
  indicatorChart.timeScale().subscribeVisibleTimeRangeChange(() => {
    try {
      const indicatorRange = indicatorChart.timeScale().getVisibleTimeRange();
      if (indicatorRange) {
        chart.timeScale().setVisibleTimeRange(indicatorRange);
      }
    } catch (e) {
      // Silent fail
    }
  });

  // Sync crosshair movements
  chart.subscribeCrosshairMove((param) => {
    if (param.time) {
      indicatorChart.setCrosshairPosition(param.point?.x || 0, param.time, true);
    }
  });

  indicatorChart.subscribeCrosshairMove((param) => {
    if (param.time) {
      chart.setCrosshairPosition(param.point?.x || 0, param.time, true);
    }
  });
}

// Initialize chart and start update cycle
timeframeManager.initializeChart().then(() => {
  timeframeManager.startUpdateCycle();
  setupChartSync();
  
  // Setup the immediate MA Crossover Indicator
  setupCustomIndicator({
    type: 'line',
    title: 'MA Crossover (Immediate)',
    color: '#00d4ff',
    lineWidth: 3,
    calculate: timeframeManager.calculateCustomIndicator.bind(timeframeManager)
  });
  
  // Force initial synchronization
  setTimeout(() => {
    timeframeManager.syncTimeScales();
    console.log('🔗 Charts synchronized for correlation analysis');
  }, 500);
  
  console.log('📊 Immediate MA Crossover indicator active!');
  console.log('🎯 Logic: Top(1.0)=Both MAs above MA200 | Bottom(0.0)=Both below | Middle(0.5)=Mixed');
});

