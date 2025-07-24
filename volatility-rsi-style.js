// RSI-Style Volatility Indicator - Perfect TradingView Sync
// Follows EXACT same pattern as main chart timeframe processing

class RSIStyleVolatility {
  constructor() {
    this.chart = null;
    this.volatilitySeries = null;
    this.referenceLevels = [];
  }

  // Initialize the bottom chart panel
  initialize() {
    console.log('🚀 Initializing RSI-style volatility chart...');

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
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
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
      handleScroll: false, // No independent scrolling
      handleScale: false,  // No independent scaling
    });

    // Main volatility line (gold like RSI)
    this.volatilitySeries = this.chart.addLineSeries({
      color: '#FFD700',
      lineWidth: 2,
      title: 'Volatility Index',
      lastValueVisible: true,
      priceLineVisible: false,
    });

    // Add RSI-style reference levels
    this.addRSIStyleLevels();

    // Setup perfect sync with main chart
    this.setupChartSync();

    console.log('✅ RSI-style volatility chart initialized');
  }

  // Add horizontal reference levels like RSI 30/70
  addRSIStyleLevels() {
    const levels = [
      { value: 80, color: '#FF4444', style: 2 }, // Extreme (red, dashed)
      { value: 65, color: '#FF8844', style: 2 }, // High (orange, dashed)
      { value: 50, color: '#666666', style: 2 }, // Mid (gray, dashed)
      { value: 35, color: '#88FF88', style: 2 }, // Moderate (green, dashed)
      { value: 20, color: '#4488FF', style: 2 }, // Low (blue, dashed)
    ];

    levels.forEach(level => {
      const line = this.chart.addLineSeries({
        color: level.color,
        lineWidth: 1,
        lineStyle: level.style,
        lastValueVisible: false,
        priceLineVisible: false,
      });

      this.referenceLevels.push({ line, value: level.value });
    });
  }

  // Setup perfect sync with main chart (like TradingView)
  setupChartSync() {
    if (!window.chart) {
      console.error('❌ Main chart not found for sync');
      return;
    }

    console.log('🔗 Setting up TradingView-style sync...');

    // Sync on main chart time range changes
    window.chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
      if (timeRange && this.chart) {
        this.chart.timeScale().setVisibleTimeRange(timeRange);
      }
    });

    // Sync on logical range changes
    window.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (logicalRange && this.chart) {
        this.chart.timeScale().setVisibleLogicalRange(logicalRange);
      }
    });

    console.log('✅ Chart sync established');
  }

  // Update volatility data using SAME timeframe logic as main chart
  updateWithTimeframeData(aggregatedData, timeframe) {
    if (!aggregatedData || aggregatedData.length < 20) {
      console.warn(`⚠️ Insufficient data for ${timeframe} volatility`);
      return;
    }

    console.log(`📊 Updating volatility for ${timeframe} with ${aggregatedData.length} points`);

    try {
      // Calculate volatility using same timestamps as main chart
      const volatilityData = this.calculateVolatilityFromAggregated(aggregatedData, timeframe);
      
      if (volatilityData.length > 0) {
        // Set the data (same as main chart pattern)
        this.volatilitySeries.setData(volatilityData);
        
        // Update reference levels with actual data range
        this.updateReferenceLevels(volatilityData[0].time, volatilityData[volatilityData.length - 1].time);
        
        console.log(`✅ ${timeframe} volatility updated: ${volatilityData.length} points`);
      }
    } catch (error) {
      console.error('❌ Error updating volatility:', error);
    }
  }

  // Calculate volatility from aggregated data (same pattern as main chart MAs)
  calculateVolatilityFromAggregated(aggregatedData, timeframe) {
    const result = [];
    
    // Timeframe-appropriate lookback (like RSI periods)
    const lookbackPeriods = {
      '1m': 20,
      '5m': 14, 
      '15m': 14,
      '1h': 14,
      '4h': 14,
      '1d': 14
    };
    
    const lookback = lookbackPeriods[timeframe] || 14;
    
    console.log(`📈 Calculating ${timeframe} volatility with ${lookback} period lookback`);

    // Process each aggregated data point (same loop pattern as main chart)
    for (let i = lookback; i < aggregatedData.length; i++) {
      const currentData = aggregatedData[i];
      const recentData = aggregatedData.slice(i - lookback + 1, i + 1);
      
      // Extract spread values (same as MA logic)
      const spreads = recentData
        .map(d => d.spread_avg_L20_pct)
        .filter(s => s !== null && s !== undefined && !isNaN(s));

      if (spreads.length >= Math.min(lookback, 10)) {
        // Calculate volatility score (RSI-style 0-100)
        const mean = spreads.reduce((a, b) => a + b) / spreads.length;
        const variance = spreads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / spreads.length;
        const stdDev = Math.sqrt(variance);
        
        // Current spread relative to historical
        const currentSpread = spreads[spreads.length - 1];
        const zScore = stdDev > 0 ? (currentSpread - mean) / stdDev : 0;
        
        // Convert to 0-100 scale (RSI-style)
        const volatilityScore = Math.max(0, Math.min(100, ((zScore + 2) / 4) * 100));

        // Use EXACT same timestamp conversion as main chart
        const timestamp = Math.floor(new Date(currentData.time).getTime() / 1000);

        result.push({
          time: timestamp,
          value: volatilityScore
        });
      }
    }

    return result;
  }

  // Update reference levels with actual data time range
  updateReferenceLevels(startTime, endTime) {
    this.referenceLevels.forEach(ref => {
      ref.line.setData([
        { time: startTime, value: ref.value },
        { time: endTime, value: ref.value }
      ]);
    });
  }

  // Force sync with main chart
  forceSync() {
    if (window.chart && this.chart) {
      const visibleRange = window.chart.timeScale().getVisibleRange();
      const logicalRange = window.chart.timeScale().getVisibleLogicalRange();
      
      if (visibleRange) {
        this.chart.timeScale().setVisibleRange(visibleRange);
      }
      if (logicalRange) {
        this.chart.timeScale().setVisibleLogicalRange(logicalRange);
      }
    }
  }
}

// Global instance
window.rsiVolatility = null;