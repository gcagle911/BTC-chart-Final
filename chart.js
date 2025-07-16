// Chart setup
window.chart = LightweightCharts.createChart(document.getElementById('chart'), {
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
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    });

    if (isUpdate) {
      // Add new data points with precision
      priceData.forEach(p => priceSeries.update(p));
      ma50Data.forEach(p => ma50.update(p));
      ma100Data.forEach(p => ma100.update(p));
      ma200Data.forEach(p => ma200.update(p));
    } else {
      // Set complete dataset with precision
      priceSeries.setData(priceData);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
    }

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
        note: 'MAs maintain full 1-minute calculation accuracy'
      });
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

// Initialize chart and start update cycle
timeframeManager.initializeChart().then(() => {
  timeframeManager.startUpdateCycle();
});

