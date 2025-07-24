// Simple Volatility Indicators for Bottom Panel
// Minimal implementation that doesn't interfere with main chart

class SimpleVolatilityIndicators {
  constructor() {
    this.chart = null;
    this.indicators = {};
    this.lastUpdateTime = 0;
  }

  initialize() {
    // Create volatility chart in bottom panel
    this.chart = LightweightCharts.createChart(document.getElementById('volatility-panel'), {
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
        borderVisible: false,
        autoScale: true,
      },
      timeScale: { 
        visible: true,
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
        horzTouchDrag: false,
        vertTouchDrag: false, // Disable to prevent conflicts
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: false, // Disable all to prevent conflicts
      },
    });

    // Main volatility predictor line (like RSI)
    this.indicators.predictor = this.chart.addLineSeries({
      color: '#FFD700',
      lineWidth: 2,
      title: 'Volatility Score',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Reference levels
    this.addReferenceLevels();

    // Sync with main chart
    this.setupSync();

    console.log('📊 Simple volatility indicators initialized');
  }

  addReferenceLevels() {
    const levels = [
      { value: 80, color: '#FF4444' },
      { value: 65, color: '#FF8844' },
      { value: 50, color: '#FFFF44' },
      { value: 35, color: '#88FF88' },
    ];

    levels.forEach(level => {
      const line = this.chart.addLineSeries({
        color: level.color,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        lastValueVisible: false,
        priceLineVisible: false,
      });

      // Set horizontal line
      const now = Math.floor(Date.now() / 1000);
      line.setData([
        { time: now - 86400 * 365, value: level.value },
        { time: now + 86400 * 365, value: level.value },
      ]);
    });
  }

  setupSync() {
    if (window.chart) {
      // Throttle sync updates to improve performance
      let syncTimeout = null;
      
      window.chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange && this.chart) {
          // Clear previous timeout
          if (syncTimeout) {
            clearTimeout(syncTimeout);
          }
          
          // Throttle updates to every 16ms (60fps)
          syncTimeout = setTimeout(() => {
            this.chart.timeScale().setVisibleTimeRange(timeRange);
          }, 16);
        }
      });
    }
  }

  updateData(rawData) {
    if (!rawData || rawData.length < 50) {
      return;
    }

    try {
      // Throttle data updates to prevent excessive recalculation
      if (this.lastUpdateTime && Date.now() - this.lastUpdateTime < 1000) {
        return; // Skip if updated less than 1 second ago
      }
      
      const volatilityData = this.calculateSimpleVolatility(rawData);
      if (volatilityData.length > 0) {
        this.indicators.predictor.setData(volatilityData);
        this.lastUpdateTime = Date.now();
        console.log(`✅ Volatility updated with ${volatilityData.length} points`);
      }
    } catch (error) {
      console.error('❌ Error updating volatility:', error);
    }
  }

  calculateSimpleVolatility(data) {
    const result = [];
    const lookback = 20;

    for (let i = lookback; i < data.length; i++) {
      const recentData = data.slice(i - lookback, i + 1);
      const spreads = recentData
        .map(d => d.spread_avg_L20_pct)
        .filter(s => s !== null && s !== undefined);

      if (spreads.length >= lookback) {
        // Calculate volatility score (0-100)
        const mean = spreads.reduce((a, b) => a + b) / spreads.length;
        const variance = spreads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / spreads.length;
        const stdDev = Math.sqrt(variance);
        
        // Current spread vs historical
        const currentSpread = spreads[spreads.length - 1];
        const zScore = stdDev > 0 ? (currentSpread - mean) / stdDev : 0;
        
        // Convert to 0-100 scale
        const volatilityScore = Math.max(0, Math.min(100, (zScore + 3) * 16.67));

        // Use EXACT same timestamp conversion as main chart for perfect alignment
        const timestamp = Math.floor(new Date(data[i].time).getTime() / 1000);

        result.push({
          time: timestamp,
          value: volatilityScore
        });
      }
    }

    return result;
  }
}

// Global instance
window.volatilityIndicators = null;