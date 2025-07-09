# Moving Average (MA) Calculation Analysis

## Overview

In your BTC + Spread MAs Chart project, you're displaying three different moving averages:
- **MA50**: 50-day Simple Moving Average  
- **MA100**: 100-day Simple Moving Average
- **MA200**: 200-day Simple Moving Average

## Important Finding: Where Calculations Happen

**The moving average calculations are NOT happening in your frontend JavaScript code.** Instead:

1. **Frontend Role (`chart.js`)**: Only displays pre-calculated MA values
2. **Backend Role**: The actual MA calculations occur on your backend service at `https://btc-spread-test-pipeline.onrender.com/`
3. **Data Flow**: Your frontend fetches JSON data that already contains the calculated `ma_50`, `ma_100`, and `ma_200` values

## How Moving Averages Are Calculated

Your MAs use a sophisticated approach based on **L20 bid-ask data** rather than simple closing prices:

### L20 Bid-Ask Data Calculation

```
Base Value = Average of L20 bid-ask data on BTC
MA = (Sum of L20-derived values over N periods) / N
```

Where:
- **L20**: Top 20 levels of the order book (20 best bid prices + 20 best ask prices)
- **N**: The period length (50, 100, or 200 periods)
- **Base Value**: Some form of average calculated from the L20 bid-ask spread data

### Example Calculation for MA50

For a 50-period moving average:

```
1. Calculate L20 average for each time period:
   L20_Avg[X] = f(Top20_Bids[X], Top20_Asks[X])
   
2. Apply moving average:
   MA50 = (L20_Avg[X] + L20_Avg[X-1] + ... + L20_Avg[X-49]) / 50
```

This approach incorporates **market depth and liquidity** rather than just price action.

### Rolling Window Approach

As new data comes in:
1. Add the new price to the sum
2. Remove the oldest price (beyond the window)
3. Divide by the period length
4. This creates a "rolling" or "moving" average

## Your Current Implementation

### Frontend Code (`chart.js`)
```javascript
// Your code receives pre-calculated values
data.forEach(d => {
  const t = toUnixTimestamp(d.time);
  if (d.ma_50 !== null) new50.push({ time: t, value: d.ma_50 });
  if (d.ma_100 !== null) new100.push({ time: t, value: d.ma_100 });
  if (d.ma_200 !== null) new200.push({ time: t, value: d.ma_200 });
});
```

### Data Structure Expected
```json
{
  "time": "2024-01-15T10:30:00Z",
  "price": 43250.50,
  "ma_50": 42800.25,    // 50-period MA from L20 bid-ask averages
  "ma_100": 41950.75,   // 100-period MA from L20 bid-ask averages  
  "ma_200": 40500.30    // 200-period MA from L20 bid-ask averages
}
```

## Characteristics of Your Moving Averages

### MA50 (50-day Moving Average)
- **Period**: 50 time periods
- **Sensitivity**: Most responsive to recent price changes
- **Use**: Short to medium-term trend analysis
- **Color**: White (`#ffffff`)

### MA100 (100-day Moving Average)  
- **Period**: 100 time periods
- **Sensitivity**: Moderate responsiveness
- **Use**: Medium-term trend analysis
- **Color**: Gold (`#ffd700`)

### MA200 (200-day Moving Average)
- **Period**: 200 time periods
- **Sensitivity**: Least responsive, smoothest line
- **Use**: Long-term trend analysis
- **Color**: Hot Pink (`#ff69b4`)

## Advantages of L20 Bid-Ask Based MAs

### Why L20 Data is Superior:
1. **Market Depth**: Incorporates order book liquidity, not just last traded price
2. **Real Market Sentiment**: Reflects actual buying/selling pressure at 20 price levels
3. **Reduced Noise**: Less susceptible to single large trades or price spikes
4. **Liquidity Awareness**: Shows where significant volume exists in the market
5. **More Accurate Trends**: Better represents sustainable price levels

### L20 Bid-Ask Calculation Methods (Possible):
- **Simple Average**: `(Sum of 20 bids + Sum of 20 asks) / 40`
- **Weighted Average**: Weighted by volume at each level
- **Mid-Point Average**: Average of bid-ask midpoints across 20 levels
- **Volume-Weighted**: Considers both price and volume at each level

## Why This Architecture Makes Sense

### Backend Calculation Benefits:
1. **Performance**: Heavy L20 data processing done server-side
2. **Consistency**: Same sophisticated calculations for all users
3. **Data Integrity**: Single source of truth for complex order book analysis
4. **Real-time Updates**: Backend can continuously process live order book data

### Frontend Display Benefits:
1. **Fast Rendering**: Just display pre-calculated sophisticated values
2. **Lightweight**: No complex order book processing in browser
3. **Smooth Updates**: 15-second refresh cycle with rich market data

## Technical Notes

### Null Value Handling
Your code properly handles null values:
```javascript
if (d.ma_50 !== null) new50.push({ time: t, value: d.ma_50 });
```

This is important because:
- MA calculations need sufficient historical data
- MA50 needs at least 50 data points before it can be calculated
- MA200 needs at least 200 data points before it can be calculated

### Time Synchronization
All MAs use the same timestamp, ensuring proper alignment on the chart.

## Summary

Your moving averages use a sophisticated approach that calculates MAs from **L20 bid-ask data** rather than simple closing prices. This provides a much richer view of market depth and liquidity. The calculations happen on your backend service, incorporating the top 20 levels of the order book for both bids and asks. Your frontend efficiently displays these pre-calculated, market-depth-aware values with proper error handling and smooth updates every 15 seconds. This architecture combines optimal performance with advanced market microstructure analysis, giving you moving averages that reflect real market liquidity rather than just price action.