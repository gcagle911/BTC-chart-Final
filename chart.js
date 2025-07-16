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

  // Aggregate 1-minute data to higher timeframes
  aggregateData(data, timeframeSeconds) {
    if (timeframeSeconds === 60) return data; // 1m data, no aggregation needed

    const aggregated = [];
    const buckets = new Map();

    data.forEach(item => {
      const timestamp = this.toUnixTimestamp(item.time);
      const bucketTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          timestamp: bucketTime,
          prices: [],
          ma_50_values: [],
          ma_100_values: [],
          ma_200_values: []
        });
      }

      const bucket = buckets.get(bucketTime);
      bucket.prices.push(item.price);
      if (item.ma_50 !== null) bucket.ma_50_values.push(item.ma_50);
      if (item.ma_100 !== null) bucket.ma_100_values.push(item.ma_100);
      if (item.ma_200 !== null) bucket.ma_200_values.push(item.ma_200);
    });

    // Convert buckets to aggregated data points
    for (const [bucketTime, bucket] of buckets) {
      if (bucket.prices.length > 0) {
        aggregated.push({
          time: new Date(bucketTime * 1000).toISOString(),
          price: bucket.prices[bucket.prices.length - 1], // Close price (last price in bucket)
          ma_50: bucket.ma_50_values.length > 0 ? 
            bucket.ma_50_values.reduce((a, b) => a + b, 0) / bucket.ma_50_values.length : null,
          ma_100: bucket.ma_100_values.length > 0 ? 
            bucket.ma_100_values.reduce((a, b) => a + b, 0) / bucket.ma_100_values.length : null,
          ma_200: bucket.ma_200_values.length > 0 ? 
            bucket.ma_200_values.reduce((a, b) => a + b, 0) / bucket.ma_200_values.length : null
        });
      }
    }

    return aggregated.sort((a, b) => new Date(a.time) - new Date(b.time));
  }

  // Process and set chart data
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
      
      priceData.push({ time: t, value: d.price });
      if (d.ma_50 !== null) ma50Data.push({ time: t, value: d.ma_50 });
      if (d.ma_100 !== null) ma100Data.push({ time: t, value: d.ma_100 });
      if (d.ma_200 !== null) ma200Data.push({ time: t, value: d.ma_200 });
      
      if (t > this.lastTimestamp) this.lastTimestamp = t;
    });

    if (isUpdate) {
      // Add new data points
      priceData.forEach(p => priceSeries.update(p));
      ma50Data.forEach(p => ma50.update(p));
      ma100Data.forEach(p => ma100.update(p));
      ma200Data.forEach(p => ma200.update(p));
    } else {
      // Set complete dataset
      priceSeries.setData(priceData);
      ma50.setData(ma50Data);
      ma100.setData(ma100Data);
      ma200.setData(ma200Data);
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

