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
  rightPriceScale: { visible: true },
  leftPriceScale: { visible: true },
  timeScale: { timeVisible: true, secondsVisible: false },
});

const priceSeries = chart.addLineSeries({
  priceScaleId: 'right',
  color: '#00ffff',
  lineWidth: 2,
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

  // Aggregate 1-minute data to higher timeframes with high precision
  aggregateData(data, timeframeSeconds) {
    if (timeframeSeconds === 60) return data; // 1m data, no aggregation needed

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

    // Convert buckets to aggregated data points using last values (most precise)
    for (const [bucketTime, bucket] of buckets) {
      if (bucket.dataPoints.length > 0) {
        // Sort by timestamp and take the last (most recent) values in each bucket
        bucket.dataPoints.sort((a, b) => a.timestamp - b.timestamp);
        const lastPoint = bucket.dataPoints[bucket.dataPoints.length - 1];
        
        // For higher precision, we could also calculate OHLC if needed
        const openPoint = bucket.dataPoints[0];
        const highPrice = Math.max(...bucket.dataPoints.map(p => p.price));
        const lowPrice = Math.min(...bucket.dataPoints.map(p => p.price));
        
        aggregated.push({
          time: new Date(bucketTime * 1000).toISOString(),
          // Use the close price (last in bucket) for maximum precision
          price: lastPoint.price,
          // Use the last MA values in the bucket to maintain precision
          // This is how professional trading platforms handle MA aggregation
          ma_50: lastPoint.ma_50,
          ma_100: lastPoint.ma_100,
          ma_200: lastPoint.ma_200,
          // Store OHLC data for potential future use
          open: openPoint.price,
          high: highPrice,
          low: lowPrice,
          close: lastPoint.price
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
      
      // Maintain full precision by not rounding values
      priceData.push({ 
        time: t, 
        value: parseFloat(d.price) // Ensure numeric precision
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

    // Log precision info for debugging
    if (aggregatedData.length > 0) {
      const sample = aggregatedData[aggregatedData.length - 1];
      console.log(`📊 ${this.currentTimeframe} precision sample:`, {
        price: sample.price,
        ma_50: sample.ma_50,
        ma_100: sample.ma_100,
        ma_200: sample.ma_200
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
    
    console.log(`🔄 Switching to ${timeframe} timeframe`);
    
    this.currentTimeframe = timeframe;
    this.setActiveButton(timeframe);
    
    // Reprocess data with new timeframe
    this.lastTimestamp = 0; // Reset to reprocess all data
    this.processAndSetData(this.rawData);
    
    this.hideLoading();
    this.enableButtons();
    
    console.log(`✅ Switched to ${this.timeframes[timeframe].label} timeframe`);
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

