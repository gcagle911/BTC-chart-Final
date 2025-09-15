// Signal Manager
// Orchestrates all signal types and provides unified interface

import { SkullSignal } from './SkullSignal.js';
import { GoldXSignal } from './GoldXSignal.js';
import { SIGNAL_CONFIG } from './SignalConfig.js';

export class SignalManager {
  constructor() {
    this.skullSignal = new SkullSignal();
    this.goldXSignal = new GoldXSignal();
    
    // State tracking
    this.skullIndicatorEnabled = false;
    this.goldXIndicatorEnabled = false;
    this.signalsCalculated = false;
    this.signalSystemEnabled = false;
    
    console.log('📍 SignalManager initialized with all signal types');
  }

  // Calculate all signals for current asset/exchange/timeframe
  calculateAllSignals(rawData, currentSymbol, exchange, timeframe) {
    console.log(`🔄 CALCULATING SIGNALS: ${currentSymbol}_${exchange} on ${timeframe} (${rawData?.length || 0} points)`);
    
    if (!rawData || rawData.length < SIGNAL_CONFIG.GENERAL.MIN_DATA_POINTS) {
      console.warn(`⚠️ Insufficient data: ${rawData?.length || 0} points`);
      return;
    }
    
    // DEBUG: Check data validity
    const firstPoint = rawData[0];
    const lastPoint = rawData[rawData.length - 1];
    console.log(`🔍 DATA CHECK:`);
    console.log(`  First: ${firstPoint.time}, price: $${firstPoint.price?.toFixed(2)}`);
    console.log(`  Last: ${lastPoint.time}, price: $${lastPoint.price?.toFixed(2)}`);
    console.log(`  Today: ${new Date().toISOString()}`);
    
    // Calculate each signal type
    this.skullSignal.calculateSignals(rawData, currentSymbol, exchange, timeframe);
    this.goldXSignal.calculateSignals(rawData, currentSymbol, exchange, timeframe);
    
    this.signalsCalculated = true;
    
    console.log(`✅ RESULTS: ${this.skullSignal.getSignalCount()} skulls, ${this.goldXSignal.getSignalCount()} gold X on ${timeframe}`);
  }

  // Toggle skull indicator
  toggleSkullIndicator(enabled) {
    this.skullIndicatorEnabled = enabled;
    this.updateSignalSystemState();
    console.log(`💀 Skull indicator ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Toggle Gold X indicator  
  toggleGoldXIndicator(enabled) {
    this.goldXIndicatorEnabled = enabled;
    this.updateSignalSystemState();
    console.log(`✖️ Gold X indicator ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Update overall signal system state
  updateSignalSystemState() {
    this.signalSystemEnabled = this.skullIndicatorEnabled || this.goldXIndicatorEnabled;
  }

  // Get all markers for chart display
  getAllMarkers() {
    const markers = [];
    
    // Add skull markers if enabled
    if (this.skullIndicatorEnabled) {
      markers.push(...this.skullSignal.getMarkers());
    }
    
    // Add Gold X markers if enabled
    if (this.goldXIndicatorEnabled) {
      markers.push(...this.goldXSignal.getMarkers());
    }
    
    return markers;
  }

  // Get signal counts for status display
  getSignalCounts() {
    return {
      skull: this.skullIndicatorEnabled ? this.skullSignal.getSignalCount() : 0,
      goldX: this.goldXIndicatorEnabled ? this.goldXSignal.getSignalCount() : 0
    };
  }

  // Clear all signals (for asset/exchange/timeframe changes)
  clearAllSignals() {
    console.log('🧹 Clearing all signals');
    this.skullSignal.clearSignals();
    this.goldXSignal.clearSignals();
    this.signalsCalculated = false;
  }

  // Check for real-time signal triggers
  checkRealTimeSignals(currentData, rawData, currentSymbol, exchange, timeframe) {
    if (!this.signalSystemEnabled) return null;
    
    let triggeredSignal = null;
    
    // Check skull signals
    if (this.skullIndicatorEnabled && this.skullSignal.shouldTrigger(currentData, rawData, currentSymbol, exchange, timeframe)) {
      triggeredSignal = {
        type: 'skull',
        signal: this.skullSignal,
        data: currentData
      };
    }
    
    // Check Gold X signals (if no skull triggered)
    if (!triggeredSignal && this.goldXIndicatorEnabled && this.goldXSignal.shouldTrigger(currentData, rawData, currentSymbol, exchange, timeframe)) {
      triggeredSignal = {
        type: 'goldx',
        signal: this.goldXSignal,
        data: currentData
      };
    }
    
    return triggeredSignal;
  }

  // Trigger real-time signal
  triggerRealTimeSignal(signalType, currentTime, currentPrice) {
    let signal = null;
    
    if (signalType === 'skull' && this.skullIndicatorEnabled) {
      signal = this.skullSignal.triggerRealTimeSignal(currentTime, currentPrice);
    } else if (signalType === 'goldx' && this.goldXIndicatorEnabled) {
      signal = this.goldXSignal.triggerRealTimeSignal(currentTime, currentPrice);
    }
    
    return signal;
  }

  // Update signal status display
  updateStatusDisplay() {
    const statusEl = document.getElementById(SIGNAL_CONFIG.GENERAL.STATUS_ELEMENT_ID);
    if (!statusEl) return;
    
    const counts = this.getSignalCounts();
    
    if (!this.signalSystemEnabled) {
      statusEl.textContent = 'Toggle indicators to show historical signals';
    } else if (!this.signalsCalculated) {
      statusEl.textContent = 'Click "Calculate All Signals" to analyze historical data';
    } else {
      statusEl.textContent = `Showing: ${counts.skull} skulls, ${counts.goldX} gold X`;
    }
  }

  // Get system state for debugging
  getSystemState() {
    return {
      skullEnabled: this.skullIndicatorEnabled,
      goldXEnabled: this.goldXIndicatorEnabled,
      systemEnabled: this.signalSystemEnabled,
      signalsCalculated: this.signalsCalculated,
      skullCount: this.skullSignal.getSignalCount(),
      goldXCount: this.goldXSignal.getSignalCount()
    };
  }
}