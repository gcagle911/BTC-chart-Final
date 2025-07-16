# Bitcoin Price Chart with Spread-Based Moving Averages

A real-time Bitcoin price chart that displays moving averages calculated from bid-ask spread data pulled directly from Coinbase's WebSocket feed.

## Features

- **Real-time Bitcoin price tracking** from Coinbase WebSocket
- **Bid-ask spread calculation** with both absolute ($) and percentage (%) values
- **Moving averages based on spread data** with 20, 50, and 200-period averages
- **Professional charting** using LightweightCharts library
- **Dual price scales** - Bitcoin price on the right, spread MAs on the left
- **Connection status monitoring** with automatic reconnection
- **Responsive design** with dark theme

## How It Works

1. **WebSocket Connection**: Connects to `wss://ws-feed.exchange.coinbase.com`
2. **Data Channels**: Subscribes to `ticker` and `level2` channels for BTC-USD
3. **Spread Calculation**: Calculates bid-ask spread from real-time order book data
4. **Moving Averages**: Computes 20, 50, and 200-period moving averages from the spread values
5. **Chart Display**: Shows Bitcoin price and spread-based MAs on a professional chart

## Files

- `btc-spread-chart.html` - Main HTML file with the chart interface
- `btc-spread-chart.js` - JavaScript implementation with WebSocket handling and chart logic
- `index.html` - Original chart (uses different data source)
- `chart.js` - Original chart JavaScript

## Usage

1. Open `btc-spread-chart.html` in a web browser
2. The chart will automatically connect to Coinbase WebSocket
3. Wait for the connection status to show "Connected"
4. Real-time data will start flowing and the chart will update automatically

## Chart Elements

### Price Display
- **Current Price**: Latest BTC price in USD
- **Bid**: Best bid price
- **Ask**: Best ask price  
- **Spread**: Absolute spread (Ask - Bid)
- **Spread %**: Percentage spread relative to bid price

### Chart Series
- **Blue Line (Right Scale)**: Bitcoin price in USD
- **Red Line (Left Scale)**: 20-period moving average of bid-ask spread
- **Green Line (Left Scale)**: 50-period moving average of bid-ask spread
- **Gold Line (Left Scale)**: 200-period moving average of bid-ask spread

## Technical Details

- **Data Source**: Coinbase Exchange WebSocket API
- **Chart Library**: LightweightCharts v4.0.0
- **Update Frequency**: Real-time (as fast as Coinbase sends updates)
- **Reconnection**: Automatic reconnection with exponential backoff
- **Memory Management**: Keeps last 1000 data points to manage memory usage

## Benefits of Spread-Based Moving Averages

Traditional moving averages use price data, but spread-based MAs provide unique insights:

- **Market Liquidity**: Lower spread MAs indicate better liquidity
- **Volatility Indicator**: Higher spread MAs often correlate with increased volatility
- **Market Efficiency**: Consistent low spreads suggest efficient market conditions
- **Trading Opportunities**: Spread MA crossovers can signal liquidity changes

## Browser Compatibility

Works in all modern browsers that support:
- WebSocket API
- ES6 Classes
- Canvas (for chart rendering)

## Rate Limits

Coinbase WebSocket has the following limits:
- 8 requests per second per IP
- Up to 20 requests for bursts
- 100 messages per second per IP on each connection

The application is designed to stay within these limits through efficient message handling.

## Troubleshooting

- **Connection Issues**: Check browser console for WebSocket errors
- **No Data**: Ensure internet connection and try refreshing the page
- **Chart Not Loading**: Verify that LightweightCharts CDN is accessible
- **Performance**: The chart automatically manages memory by keeping only recent data points