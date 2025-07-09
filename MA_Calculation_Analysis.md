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

## How Simple Moving Averages Are Calculated

Based on standard financial analysis practices, your MAs are likely calculated using the **Simple Moving Average (SMA)** formula:

### Simple Moving Average Formula

```
SMA = (Sum of closing prices over N periods) / N
```

Where:
- N = the period length (50, 100, or 200 days)
- Closing prices = Bitcoin price at the end of each time period

### Example Calculation for MA50

For a 50-day moving average on day X:

```
MA50 = (Price[X] + Price[X-1] + Price[X-2] + ... + Price[X-49]) / 50
```

This gives you the average price over the last 50 trading periods.

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
  "ma_50": 42800.25,
  "ma_100": 41950.75,
  "ma_200": 40500.30
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

## Why This Approach Makes Sense

### Backend Calculation Benefits:
1. **Performance**: Heavy calculations done server-side
2. **Consistency**: Same calculations for all users
3. **Data Integrity**: Single source of truth
4. **Real-time Updates**: Backend can continuously update calculations

### Frontend Display Benefits:
1. **Fast Rendering**: Just display pre-calculated values
2. **Lightweight**: No mathematical processing in browser
3. **Smooth Updates**: 15-second refresh cycle

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

Your moving averages are calculated using the standard Simple Moving Average formula on your backend service. The frontend efficiently displays these pre-calculated values with proper error handling and smooth updates every 15 seconds. This architecture provides optimal performance while maintaining accuracy in the technical analysis indicators.