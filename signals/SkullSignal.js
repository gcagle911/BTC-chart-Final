// Skull Signal Implementation
// Handles skull signal detection with dual conditions (spread + slope)

import { SignalBase } from './SignalBase.js';
import { SIGNAL_CONFIG, toUnixTimestamp, formatDateForLogging } from './SignalConfig.js';

export class SkullSignal extends SignalBase {
  constructor() {
    super(SIGNAL_CONFIG.SKULL);
  }

  // Calculate spread and slope thresholds for skull signals
  calculateThresholds(rawData, assetExchangeKey) {
    console.log(`📊 Calculating skull thresholds for ${assetExchangeKey}`);
    
    // Calculate spread thresholds for each layer
    const spreadThresholds = {};
    const layers = SIGNAL_CONFIG.SKULL.LAYERS;
    
    for (const layer of layers) {
      const layerValues = [];
      
      for (const item of rawData) {
        const value = item[layer];
        if (value !== null && value !== undefined && isFinite(value)) {
          layerValues.push(value);
        }
      }
      
      if (layerValues.length === 0) {
        console.warn(`⚠️ No valid values found for ${layer}`);
        continue;
      }
      
      // Sort to find top 15% for THIS layer
      layerValues.sort((a, b) => a - b);
      const thresholdIndex = Math.floor(layerValues.length * SIGNAL_CONFIG.SKULL.SPREAD_THRESHOLD_PERCENTILE);
      const threshold = layerValues[thresholdIndex];
      
      spreadThresholds[layer] = threshold;
      console.log(`📊 ${layer} threshold (top 15%): ${threshold.toFixed(6)} (from ${layerValues.length} values)`);
    }
    
    // Calculate slope thresholds
    const slopeValues = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const current = rawData[i];
      const previous = rawData[i - 1];
      
      let maxSlope = 0;
      
      for (const layer of layers) {
        const currentVal = current[layer];
        const previousVal = previous[layer];
        
        if (currentVal !== null && previousVal !== null && isFinite(currentVal) && isFinite(previousVal)) {
          const timeDiff = new Date(current.time).getTime() - new Date(previous.time).getTime();
          const valueDiff = currentVal - previousVal;
          
          if (timeDiff > 0) {
            const slope = Math.abs(valueDiff / timeDiff);
            maxSlope = Math.max(maxSlope, slope);
          }
        }
      }
      
      if (maxSlope > 0) {
        slopeValues.push(maxSlope);
      }
    }
    
    if (slopeValues.length === 0) {
      console.warn(`⚠️ No valid slope values found for ${assetExchangeKey}`);
      return;
    }
    
    // Sort to find top 5% acceleration
    slopeValues.sort((a, b) => a - b);
    const slopeThresholdIndex = Math.floor(slopeValues.length * SIGNAL_CONFIG.SKULL.SLOPE_THRESHOLD_PERCENTILE);
    const slopeThreshold = slopeValues[slopeThresholdIndex];
    
    this.thresholds.set(assetExchangeKey, {
      ...spreadThresholds,
      top5Percent: slopeThreshold
    });
    
    console.log(`📊 Skull slope threshold (top 5%): ${slopeThreshold.toFixed(8)} (from ${slopeValues.length} values)`);
  }

  // Check if skull conditions are sustained throughout entire candle
  checkConditions(candleData, candleTime, rawData, currentSymbol, exchange, timeframe) {
    if (!candleData || candleData.length === 0) return false;
    
    console.log(`🔍 Checking skull conditions for candle at ${formatDateForLogging(candleTime)} with ${candleData.length} data points`);
    
    const assetExchangeKey = `${currentSymbol}_${exchange}`;
    const thresholds = this.thresholds.get(assetExchangeKey);
    
    if (!thresholds) {
      console.log(`❌ Missing skull thresholds for ${assetExchangeKey}`);
      return false;
    }
    
    let sustainedSpreadCount = 0;
    let sustainedSlopeCount = 0;
    
    // Check each minute within the candle
    for (let i = 0; i < candleData.length; i++) {
      const minuteData = candleData[i];
      
      // Check if AT LEAST 2 of 3 spread layers are in their top 15% for this minute
      const layers = SIGNAL_CONFIG.SKULL.LAYERS;
      let layersMetThisMinute = 0;
      
      for (const layer of layers) {
        const value = minuteData[layer];
        const layerThreshold = thresholds[layer];
        
        if (layerThreshold && value !== null && value >= layerThreshold) {
          layersMetThisMinute++;
        }
      }
      
      // Require majority (2 of 3)
      if (layersMetThisMinute >= SIGNAL_CONFIG.SKULL.REQUIRED_LAYERS) {
        sustainedSpreadCount++;
      }
      
      // Check slope condition for this minute (if enough data)
      if (i > 0) {
        const currentSlope = this.calculateSlopeForMinute(candleData, i);
        if (currentSlope >= thresholds.top5Percent) {
          sustainedSlopeCount++;
        }
      }
    }
    
    // Require conditions to be sustained for majority of candle (>70%)
    const requiredSustainedMinutes = Math.ceil(candleData.length * SIGNAL_CONFIG.SKULL.SUSTAINED_PERCENTAGE);
    const spreadSustained = sustainedSpreadCount >= requiredSustainedMinutes;
    const slopeSustained = sustainedSlopeCount >= requiredSustainedMinutes;
    
    const bothSustained = spreadSustained && slopeSustained;
    
    console.log(`📊 Skull conditions: Spread sustained ${sustainedSpreadCount}/${candleData.length} (${spreadSustained}), Slope sustained ${sustainedSlopeCount}/${candleData.length} (${slopeSustained}), Both=${bothSustained}`);
    
    return bothSustained;
  }

  // Calculate slope for a specific minute within a candle
  calculateSlopeForMinute(candleData, minuteIndex) {
    if (minuteIndex < 1) return 0;
    
    const current = candleData[minuteIndex];
    const previous = candleData[minuteIndex - 1];
    
    const layers = SIGNAL_CONFIG.SKULL.LAYERS;
    let maxSlope = 0;
    
    for (const layer of layers) {
      const currentVal = current[layer];
      const previousVal = previous[layer];
      
      if (currentVal !== null && previousVal !== null && isFinite(currentVal) && isFinite(previousVal)) {
        const timeDiff = new Date(current.time).getTime() - new Date(previous.time).getTime();
        const valueDiff = currentVal - previousVal;
        
        if (timeDiff > 0) {
          const slope = Math.abs(valueDiff / timeDiff);
          maxSlope = Math.max(maxSlope, slope);
        }
      }
    }
    
    return maxSlope;
  }

  // Check if real-time skull trigger conditions are met
  shouldTrigger(currentData, rawData, currentSymbol, exchange, timeframe) {
    const assetExchangeKey = `${currentSymbol}_${exchange}`;
    const thresholds = this.thresholds.get(assetExchangeKey);
    
    if (!thresholds) return false;
    
    // Check cooloff period
    const now = Date.now();
    if (now - this.lastTriggerTime < SIGNAL_CONFIG.SKULL.COOLOFF_PERIOD) {
      return false;
    }
    
    // Check current spread conditions (2 of 3 layers)
    const layers = SIGNAL_CONFIG.SKULL.LAYERS;
    let layersMet = 0;
    
    for (const layer of layers) {
      const value = currentData[layer];
      const layerThreshold = thresholds[layer];
      
      if (layerThreshold && value !== null && value >= layerThreshold) {
        layersMet++;
      }
    }
    
    const spreadConditionMet = layersMet >= SIGNAL_CONFIG.SKULL.REQUIRED_LAYERS;
    
    // Check slope condition (simplified for real-time)
    // This would need access to recent data for proper slope calculation
    // For now, return spread condition only
    
    return spreadConditionMet;
  }
}