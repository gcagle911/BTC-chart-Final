// Gold X Signal Implementation  
// Handles Gold X signal detection with price drop + MA conditions

import { SignalBase } from './SignalBase.js';
import { SIGNAL_CONFIG, toUnixTimestamp, formatDateForLogging } from './SignalConfig.js';

export class GoldXSignal extends SignalBase {
  constructor() {
    super(SIGNAL_CONFIG.GOLDX);
    this.cumulativeAverages = new Map(); // asset_exchange -> {L50_avg: value}
  }

  // Calculate cumulative average for Gold X signals
  calculateThresholds(rawData, assetExchangeKey) {
    console.log(`📊 Calculating Gold X cumulative average for ${assetExchangeKey}`);
    
    if (!rawData || rawData.length < SIGNAL_CONFIG.GENERAL.MIN_DATA_POINTS) {
      console.warn('⚠️ Insufficient data for Gold X calculation');
      return;
    }
    
    // Calculate L50 cumulative average
    const l50Values = [];
    for (const item of rawData) {
      const value = item[SIGNAL_CONFIG.GOLDX.MA_FIELD];
      if (value !== null && value !== undefined && isFinite(value)) {
        l50Values.push(value);
      }
    }
    
    if (l50Values.length === 0) {
      console.warn('⚠️ No valid L50 spread values found');
      return;
    }
    
    const l50CumulativeAvg = l50Values.reduce((sum, val) => sum + val, 0) / l50Values.length;
    
    this.cumulativeAverages.set(assetExchangeKey, {
      L50_avg: l50CumulativeAvg
    });
    
    console.log(`📊 Gold X cumulative average for ${assetExchangeKey}: ${l50CumulativeAvg.toFixed(6)} (from ${l50Values.length} values)`);
  }

  // Check if Gold X conditions are met for entire candlestick
  checkConditions(candleData, candleTime, rawData, currentSymbol, exchange, timeframe) {
    if (!candleData || candleData.length === 0) return false;
    
    const assetExchangeKey = `${currentSymbol}_${exchange}`;
    const cumulativeAvg = this.cumulativeAverages.get(assetExchangeKey);
    if (!cumulativeAvg) return false;
    
    let conditionsMetCount = 0;
    
    // Check each minute within the candle
    for (let i = 0; i < candleData.length; i++) {
      const minuteData = candleData[i];
      
      // Find data index for this minute
      let dataIndex = -1;
      for (let j = 0; j < rawData.length; j++) {
        if (rawData[j].time === minuteData.time) {
          dataIndex = j;
          break;
        }
      }
      
      if (dataIndex === -1 || dataIndex < SIGNAL_CONFIG.GOLDX.PRICE_DROP_WINDOW) continue;
      
      // Check both conditions
      if (this.checkGoldXConditions(minuteData, dataIndex, rawData, cumulativeAvg.L50_avg)) {
        conditionsMetCount++;
      }
    }
    
    // Require conditions for majority of candle
    const requiredMinutes = Math.ceil(candleData.length * SIGNAL_CONFIG.GOLDX.SUSTAINED_PERCENTAGE);
    const conditionsMet = conditionsMetCount >= requiredMinutes;
    
    return conditionsMet;
  }

  // Check Gold X trigger conditions for a specific data point
  checkGoldXConditions(currentData, dataIndex, rawData, cumulativeAvg) {
    // Condition 1: Price drops 1.75% or more within 2 hours
    const priceDrop2HourMet = this.checkPriceDrop2Hour(currentData, dataIndex, rawData, SIGNAL_CONFIG.GOLDX.PRICE_DROP_THRESHOLD);
    
    // Condition 2: 20, 50, and 100 MA for L50 are ALL < cumulative average
    const maConditionMet = this.checkL50MAsBelowAverage(currentData, dataIndex, rawData, cumulativeAvg);
    
    console.log(`📊 Gold X conditions: PriceDrop2H=${priceDrop2HourMet}, MAsBelow=${maConditionMet}`);
    
    return priceDrop2HourMet && maConditionMet;
  }

  // Check for price drop >= threshold within 2 hours
  checkPriceDrop2Hour(currentData, dataIndex, rawData, dropThreshold) {
    if (!rawData || dataIndex < SIGNAL_CONFIG.GOLDX.PRICE_DROP_WINDOW) return false; // Need 2 hours of data (120 minutes)
    
    const currentPrice = currentData.price;
    if (!currentPrice) return false;
    
    // Look back through 2-hour window to find highest price
    let maxPriceIn2Hours = currentPrice;
    
    for (let i = 0; i < SIGNAL_CONFIG.GOLDX.PRICE_DROP_WINDOW && (dataIndex - i) >= 0; i++) {
      const pastData = rawData[dataIndex - i];
      if (pastData && pastData.price) {
        maxPriceIn2Hours = Math.max(maxPriceIn2Hours, pastData.price);
      }
    }
    
    // Calculate drop from highest price in 2-hour window to current
    const drop2Hour = ((currentPrice - maxPriceIn2Hours) / maxPriceIn2Hours) * 100;
    const dropMet = drop2Hour <= -dropThreshold; // More negative = bigger drop
    
    console.log(`📊 2-hour drop check: max=${maxPriceIn2Hours.toFixed(2)}, current=${currentPrice.toFixed(2)}, drop=${drop2Hour.toFixed(2)}% (need ≤-${dropThreshold}%) = ${dropMet}`);
    
    return dropMet;
  }

  // Check if 20, 50, and 100 MA for L50 are ALL below cumulative average
  checkL50MAsBelowAverage(currentData, dataIndex, rawData, cumulativeAvg) {
    // Calculate 20, 50, 100 period MAs for L50 spread
    const ma20 = this.calculateMA(dataIndex, rawData, SIGNAL_CONFIG.GOLDX.MA_FIELD, 20);
    const ma50 = this.calculateMA(dataIndex, rawData, SIGNAL_CONFIG.GOLDX.MA_FIELD, 50);  
    const ma100 = this.calculateMA(dataIndex, rawData, SIGNAL_CONFIG.GOLDX.MA_FIELD, 100);
    
    if (ma20 === null || ma50 === null || ma100 === null) {
      console.log(`📊 MA calculation failed: ma20=${ma20}, ma50=${ma50}, ma100=${ma100}`);
      return false;
    }
    
    const ma20BelowAvg = ma20 < cumulativeAvg;
    const ma50BelowAvg = ma50 < cumulativeAvg;
    const ma100BelowAvg = ma100 < cumulativeAvg;
    
    const allMAsBelowAvg = ma20BelowAvg && ma50BelowAvg && ma100BelowAvg;
    
    console.log(`📊 L50 MAs vs cumulative avg (${cumulativeAvg.toFixed(6)}):`);
    console.log(`📊 MA20: ${ma20.toFixed(6)} < avg = ${ma20BelowAvg}`);
    console.log(`📊 MA50: ${ma50.toFixed(6)} < avg = ${ma50BelowAvg}`);
    console.log(`📊 MA100: ${ma100.toFixed(6)} < avg = ${ma100BelowAvg}`);
    console.log(`📊 All MAs below avg: ${allMAsBelowAvg}`);
    
    return allMAsBelowAvg;
  }

  // Calculate moving average for a specific field and period
  calculateMA(currentIndex, rawData, fieldName, period) {
    if (!rawData || rawData.length < period || currentIndex < period - 1) return null;
    
    let sum = 0;
    let count = 0;
    
    for (let i = currentIndex - period + 1; i <= currentIndex; i++) {
      const value = rawData[i][fieldName];
      if (value !== null && value !== undefined && isFinite(value)) {
        sum += value;
        count++;
      }
    }
    
    return count > 0 ? sum / count : null;
  }

  // Check if real-time Gold X trigger conditions are met
  shouldTrigger(currentData, rawData, currentSymbol, exchange, timeframe) {
    const assetExchangeKey = `${currentSymbol}_${exchange}`;
    const cumulativeAvg = this.cumulativeAverages.get(assetExchangeKey);
    
    if (!cumulativeAvg || !rawData || rawData.length < SIGNAL_CONFIG.GOLDX.PRICE_DROP_WINDOW) {
      return false;
    }
    
    // Find current data index
    let currentIndex = -1;
    for (let i = rawData.length - 1; i >= 0; i--) {
      if (rawData[i].time === currentData.time) {
        currentIndex = i;
        break;
      }
    }
    
    if (currentIndex === -1 || currentIndex < SIGNAL_CONFIG.GOLDX.PRICE_DROP_WINDOW) {
      return false;
    }
    
    return this.checkGoldXConditions(currentData, currentIndex, rawData, cumulativeAvg.L50_avg);
  }
}