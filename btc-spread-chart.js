class BitcoinSpreadChart {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.messageCount = 0;
    
    // Market data
    this.currentPrice = 0;
    this.currentBid = 0;
    this.currentAsk = 0;
    this.currentSpread = 0;
    this.currentSpreadPct = 0;
    
    // Historical data for moving averages
    this.spreads = [];
    this.timestamps = [];
    this.prices = [];
    
    // Moving average periods
    this.maPeriods = [20, 50, 200];
    
    // Initialize chart
    this.initChart();
    
    // Start WebSocket connection
    this.connect();
  }
  
  initChart() {
    // Create the chart
    this.chart = LightweightCharts.createChart(document.getElementById('chart'), {
      layout: {
        background: { color: '#131722' },
        textColor: '#D1D4DC',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      rightPriceScale: { 
        visible: true,
        borderVisible: false,
      },
      leftPriceScale: { 
        visible: true,
        borderVisible: false,
      },
      timeScale: { 
        timeVisible: true, 
        secondsVisible: false,
        borderVisible: false,
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
      },
    });
    
    // Add price series (right scale)
    this.priceSeries = this.chart.addLineSeries({
      priceScaleId: 'right',
      color: '#00D4FF',
      lineWidth: 2,
      title: 'BTC Price',
    });
    
    // Add spread-based moving averages (left scale)
    this.ma20Series = this.chart.addLineSeries({
      priceScaleId: 'left',
      color: '#FF6B6B',
      lineWidth: 1,
      title: 'Spread MA20',
    });
    
    this.ma50Series = this.chart.addLineSeries({
      priceScaleId: 'left',
      color: '#4ADF86',
      lineWidth: 1,
      title: 'Spread MA50',
    });
    
    this.ma200Series = this.chart.addLineSeries({
      priceScaleId: 'left',
      color: '#FFD700',
      lineWidth: 1,
      title: 'Spread MA200',
    });
    
    // Fit chart to content
    this.chart.timeScale().fitContent();
  }
  
  connect() {
    try {
      this.ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
      
      this.ws.onopen = () => {
        console.log('Connected to Coinbase WebSocket');
        this.updateConnectionStatus(true);
        this.reconnectAttempts = 0;
        
        // Subscribe to ticker and level2 channels
        const subscribeMessage = {
          type: 'subscribe',
          channels: [
            {
              name: 'ticker',
              product_ids: ['BTC-USD']
            },
            {
              name: 'level2',
              product_ids: ['BTC-USD']
            }
          ]
        };
        
        this.ws.send(JSON.stringify(subscribeMessage));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.updateConnectionStatus(false);
        this.attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.updateConnectionStatus(false);
      };
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.updateConnectionStatus(false);
      this.attemptReconnect();
    }
  }
  
  handleMessage(message) {
    this.messageCount++;
    this.updateMessageCount();
    
    if (message.type === 'ticker') {
      this.handleTickerUpdate(message);
    } else if (message.type === 'snapshot') {
      this.handleOrderBookSnapshot(message);
    } else if (message.type === 'l2update') {
      this.handleOrderBookUpdate(message);
    }
  }
  
  handleTickerUpdate(data) {
    if (data.product_id === 'BTC-USD') {
      this.currentPrice = parseFloat(data.price);
      this.currentBid = parseFloat(data.best_bid);
      this.currentAsk = parseFloat(data.best_ask);
      
      this.calculateSpread();
      this.updateMarketData();
      
      // Add to historical data
      const timestamp = Math.floor(Date.now() / 1000);
      this.addDataPoint(timestamp, this.currentPrice, this.currentSpread);
    }
  }
  
  handleOrderBookSnapshot(data) {
    if (data.product_id === 'BTC-USD') {
      // Get best bid and ask from snapshot
      if (data.bids && data.bids.length > 0) {
        this.currentBid = parseFloat(data.bids[0][0]);
      }
      if (data.asks && data.asks.length > 0) {
        this.currentAsk = parseFloat(data.asks[0][0]);
      }
      
      this.calculateSpread();
      this.updateMarketData();
    }
  }
  
  handleOrderBookUpdate(data) {
    if (data.product_id === 'BTC-USD') {
      // Process level2 updates to maintain current best bid/ask
      data.changes.forEach(change => {
        const [side, price, size] = change;
        const priceFloat = parseFloat(price);
        const sizeFloat = parseFloat(size);
        
        if (side === 'buy' && sizeFloat > 0) {
          // Update best bid if this is a higher bid
          if (priceFloat > this.currentBid) {
            this.currentBid = priceFloat;
          }
        } else if (side === 'sell' && sizeFloat > 0) {
          // Update best ask if this is a lower ask
          if (priceFloat < this.currentAsk || this.currentAsk === 0) {
            this.currentAsk = priceFloat;
          }
        }
      });
      
      this.calculateSpread();
      this.updateMarketData();
    }
  }
  
  calculateSpread() {
    if (this.currentBid > 0 && this.currentAsk > 0) {
      this.currentSpread = this.currentAsk - this.currentBid;
      this.currentSpreadPct = (this.currentSpread / this.currentBid) * 100;
    }
  }
  
  addDataPoint(timestamp, price, spread) {
    this.timestamps.push(timestamp);
    this.prices.push(price);
    this.spreads.push(spread);
    
    // Keep only last 1000 data points to manage memory
    if (this.spreads.length > 1000) {
      this.timestamps.shift();
      this.prices.shift();
      this.spreads.shift();
    }
    
    // Update chart with new data
    this.updateChart(timestamp, price);
  }
  
  updateChart(timestamp, price) {
    // Add price point
    this.priceSeries.update({
      time: timestamp,
      value: price
    });
    
    // Calculate and add moving averages
    this.maPeriods.forEach(period => {
      const ma = this.calculateMovingAverage(this.spreads, period);
      if (ma !== null) {
        const series = period === 20 ? this.ma20Series : 
                      period === 50 ? this.ma50Series : this.ma200Series;
        
        series.update({
          time: timestamp,
          value: ma
        });
      }
    });
  }
  
  calculateMovingAverage(data, period) {
    if (data.length < period) return null;
    
    const recentData = data.slice(-period);
    const sum = recentData.reduce((acc, val) => acc + val, 0);
    return sum / period;
  }
  
  updateMarketData() {
    document.getElementById('current-price').textContent = 
      this.currentPrice > 0 ? `$${this.currentPrice.toFixed(2)}` : '--';
    
    document.getElementById('current-bid').textContent = 
      this.currentBid > 0 ? `$${this.currentBid.toFixed(2)}` : '--';
    
    document.getElementById('current-ask').textContent = 
      this.currentAsk > 0 ? `$${this.currentAsk.toFixed(2)}` : '--';
    
    document.getElementById('current-spread').textContent = 
      this.currentSpread > 0 ? `$${this.currentSpread.toFixed(2)}` : '--';
    
    document.getElementById('current-spread-pct').textContent = 
      this.currentSpreadPct > 0 ? `${this.currentSpreadPct.toFixed(4)}%` : '--';
  }
  
  updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connection-status');
    statusElement.textContent = connected ? 'Connected' : 'Disconnected';
    statusElement.className = connected ? 'connected' : 'disconnected';
  }
  
  updateMessageCount() {
    document.getElementById('message-count').textContent = `Messages: ${this.messageCount}`;
  }
  
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Initialize the chart when the page loads
document.addEventListener('DOMContentLoaded', () => {
  const chart = new BitcoinSpreadChart();
  
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    chart.disconnect();
  });
});