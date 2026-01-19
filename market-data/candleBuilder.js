const { fileURLToPath } = require("url");
const { dirname } = require("path");

class CandleBuilder {
  constructor() {
    this.candles = {};
    this.lastPrice = {};
  }

  // Convert ticks to 1m candles
  addTick(symbol, price, volume) {
    const now = new Date();
    const minute = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
    const timestamp = minute.getTime();

    if (!this.candles[symbol]) {
      this.candles[symbol] = {};
    }

    if (!this.candles[symbol][timestamp]) {
      const lastPrice = this.lastPrice[symbol] || price;
      this.candles[symbol][timestamp] = {
        open: lastPrice,
        high: lastPrice,
        low: lastPrice,
        close: price,
        volume: 0,
        timestamp: timestamp,
      };
    }

    const candle = this.candles[symbol][timestamp];
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
    candle.volume += volume;
    this.lastPrice[symbol] = price;
  }

  // Aggregate 1m → 5m / 15m / 1h
  aggregateCandles(symbol, timeframe) {
    const aggregatedCandles = {};
    const oneMinuteCandles = this.candles[symbol];
    if (!oneMinuteCandles) return [];

    for (const timestamp in oneMinuteCandles) {
      const candle = oneMinuteCandles[timestamp];
      const newTimestamp = Math.floor(timestamp / timeframe) * timeframe;

      if (!aggregatedCandles[newTimestamp]) {
        aggregatedCandles[newTimestamp] = {
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
          timestamp: newTimestamp,
        };
      } else {
        const aggCandle = aggregatedCandles[newTimestamp];
        aggCandle.high = Math.max(aggCandle.high, candle.high);
        aggCandle.low = Math.min(aggCandle.low, candle.low);
        aggCandle.close = candle.close;
        aggCandle.volume += candle.volume;
      }
    }
    return Object.values(aggregatedCandles);
  }

  // Store candles in memory
  getCandles(symbol, timeframe = 60000) {
    let candles;
    if (timeframe === 60000) {
      candles = this.candles[symbol] ? Object.values(this.candles[symbol]) : [];
    } else {
      candles = this.aggregateCandles(symbol, timeframe);
    }

    // Data Validation
    candles = this.validateCandles(candles);

    return candles;
  }

  validateCandles(candles) {
    // Ignore empty candles
    const nonEmptyCandles = candles.filter((c) => c.volume > 0);

    // Minimum 5 candles for testing (in live: use 20-50)
    const minCandles = 1; // Reduced for testing
    if (nonEmptyCandles.length < minCandles) {
      // Only log every 10th check to avoid spam
      if (nonEmptyCandles.length % 10 === 0 || nonEmptyCandles.length === 1) {
        console.log(`⏳ Building candles: ${nonEmptyCandles.length}/${minCandles}`);
      }
      return []; // Return empty until we have enough data
    }

    console.log(`✅ CANDLES READY: ${nonEmptyCandles.length} candles available`);
    return nonEmptyCandles;
  }
}

module.exports = new CandleBuilder();
