// Signal System Configuration
// Centralized configuration for all signal types

export const SIGNAL_CONFIG = {
  // Skull Signal Configuration
  SKULL: {
    TYPE: 'skull',
    EMOJI: '💀',
    COLOR: '#FF0000',
    POSITION: 'aboveBar',
    COOLOFF_PERIOD: 60 * 60 * 1000, // 1 hour in milliseconds
    SPREAD_THRESHOLD_PERCENTILE: 0.85, // Top 15% (1 - 0.15)
    SLOPE_THRESHOLD_PERCENTILE: 0.95, // Top 5% (1 - 0.05)
    REQUIRED_LAYERS: 2, // Require 2 of 3 spread layers
    TOTAL_LAYERS: 3,
    SUSTAINED_PERCENTAGE: 0.7, // 70% of candle duration
    LAYERS: ['spread_L5_pct_avg', 'spread_L50_pct_avg', 'spread_L100_pct_avg'],
    MARKER_PRICE_MULTIPLIER: 1.02 // 2% above current price
  },

  // Gold X Signal Configuration  
  GOLDX: {
    TYPE: 'goldx',
    EMOJI: '✖',
    COLOR: '#FFD700', 
    POSITION: 'belowBar',
    PRICE_DROP_THRESHOLD: 1.75, // 1.75% price drop
    PRICE_DROP_WINDOW: 120, // 2 hours in minutes
    SUSTAINED_PERCENTAGE: 0.5, // 50% of candle duration
    MA_PERIODS: [20, 50, 100], // Moving average periods
    MA_FIELD: 'spread_L50_pct_avg',
    MARKER_PRICE_MULTIPLIER: 1.02 // 2% above current price
  },

  // General Signal Configuration
  GENERAL: {
    MIN_DATA_POINTS: 50, // Minimum data required for calculation
    MARKER_SIZE: 2,
    DEBUG_CANDLE_LIMIT: 3, // Number of candles to debug when no signals found
    STATUS_ELEMENT_ID: 'signal-status'
  }
};

// Timeframe configurations (copied from chart.js for independence)
export const TIMEFRAME_CONFIG = {
  '1m': { seconds: 60, label: '1 Minute' },
  '5m': { seconds: 300, label: '5 Minutes' },
  '15m': { seconds: 900, label: '15 Minutes' },
  '1h': { seconds: 3600, label: '1 Hour' },
  '4h': { seconds: 14400, label: '4 Hours' },
  '1d': { seconds: 86400, label: '1 Day' }
};

// Helper function to get timeframe seconds
export function getTimeframeSeconds(timeframe) {
  return TIMEFRAME_CONFIG[timeframe]?.seconds || 60;
}

// Helper function to convert time to Unix timestamp
export function toUnixTimestamp(time) {
  if (typeof time === 'number') return time;
  return Math.floor(new Date(time).getTime() / 1000);
}

// Helper function to format date for logging
export function formatDateForLogging(timestamp) {
  return new Date(timestamp * 1000).toISOString();
}