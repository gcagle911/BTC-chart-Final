# Trading Bot Trigger Requirements

**Last Updated**: September 15, 2025  
**System**: Production-ready timeframe-dependent trigger system  
**Sustain Requirement**: 50% of candle duration for both buy and sell

---

## 🎯 **ACTIVE TRIGGER REQUIREMENTS**

### ❌ **SELL SIGNALS** (Red X above candles)

| Requirement | Condition | Value | Status |
|-------------|-----------|-------|--------|
| **Layer Qualification** | ANY layer (L5, L50, L100) qualifies | At least 1 layer | ✅ **ACTIVE** |
| **MA Requirements per Layer** | ALL MAs (20, 50, 100, 200) in top 25% | 4 out of 4 MAs | ✅ **ACTIVE** |
| **Percentile Window** | Rolling window for top 25% calculation | 48 hours | ✅ **ACTIVE** |
| **Asset/Exchange Isolation** | Independent calculations per pair | Strict separation | ✅ **ACTIVE** |

**Detailed Logic:**
- **Layer Check**: Check L5, L50, and L100 layers independently
- **MA Requirement**: For a layer to qualify, ALL 4 MAs (20, 50, 100, 200 period) must be in their top 25%
- **Top 25% Calculation**: Based on rolling 48-hour window for THIS asset/exchange only
- **Trigger Condition**: If ANY layer qualifies (L5 OR L50 OR L100), trigger sell signal
- **Sustain**: Must be true for 50% of candle duration
- **Cooldown**: 1 hour after trigger (60 minutes) per asset/exchange
- **Isolation**: BTC_coinbase calculations NEVER affect BTC_kraken, ETH_upbit, etc.

**Examples:**
- **L50 Qualifies**: L50MA20, L50MA50, L50MA100, L50MA200 all >= their 48h 75th percentile → TRIGGER
- **L5 Qualifies**: L5MA20, L5MA50, L5MA100, L5MA200 all >= their 48h 75th percentile → TRIGGER  
- **None Qualify**: No layer has all 4 MAs in top 25% → NO TRIGGER

---

### 🟢 **BUY SIGNALS** (Green Circle below candles)

| Requirement | Condition | Value | Status |
|-------------|-----------|-------|--------|
| *No requirements yet* | - | - | ⏳ **PENDING** |

**Waiting for buy trigger requirements...**

---

## ⚙️ **SYSTEM CONFIGURATION**

### Global Settings
```javascript
TRIGGER_CONFIG.global = {
  sustainedPercent: 0.5,        // 50% of candle must meet conditions
  realTimeCheckInterval: 5000,  // Check every 5 seconds
  debugMode: true               // Enable detailed logging
}
```

### Cooldown Settings
```javascript
cooldown: {
  enabled: true,
  durationMinutes: 60  // 1 hour cooldown after trigger
}
```

---

## 🔧 **HOW TO ADD NEW REQUIREMENTS**

### Step 1: Add to Configuration
```javascript
// In TRIGGER_CONFIG.sell.conditions or TRIGGER_CONFIG.buy.conditions
newRequirement_threshold: 0.123  // Your threshold value
```

### Step 2: Add Logic to checkMinuteTriggerConditions()
```javascript
// Add condition check
const newValue = calculateTriggerMA(rawData, currentIndex, 'fieldName', period);
const newConditionMet = newValue >= config.conditions.newRequirement_threshold;

// Combine with existing conditions (AND logic)
const allConditionsMet = existingCondition && newConditionMet;
```

### Step 3: Update This README
Add the new requirement to the table above.

---

## 📊 **AVAILABLE DATA FOR TRIGGERS**

### Price Data
- `minuteData.price` - Current BTC price
- `calculateTriggerMA(rawData, index, 'price', period)` - Price moving averages

### Spread Data  
- `minuteData.spread_L5_pct_avg` - L5 spread percentage
- `minuteData.spread_L50_pct_avg` - L50 spread percentage  
- `minuteData.spread_L100_pct_avg` - L100 spread percentage
- `calculateTriggerMA(rawData, index, 'spread_L50_pct_avg', 50)` - L50MA50

### Volume Data
- `minuteData.vol_L50_bids` - L50 bid volume
- `minuteData.vol_L50_asks` - L50 ask volume

### Dynamic Thresholds
- `calculateDynamicThreshold(rawData, 'fieldName', percentile)` - Percentile-based thresholds
- Examples: 5th percentile (0.05), 95th percentile (0.95)

---

## 🧪 **TESTING TRIGGERS**

### Manual Testing
1. Enable signal indicators (❌ Sell / 🟢 Buy checkboxes)
2. Click "🔄 Calculate All Signals"
3. Check console logs for detailed trigger analysis
4. Look for markers on chart

### Bot API Testing
```javascript
// Get current signals
const signals = window.TradingBotAPI.getCurrentSignals();

// Get market data
const market = window.TradingBotAPI.getLatestMarketData();

// Test trigger evaluation
const sellEval = window.TradingBotAPI.evaluateCurrentTrigger('sell');
const buyEval = window.TradingBotAPI.evaluateCurrentTrigger('buy');
```

---

## 📈 **TIMEFRAME BEHAVIOR**

| Timeframe | Candle Duration | 50% Requirement | Noise Level |
|-----------|----------------|-----------------|-------------|
| **1m** | 1 minute | ~30 seconds | High (very responsive) |
| **5m** | 5 minutes | ~2.5 minutes | Medium |
| **15m** | 15 minutes | ~7.5 minutes | Medium-Low |
| **1h** | 60 minutes | ~30 minutes | Low (filtered) |
| **4h** | 240 minutes | ~2 hours | Very Low (selective) |
| **1d** | 1440 minutes | ~12 hours | Extremely Low |

---

## 🔄 **SIGNAL LIFECYCLE**

1. **Real-time Preview**: Dimmed marker shows while current candle meets conditions
2. **Candle Close**: When candle closes, check if 50% threshold was met
3. **Confirmation**: If threshold met, add bright permanent marker
4. **Cooldown**: No new signals of same type for 1 hour
5. **Bot Integration**: API provides both preview and confirmed signals

---

## 📝 **CHANGE LOG**

| Date | Change | Requirements Added |
|------|--------|-------------------|
| 2025-09-15 | Initial setup | Sell: L50MA50 >= 0.035 |
| | | Buy: *Pending* |

---

## 🚀 **NEXT REQUIREMENTS TO ADD**

### Buy Signal Requirements (Pending)
- *Waiting for specifications...*

### Additional Sell Requirements (Future)
- *Can be added as needed...*

---

**📍 Remember to update this README whenever new trigger requirements are added!**