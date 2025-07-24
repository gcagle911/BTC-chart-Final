// Simple Volatility Indicators for Bottom Panel
// Minimal implementation that doesn't interfere with main chart

class SimpleVolatilityIndicators {
  constructor() {
    this.chart = null;
    this.indicators = {};
    this.lastUpdateTime = 0;
    this.referenceLines = [];
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
      handleScroll: false, // Completely disable independent scrolling
      handleScale: false,  // Completely disable independent scaling
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

    // Start periodic alignment check
    this.startPeriodicSync();

    console.log('📊 Simple volatility indicators initialized');
  }
  
  // Start periodic sync check to ensure charts stay aligned
  startPeriodicSync() {
    // Check alignment every 2 seconds
    this.syncInterval = setInterval(() => {
      this.verifyAlignment();
    }, 2000);
  }

  addReferenceLevels() {
    // Store reference lines to update them later with actual data range
    this.referenceLines = [];
    
    const levels = [
      { value: 80, color: '#FF4444', label: 'Extreme' },
      { value: 65, color: '#FF8844', label: 'High' },
      { value: 50, color: '#FFFF44', label: 'Elevated' },
      { value: 35, color: '#88FF88', label: 'Moderate' },
    ];

    levels.forEach(level => {
      const line = this.chart.addLineSeries({
        color: level.color,
        lineWidth: 1,
        lineStyle: 2, // Dashed
        lastValueVisible: false,
        priceLineVisible: false,
      });

      this.referenceLines.push({ line, value: level.value, label: level.label });
    });
  }
  
  // Update reference lines with actual data time range
  updateReferenceLevels(dataStartTime, dataEndTime) {
    this.referenceLines.forEach(ref => {
      ref.line.setData([
        { time: dataStartTime, value: ref.value },
        { time: dataEndTime, value: ref.value },
      ]);
    });
  }

  setupSync() {
    if (window.chart) {
      console.log('🔗 Setting up chart synchronization...');
      
      // Subscribe to visible time range changes (scrolling/zooming)
      window.chart.timeScale().subscribeVisibleTimeRangeChange((timeRange) => {
        if (timeRange && this.chart) {
          try {
            // Force exact same visible range
            this.chart.timeScale().setVisibleTimeRange(timeRange);
            
            // Also ensure logical range is synced
            const logicalRange = window.chart.timeScale().getVisibleLogicalRange();
            if (logicalRange) {
              this.chart.timeScale().setVisibleLogicalRange(logicalRange);
            }
            
            console.log(`🔄 Synced: ${new Date(timeRange.from * 1000).toLocaleTimeString()} to ${new Date(timeRange.to * 1000).toLocaleTimeString()}`);
          } catch (error) {
            console.error('❌ Sync error:', error);
          }
        }
      });
      
      // Additional sync on logical range changes
      window.chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (logicalRange && this.chart) {
          try {
            this.chart.timeScale().setVisibleLogicalRange(logicalRange);
            
            // Ensure time range is also synced
            const timeRange = window.chart.timeScale().getVisibleTimeRange();
            if (timeRange) {
              this.chart.timeScale().setVisibleTimeRange(timeRange);
            }
            
            console.log(`🔄 Logical sync: ${logicalRange.from} to ${logicalRange.to}`);
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
        
        // Update reference lines with actual data time range
        const startTime = volatilityData[0].time;
        const endTime = volatilityData[volatilityData.length - 1].time;
        this.updateReferenceLevels(startTime, endTime);
        
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
        // Get both ranges from main chart
        const visibleRange = window.chart.timeScale().getVisibleRange();
        const logicalRange = window.chart.timeScale().getVisibleLogicalRange();
        
        if (visibleRange) {
          // Apply visible range first
          this.chart.timeScale().setVisibleRange(visibleRange);
        }
        
        if (logicalRange) {
          // Then apply logical range for perfect alignment
          this.chart.timeScale().setVisibleLogicalRange(logicalRange);
        }
        
        // Double-check by applying visible range again after logical range
        if (visibleRange) {
          this.chart.timeScale().setVisibleRange(visibleRange);
        }
        
        console.log(`🔄 Force sync complete: ${new Date(visibleRange.from * 1000).toLocaleTimeString()} to ${new Date(visibleRange.to * 1000).toLocaleTimeString()}`);
        
        // Verify alignment after sync
        setTimeout(() => this.verifyAlignment(), 100);
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
      const mainLogical = window.chart.timeScale().getVisibleLogicalRange();
      const volatilityLogical = this.chart.timeScale().getVisibleLogicalRange();
      
      if (mainVisible && volatilityVisible) {
        const timeDiff = Math.abs(mainVisible.from - volatilityVisible.from) + Math.abs(mainVisible.to - volatilityVisible.to);
        
        if (timeDiff < 0.1) { // Less than 0.1 second difference
          console.log('✅ Charts perfectly aligned');
        } else {
          console.warn(`⚠️ Charts misaligned by ${timeDiff.toFixed(3)} seconds`);
          console.log(`Main time: ${new Date(mainVisible.from * 1000).toLocaleTimeString()} to ${new Date(mainVisible.to * 1000).toLocaleTimeString()}`);
          console.log(`Vol time: ${new Date(volatilityVisible.from * 1000).toLocaleTimeString()} to ${new Date(volatilityVisible.to * 1000).toLocaleTimeString()}`);
          
          if (mainLogical && volatilityLogical) {
            console.log(`Main logical: ${mainLogical.from.toFixed(2)} to ${mainLogical.to.toFixed(2)}`);
            console.log(`Vol logical: ${volatilityLogical.from.toFixed(2)} to ${volatilityLogical.to.toFixed(2)}`);
          }
          
          // Try to fix misalignment
          console.log('🔧 Attempting to fix alignment...');
          this.chart.timeScale().setVisibleRange(mainVisible);
          if (mainLogical) {
            this.chart.timeScale().setVisibleLogicalRange(mainLogical);
          }
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
    const lookback = 50; // Longer lookback for stability
    const smoothing = 10; // Smoothing period

    console.log(`📊 Calculating volatility for ${data.length} data points...`);

    for (let i = lookback; i < data.length; i++) {
      const recentData = data.slice(i - lookback, i + 1);
      const spreads = recentData
        .map(d => d.spread_avg_L20_pct)
        .filter(s => s !== null && s !== undefined);

      if (spreads.length >= lookback) {
        // Calculate volatility score using improved method
        const mean = spreads.reduce((a, b) => a + b) / spreads.length;
        const variance = spreads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / spreads.length;
        const stdDev = Math.sqrt(variance);
        
        // Current spread vs historical (use recent average instead of single point)
        const recentSpreads = spreads.slice(-5); // Last 5 points
        const currentSpread = recentSpreads.reduce((a, b) => a + b) / recentSpreads.length;
        
        // Z-score calculation
        const zScore = stdDev > 0 ? (currentSpread - mean) / stdDev : 0;
        
        // Convert to 0-100 scale with better scaling
        let volatilityScore = Math.max(0, Math.min(100, ((zScore + 2) / 4) * 100));
        
        // Apply smoothing to reduce noise
        if (result.length > 0) {
          const recentScores = result.slice(-smoothing).map(r => r.value);
          const smoothedScore = (recentScores.reduce((a, b) => a + b, 0) + volatilityScore) / (recentScores.length + 1);
          volatilityScore = smoothedScore;
        }

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
      const firstDate = new Date(result[0].time * 1000);
      const lastDate = new Date(result[result.length - 1].time * 1000);
      console.log(`📅 Time range: ${firstDate.toLocaleDateString()} to ${lastDate.toLocaleDateString()}`);
      console.log(`📊 Value range: ${Math.min(...result.map(r => r.value)).toFixed(1)} to ${Math.max(...result.map(r => r.value)).toFixed(1)}`);
    }

    return result;
  }
}

// Global instance
window.volatilityIndicators = null;