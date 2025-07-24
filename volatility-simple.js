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
      console.log('🔗 Setting up chart synchronization...');
      
      // Subscribe to visible time range changes (scrolling/zooming)
      window.chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange && this.chart) {
          // Immediate sync for perfect alignment
          try {
            this.chart.timeScale().setVisibleTimeRange(timeRange);
            console.log(`🔄 Synced volatility chart: ${timeRange.from} to ${timeRange.to}`);
          } catch (error) {
            console.error('❌ Sync error:', error);
          }
        }
      });
      
      // Also sync on logical range changes (timeframe switches)
      window.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (logicalRange && this.chart) {
          try {
            this.chart.timeScale().setVisibleLogicalRange(logicalRange);
            console.log(`🔄 Synced logical range: ${logicalRange.from} to ${logicalRange.to}`);
          } catch (error) {
            console.error('❌ Logical sync error:', error);
          }
        }
      });
      
      console.log('✅ Chart synchronization active');
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
        
        // Force sync after data update
        this.forceSync();
        
        console.log(`✅ Volatility updated with ${volatilityData.length} points`);
      }
    } catch (error) {
      console.error('❌ Error updating volatility:', error);
    }
  }
  
  // Force synchronization between charts
  forceSync() {
    if (window.chart && this.chart) {
      try {
        const visibleRange = window.chart.timeScale().getVisibleRange();
        const logicalRange = window.chart.timeScale().getVisibleLogicalRange();
        
        if (visibleRange) {
          this.chart.timeScale().setVisibleRange(visibleRange);
          console.log(`🔄 Force synced time range: ${visibleRange.from} to ${visibleRange.to}`);
        }
        
        if (logicalRange) {
          this.chart.timeScale().setVisibleLogicalRange(logicalRange);
          console.log(`🔄 Force synced logical range: ${logicalRange.from} to ${logicalRange.to}`);
        }
        
        this.verifyAlignment();
      } catch (error) {
        console.error('❌ Force sync error:', error);
      }
    }
  }
  
  // Verify alignment between charts
  verifyAlignment() {
    if (window.chart && this.chart) {
      const mainVisible = window.chart.timeScale().getVisibleRange();
      const volatilityVisible = this.chart.timeScale().getVisibleRange();
      
      if (mainVisible && volatilityVisible) {
        const timeDiff = Math.abs(mainVisible.from - volatilityVisible.from) + Math.abs(mainVisible.to - volatilityVisible.to);
        
        if (timeDiff < 1) { // Less than 1 second difference
          console.log('✅ Charts perfectly aligned');
        } else {
          console.warn(`⚠️ Charts misaligned by ${timeDiff.toFixed(2)} seconds`);
          console.log(`Main: ${mainVisible.from} to ${mainVisible.to}`);
          console.log(`Volatility: ${volatilityVisible.from} to ${volatilityVisible.to}`);
        }
      }
    }
  }

  // Use EXACT same timestamp conversion as TimeframeManager
  toUnixTimestamp(dateStr) {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  }

  calculateSimpleVolatility(data) {
    const result = [];
    const lookback = 20;

    console.log(`📊 Calculating volatility for ${data.length} data points...`);

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

        // Use IDENTICAL timestamp conversion as main chart TimeframeManager
        const timestamp = this.toUnixTimestamp(data[i].time);

        result.push({
          time: timestamp,
          value: volatilityScore
        });
      }
    }

    console.log(`📈 Generated ${result.length} volatility points`);
    if (result.length > 0) {
      console.log(`📅 Time range: ${new Date(result[0].time * 1000).toISOString()} to ${new Date(result[result.length - 1].time * 1000).toISOString()}`);
    }

    return result;
  }
}

// Global instance
window.volatilityIndicators = null;