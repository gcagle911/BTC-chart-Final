// Advanced Volatility Prediction Indicators
// Based on L20 Bid-Ask Spread Analysis

class VolatilityIndicators {
  constructor(chart) {
    this.chart = chart;
    this.initializeIndicators();
  }

  initializeIndicators() {
    // Spread Velocity - Rate of spread change
    this.spreadVelocity = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#FF69B4',
      lineWidth: 1,
      title: 'Spread Velocity (%/min)',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Spread Acceleration - Rate of velocity change  
    this.spreadAcceleration = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#FF4500',
      lineWidth: 1,
      title: 'Spread Acceleration',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Spread Volatility Index - Standard deviation of spreads
    this.spreadVolatilityIndex = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#9370DB',
      lineWidth: 2,
      title: 'Spread Volatility Index',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Spread Z-Score - Deviation from normal levels
    this.spreadZScore = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#DC143C',
      lineWidth: 1.5,
      title: 'Spread Z-Score',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Composite Volatility Predictor - Main indicator like RSI
    this.volatilityPredictor = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#FFD700',
      lineWidth: 3,
      title: 'Volatility Predictor (0-100)',
      lastValueVisible: true,
      priceLineVisible: true,
    });

    // Add horizontal reference lines like RSI
    this.addReferenceLevels();
  }

  addReferenceLevels() {
    // Add reference lines at key volatility levels (similar to RSI 30/70 lines)
    const referenceLines = [
      { value: 80, color: '#FF0000', title: 'EXTREME' },
      { value: 65, color: '#FF4500', title: 'HIGH' },
      { value: 50, color: '#FFFF00', title: 'ELEVATED' },
      { value: 35, color: '#90EE90', title: 'MODERATE' },
    ];

    referenceLines.forEach(line => {
      const referenceLine = this.chart.addLineSeries({
        priceScaleId: 'right',
        color: line.color,
        lineWidth: 1,
        lineStyle: 2, // Dashed line style
        title: line.title,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      
      // Set reference line data with current timestamp range
      const now = Math.floor(Date.now() / 1000);
      const start = now - (365 * 24 * 60 * 60); // 1 year ago
      const end = now + (365 * 24 * 60 * 60); // 1 year future
      
      referenceLine.setData([
        { time: start, value: line.value },
        { time: end, value: line.value },
      ]);
    });
  }

  // Calculate spread velocity (rate of change)
  calculateSpreadVelocity(data, period = 5) {
    const velocityData = [];
    
    for (let i = period; i < data.length; i++) {
      const current = data[i].spread_avg_L20_pct;
      const previous = data[i - period].spread_avg_L20_pct;
      
      if (current !== null && previous !== null && previous !== 0) {
        const velocity = ((current - previous) / previous) * 100;
        
        velocityData.push({
          time: this.toUnixTimestamp(data[i].time),
          value: velocity
        });
      }
    }
    
    return velocityData;
  }

  // Calculate spread acceleration (rate of velocity change)
  calculateSpreadAcceleration(velocityData, period = 3) {
    const accelerationData = [];
    
    for (let i = period; i < velocityData.length; i++) {
      const currentVel = velocityData[i].value;
      const previousVel = velocityData[i - period].value;
      const acceleration = currentVel - previousVel;
      
      accelerationData.push({
        time: velocityData[i].time,
        value: acceleration
      });
    }
    
    return accelerationData;
  }

  // Calculate Spread Volatility Index (normalized standard deviation)
  calculateSpreadVolatilityIndex(data, lookback = 20) {
    const sviData = [];
    
    for (let i = lookback; i < data.length; i++) {
      const recentSpreads = data.slice(i - lookback, i + 1)
        .map(d => d.spread_avg_L20_pct)
        .filter(s => s !== null && s !== undefined);
      
      if (recentSpreads.length >= lookback) {
        const mean = recentSpreads.reduce((a, b) => a + b) / recentSpreads.length;
        const variance = recentSpreads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recentSpreads.length;
        const stdDev = Math.sqrt(variance);
        
        // Normalize by mean to get relative volatility
        const svi = mean > 0 ? (stdDev / mean) * 100 : 0;
        
        sviData.push({
          time: this.toUnixTimestamp(data[i].time),
          value: svi
        });
      }
    }
    
    return sviData;
  }

  // Calculate Spread Z-Score (standard deviations from mean)
  calculateSpreadZScore(data, lookback = 100) {
    const zScoreData = [];
    
    for (let i = lookback; i < data.length; i++) {
      const recentSpreads = data.slice(i - lookback, i)
        .map(d => d.spread_avg_L20_pct)
        .filter(s => s !== null && s !== undefined);
      
      if (recentSpreads.length >= lookback) {
        const mean = recentSpreads.reduce((a, b) => a + b) / recentSpreads.length;
        const variance = recentSpreads.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / recentSpreads.length;
        const stdDev = Math.sqrt(variance);
        
        const currentSpread = data[i].spread_avg_L20_pct;
        const zScore = stdDev > 0 ? (currentSpread - mean) / stdDev : 0;
        
        zScoreData.push({
          time: this.toUnixTimestamp(data[i].time),
          value: zScore
        });
      }
    }
    
    return zScoreData;
  }

  // Calculate composite volatility predictor
  calculateVolatilityPredictor(data) {
    console.log('🔮 Calculating volatility predictor...');
    
    const velocity = this.calculateSpreadVelocity(data, 5);
    const svi = this.calculateSpreadVolatilityIndex(data, 20);
    const zScore = this.calculateSpreadZScore(data, 100);
    
    const predictorData = [];
    
    // Find overlapping time points
    for (let i = 0; i < velocity.length; i++) {
      const velTime = velocity[i].time;
      
      // Find matching SVI and Z-Score data points
      const sviPoint = svi.find(s => s.time === velTime);
      const zScorePoint = zScore.find(z => z.time === velTime);
      
      if (sviPoint && zScorePoint) {
        // Normalize components to 0-100 scale
        const velNorm = Math.max(0, Math.min(100, velocity[i].value + 50)); // Center at 50
        const sviNorm = Math.max(0, Math.min(100, sviPoint.value * 2)); // Scale SVI
        const zScoreNorm = Math.max(0, Math.min(100, (zScorePoint.value + 3) * 16.67)); // -3 to +3 -> 0 to 100
        
        // Weighted composite score
        // Higher weights on SVI and Z-Score as they're more predictive
        const composite = (
          velNorm * 0.20 +      // 20% velocity
          sviNorm * 0.50 +      // 50% volatility index (primary)
          zScoreNorm * 0.30     // 30% z-score (secondary)
        );
        
        predictorData.push({
          time: velTime,
          value: composite
        });
      }
    }
    
    return predictorData;
  }

  // Process and update all volatility indicators
  updateIndicators(data, isUpdate = false) {
    try {
      console.log(`📊 Updating volatility indicators with ${data.length} data points...`);
      
      // Ensure we have enough data
      if (!data || data.length < 100) {
        console.warn('⚠️ Not enough data for volatility indicators (need 100+ points)');
        return;
      }
      
      const velocity = this.calculateSpreadVelocity(data);
      const acceleration = this.calculateSpreadAcceleration(velocity);
      const svi = this.calculateSpreadVolatilityIndex(data);
      const zScore = this.calculateSpreadZScore(data);
      const predictor = this.calculateVolatilityPredictor(data);
      
      console.log(`📈 Calculated indicators: Velocity(${velocity.length}), SVI(${svi.length}), Z-Score(${zScore.length}), Predictor(${predictor.length})`);
      
      if (isUpdate) {
        // Update with new data points
        velocity.forEach(p => this.spreadVelocity.update(p));
        acceleration.forEach(p => this.spreadAcceleration.update(p));
        svi.forEach(p => this.spreadVolatilityIndex.update(p));
        zScore.forEach(p => this.spreadZScore.update(p));
        predictor.forEach(p => this.volatilityPredictor.update(p));
      } else {
        // Set complete datasets
        console.log('🔄 Setting complete volatility datasets...');
        this.spreadVelocity.setData(velocity);
        this.spreadAcceleration.setData(acceleration);
        this.spreadVolatilityIndex.setData(svi);
        this.spreadZScore.setData(zScore);
        this.volatilityPredictor.setData(predictor);
      }
      
      console.log(`✅ Volatility indicators updated successfully`);
      
    } catch (error) {
      console.error('❌ Error updating volatility indicators:', error);
      console.error('Data sample:', data.length > 0 ? data[0] : 'No data');
    }
  }

  // Utility function for timestamp conversion
  toUnixTimestamp(dateStr) {
    return Math.floor(new Date(dateStr).getTime() / 1000);
  }

  // Get current volatility signal strength
  getCurrentVolatilitySignal(data) {
    if (data.length === 0) return null;
    
    const predictor = this.calculateVolatilityPredictor(data);
    if (predictor.length === 0) return null;
    
    const latest = predictor[predictor.length - 1].value;
    
    if (latest > 80) return { level: 'EXTREME', value: latest, color: '#FF0000' };
    if (latest > 65) return { level: 'HIGH', value: latest, color: '#FF4500' };
    if (latest > 50) return { level: 'ELEVATED', value: latest, color: '#FFA500' };
    if (latest > 35) return { level: 'MODERATE', value: latest, color: '#FFFF00' };
    return { level: 'LOW', value: latest, color: '#00FF00' };
  }
}

// Export for use in main chart
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VolatilityIndicators;
} else {
  window.VolatilityIndicators = VolatilityIndicators;
}