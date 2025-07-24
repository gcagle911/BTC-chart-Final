// Simple Volatility Indicators for Bottom Panel
// Minimal implementation that doesn't interfere with main chart

class SimpleVolatilityIndicators {
  constructor() {
    this.chart = null;
    this.indicators = {};
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
        vertTouchDrag: true,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
        axisPressedMouseMove: {
          time: false,
          price: true,
        },
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
      window.chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange && this.chart) {
          this.chart.timeScale().setVisibleTimeRange(timeRange);
        }
      });
    }
  }

  updateData(rawData) {
    if (!rawData || rawData.length < 50) {
      console.log('⚠️ Not enough data for volatility calculation');
      return;
    }

    try {
      const volatilityData = this.calculateSimpleVolatility(rawData);
      if (volatilityData.length > 0) {
        this.indicators.predictor.setData(volatilityData);
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

        result.push({
          time: Math.floor(new Date(data[i].time).getTime() / 1000),
          value: volatilityScore
        });
      }
    }

    return result;
  }
}

// Global instance
window.volatilityIndicators = null;