// Base Signal Class
// Provides common functionality for all signal types

import { SIGNAL_CONFIG, toUnixTimestamp, getTimeframeSeconds, formatDateForLogging } from './SignalConfig.js';

export class SignalBase {
  constructor(config) {
    this.config = config;
    this.signals = new Map(); // time -> signal data
    this.thresholds = new Map(); // asset_exchange -> threshold data
    this.lastTriggerTime = 0;
    this.type = config.TYPE;
    
    console.log(`📍 ${this.type.toUpperCase()} Signal initialized`);
  }

  // Abstract methods to be implemented by subclasses
  calculateThresholds(rawData, assetExchangeKey) {
    throw new Error('calculateThresholds must be implemented by subclass');
  }

  checkConditions(candleData, candleTime, rawData, currentSymbol, exchange, timeframe) {
    throw new Error('checkConditions must be implemented by subclass');
  }

  // Common signal calculation workflow
  calculateSignals(rawData, currentSymbol, exchange, timeframe) {
    const assetExchangeKey = `${currentSymbol}_${exchange}`;
    console.log(`${this.config.EMOJI} Calculating ${this.type} signals for ${assetExchangeKey} (${timeframe})...`);
    
    if (!rawData || rawData.length === 0) {
      console.warn(`⚠️ No data available for ${this.type} calculation`);
      return;
    }

    // Clear existing signals for this asset/exchange
    this.signals.clear();
    
    // Calculate thresholds first
    this.calculateThresholds(rawData, assetExchangeKey);
    
    // Group data by candle timeframe for duration-based checking
    const candleBuckets = this.groupDataIntoCandleBuckets(rawData, timeframe);
    
    console.log(`📊 Grouped data into ${candleBuckets.size} ${timeframe} candles`);
    
    let signalCount = 0;
    let lastSignalTime = 0;
    
    // Check each candle for sustained conditions
    for (const [candleTime, candleData] of candleBuckets) {
      // Check cooloff if applicable
      if (this.config.COOLOFF_PERIOD && candleTime - lastSignalTime < (this.config.COOLOFF_PERIOD / 1000)) {
        continue;
      }
      
      // Check if conditions are met for this candle
      if (this.checkConditions(candleData, candleTime, rawData, currentSymbol, exchange, timeframe)) {
        // Add signal for this candle
        const candlePrice = candleData[candleData.length - 1]?.price || 50000;
        
        this.signals.set(candleTime, {
          type: this.type,
          price: candlePrice * this.config.MARKER_PRICE_MULTIPLIER,
          active: true,
          asset: currentSymbol,
          exchange: exchange,
          timeframe: timeframe,
          duration: `${candleData.length} minutes`
        });
        
        signalCount++;
        lastSignalTime = candleTime;
        console.log(`${this.config.EMOJI} ${this.type} signal found at ${formatDateForLogging(candleTime)} (${candleData.length} data points)`);
      }
    }
    
    console.log(`✅ ${this.type} calculation complete: Found ${signalCount} signals for ${timeframe}`);
    console.log(`📊 Total ${this.type} signals: ${this.signals.size}`);
    
    // Debug if no signals found
    if (signalCount === 0) {
      this.debugNoSignals(candleBuckets, rawData, currentSymbol, exchange, timeframe);
    }
  }

  // Group raw data into candle buckets based on timeframe
  groupDataIntoCandleBuckets(rawData, timeframe) {
    const timeframeSeconds = getTimeframeSeconds(timeframe);
    const candleBuckets = new Map();
    
    for (const item of rawData) {
      const timestamp = toUnixTimestamp(item.time);
      const candleTime = Math.floor(timestamp / timeframeSeconds) * timeframeSeconds;
      
      if (!candleBuckets.has(candleTime)) {
        candleBuckets.set(candleTime, []);
      }
      candleBuckets.get(candleTime).push(item);
    }
    
    return candleBuckets;
  }

  // Debug function when no signals are found
  debugNoSignals(candleBuckets, rawData, currentSymbol, exchange, timeframe) {
    console.log(`🔍 DEBUG: No ${this.type} signals found. Checking first few candles...`);
    let debugCount = 0;
    
    for (const [candleTime, candleData] of candleBuckets) {
      if (debugCount >= SIGNAL_CONFIG.GENERAL.DEBUG_CANDLE_LIMIT) break;
      
      console.log(`🔍 Candle ${debugCount + 1}: ${formatDateForLogging(candleTime)} with ${candleData.length} data points`);
      const conditionsMet = this.checkConditions(candleData, candleTime, rawData, currentSymbol, exchange, timeframe);
      console.log(`🔍 Candle ${debugCount + 1} conditions met: ${conditionsMet}`);
      debugCount++;
    }
  }

  // Clear signals for asset/exchange switch
  clearSignals() {
    console.log(`🧹 Clearing ${this.type} signals`);
    this.signals.clear();
    this.lastTriggerTime = 0;
  }

  // Get markers for chart display
  getMarkers() {
    const markers = [];
    
    for (const [time, signal] of this.signals) {
      markers.push({
        time: time,
        position: this.config.POSITION,
        color: this.config.COLOR,
        shape: 'text',
        text: this.config.EMOJI,
        size: SIGNAL_CONFIG.GENERAL.MARKER_SIZE,
      });
    }
    
    return markers;
  }

  // Get signal count
  getSignalCount() {
    return this.signals.size;
  }

  // Check if signal system should trigger real-time
  shouldTrigger(currentData, rawData, currentSymbol, exchange, timeframe) {
    // To be implemented by subclasses if real-time triggering is needed
    return false;
  }

  // Trigger real-time signal
  triggerRealTimeSignal(currentTime, currentPrice) {
    const signalData = {
      type: this.type,
      price: currentPrice * this.config.MARKER_PRICE_MULTIPLIER,
      active: true,
      triggered: Date.now()
    };
    
    this.signals.set(currentTime, signalData);
    console.log(`📍 Real-time ${this.type} signal triggered:`, signalData);
    
    return signalData;
  }
}