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
    visible: false, // Hide time scale to sync with main chart
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

  // Process and set chart data with high precision
  processAndSetData(data, isUpdate = false) {
    const timeframeSeconds = this.timeframes[this.currentTimeframe].seconds;
    const aggregatedData = this.aggregateData(data, timeframeSeconds);

    const priceData = [];
    const ma50Data = [];
    const ma100Data = [];
    const ma200Data = [];
    const indicatorData = [];

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
      
      // Process custom indicator data (simplified)
      const indicatorValue = this.calculateCustomIndicator(d);
      if (indicatorValue !== null) {
        indicatorData.push({ 
          time: t, 
          value: indicatorValue
        });
      }
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    });

    if (isUpdate) {
      // Add new data points with precision
      priceData.forEach(p => priceSeries.update(p));
      ma50Data.forEach(p => ma50.update(p));
      ma100Data.forEach(p => ma100.update(p));
      ma200Data.forEach(p => ma200.update(p));
      
      // Update indicator panel
      if (customIndicatorSeries && indicatorData.length > 0) {
        indicatorData.forEach(p => customIndicatorSeries.update(p));
      }
    } else {
      // Set complete dataset with precision
      priceSeries.setData(priceData);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
      
      // Set indicator panel data
      if (customIndicatorSeries && indicatorData.length > 0) {
        customIndicatorSeries.setData(indicatorData);
        
        // Set reference lines
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
      }
    }

    // Update spread status display
    this.updateSpreadStatus(aggregatedData);
    
    // Sync time scales between main chart and indicator panel
    this.syncTimeScales();

    // Log technical accuracy info for debugging
    if (aggregatedData.length > 0) {
      const sample = aggregatedData[aggregatedData.length - 1];
      const totalPoints = aggregatedData.length;
      console.log(`📊 ${this.currentTimeframe} Technical Analysis:`, {
        timeframe: this.timeframes[this.currentTimeframe].label,
        totalPeriods: totalPoints,
        ohlc: {
          open: sample.open,
          high: sample.high,
          low: sample.low,
          close: sample.close
        },
        ma_50: sample.ma_50,
        ma_100: sample.ma_100,
        ma_200: sample.ma_200,
        indicatorPosition: this.calculateCustomIndicator(sample),
        spreadColor: this.indicatorState?.lastSpreadColor,
        note: 'MAs maintain full 1-minute calculation accuracy'
      });
    }
  }

  // MA Crossover with 20-minute persistence and spread alerts
  calculateCustomIndicator(dataPoint) {
    const { ma_50, ma_100, ma_200 } = dataPoint;
    
    // Check if we have all required MA values
    if (ma_50 === null || ma_100 === null || ma_200 === null) {
      return null;
    }
    
    // Initialize state tracking if needed
    if (!this.indicatorState) {
      this.indicatorState = {
        currentPosition: 0.5, // Start neutral
        stateHistory: [], // Track last 20 minutes
        lastSpreadColor: '#26a69a'
      };
    }
    
    // Determine current MA positioning
    const ma50AboveMA200 = ma_50 > ma_200;
    const ma100AboveMA200 = ma_100 > ma_200;
    
    // Current state based on crossovers
    let currentState;
    if (ma50AboveMA200 && ma100AboveMA200) {
      currentState = 'bullish';
    } else if (!ma50AboveMA200 && !ma100AboveMA200) {
      currentState = 'bearish'; 
    } else {
      currentState = 'mixed';
    }
    
    // Add to history (limit to 20 data points = 20 minutes for 1m data)
    this.indicatorState.stateHistory.push(currentState);
    if (this.indicatorState.stateHistory.length > 20) {
      this.indicatorState.stateHistory.shift();
    }
    
    // Check if we have 20 minutes of consistent state
    let positionValue = this.indicatorState.currentPosition; // Keep current position by default
    
    if (this.indicatorState.stateHistory.length >= 20) {
      const last20 = this.indicatorState.stateHistory.slice(-20);
      const allBullish = last20.every(state => state === 'bullish');
      const allBearish = last20.every(state => state === 'bearish');
      
      if (allBullish && this.indicatorState.currentPosition !== 1.0) {
        positionValue = 1.0; // Flick to top
        this.indicatorState.currentPosition = 1.0;
        console.log('🚀 BULLISH signal confirmed - 20min persistence!');
      } else if (allBearish && this.indicatorState.currentPosition !== 0.0) {
        positionValue = 0.0; // Flick to bottom  
        this.indicatorState.currentPosition = 0.0;
        console.log('🔻 BEARISH signal confirmed - 20min persistence!');
      }
      // Mixed states don't change position - maintain current
    }
    
    // Determine spread color (simpler logic)
    let spreadColor;
    if (ma_50 > 0.03) {
      spreadColor = '#ff4444'; // Red
    } else if (ma_50 > 0.02) {
      spreadColor = '#ff8800'; // Orange  
    } else if (ma_50 > 0.01) {
      spreadColor = '#ffcc00'; // Yellow
    } else {
      spreadColor = '#26a69a'; // Green
    }
    
    this.indicatorState.lastSpreadColor = spreadColor;
    
    return positionValue; // Just return the value, keep it simple
  }

  // Update spread status display (optimized)
  updateSpreadStatus(data) {
    if (data.length === 0 || !this.indicatorState) return;
    
    const latest = data[data.length - 1];
    const spreadValue = latest.ma_50;
    
    // Only update DOM every 5th call to reduce lag
    if (!this.statusUpdateCounter) this.statusUpdateCounter = 0;
    this.statusUpdateCounter++;
    
    if (this.statusUpdateCounter % 5 !== 0) return; // Skip most updates
    
    const spreadElement = document.getElementById('spread-value');
    const statusElement = document.getElementById('spread-status-text');
    
    if (spreadElement && spreadValue !== null) {
      spreadElement.textContent = spreadValue.toFixed(4);
      spreadElement.style.color = this.indicatorState.lastSpreadColor;
    }
    
    if (statusElement) {
      let crossoverStatus;
      const currentPos = this.indicatorState.currentPosition;
      
      if (currentPos === 1.0) {
        crossoverStatus = "BULLISH (20m)";
      } else if (currentPos === 0.0) {
        crossoverStatus = "BEARISH (20m)";
      } else {
        crossoverStatus = "WAITING";
      }
      
      // Show remaining time for confirmation
      const historyLength = this.indicatorState.stateHistory.length;
      const remaining = Math.max(0, 20 - historyLength);
      
      let statusText;
      if (remaining > 0) {
        statusText = `${crossoverStatus} (${remaining}m left)`;
      } else {
        // Check current trend
        const lastState = this.indicatorState.stateHistory[this.indicatorState.stateHistory.length - 1];
        if (lastState === 'bullish') {
          statusText = `${crossoverStatus} | BULLISH TREND`;
        } else if (lastState === 'bearish') {
          statusText = `${crossoverStatus} | BEARISH TREND`;
        } else {
          statusText = `${crossoverStatus} | MIXED SIGNALS`;
        }
      }
      
      statusElement.textContent = statusText;
      statusElement.style.color = this.indicatorState.lastSpreadColor;
    }
  }

  // Sync time scales between charts
  syncTimeScales() {
    try {
      const mainTimeScale = chart.timeScale();
      const indicatorTimeScale = indicatorChart.timeScale();
      
      // Get the visible range from main chart
      const visibleRange = mainTimeScale.getVisibleLogicalRange();
      if (visibleRange) {
        indicatorTimeScale.setVisibleLogicalRange(visibleRange);
      }
    } catch (err) {
      // Silent fail for sync issues
    }
  }

  async initializeChart() {
    try {
      this.showLoading();
      console.log('🚀 Starting chart initialization...');
      
      // Phase 1: Load recent data first
      console.log('⚡ Loading recent data...');
      const recentRes = await fetch('https://btc-spread-test-pipeline.onrender.com/recent.json');
      const recentData = await recentRes.json();
      
      this.rawData = recentData;
      this.processAndSetData(recentData);
      console.log(`✅ Chart loaded with ${recentData.length} recent data points`);
      
      // Phase 2: Load complete historical data in background
      console.log('📚 Loading complete historical data...');
      const historicalRes = await fetch('https://btc-spread-test-pipeline.onrender.com/historical.json');
      const historicalData = await historicalRes.json();
      
      this.rawData = historicalData;
      this.processAndSetData(historicalData);
      this.isFullDataLoaded = true;
      console.log(`🎉 Chart updated with complete ${historicalData.length} historical data points`);
      
    } catch (err) {
      console.error('❌ Error during chart initialization:', err);
      
      // Fallback to old endpoint
      try {
        const fallbackRes = await fetch('https://btc-spread-test-pipeline.onrender.com/output-latest.json');
        const fallbackData = await fallbackRes.json();
        this.rawData = fallbackData;
        this.processAndSetData(fallbackData);
        console.log('✅ Fallback successful');
      } catch (fallbackErr) {
        console.error('❌ Fallback also failed:', fallbackErr);
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
    
    this.hideLoading();
    this.enableButtons();
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label} - MAs preserve technical accuracy`);
  }

  startUpdateCycle() {
    // Clear existing intervals
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);

    // Update with recent data every 15 seconds
    this.updateInterval = setInterval(() => this.fetchAndUpdate(), 15000);

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

// Setup chart synchronization
function setupChartSync() {
  // Sync from main chart to indicator chart
  chart.timeScale().subscribeVisibleTimeRangeChange(() => {
    const mainRange = chart.timeScale().getVisibleTimeRange();
    if (mainRange) {
      indicatorChart.timeScale().setVisibleTimeRange(mainRange);
    }
  });

  // Sync from indicator chart to main chart
  indicatorChart.timeScale().subscribeVisibleTimeRangeChange(() => {
    const indicatorRange = indicatorChart.timeScale().getVisibleTimeRange();
    if (indicatorRange) {
      chart.timeScale().setVisibleTimeRange(indicatorRange);
    }
  });
}

// Initialize chart and start update cycle
timeframeManager.initializeChart().then(() => {
  timeframeManager.startUpdateCycle();
  setupChartSync();
  
  // Setup the simplified MA Crossover Indicator
  setupCustomIndicator({
    type: 'line',
    title: 'MA Crossover (20m persistence)',
    color: '#00d4ff',
    lineWidth: 3,
    calculate: timeframeManager.calculateCustomIndicator.bind(timeframeManager)
  });
  
  console.log('📊 MA Crossover (20m persistence) indicator active!');
  console.log('🎯 Indicator Logic:');
  console.log('   • Tracks MA50 & MA100 vs MA200 crossovers');
  console.log('   • Requires 20 minutes of consistent state before flicking');
  console.log('   • Top (1.0) = 20min+ of both MAs above MA200');
  console.log('   • Bottom (0.0) = 20min+ of both MAs below MA200');
  console.log('   • Middle (0.5) = Waiting or mixed signals');
  console.log('   • Spread color coding: Green→Yellow→Orange→Red (>0.03)');
});

