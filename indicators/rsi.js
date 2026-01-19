const { RSI } = require("technicalindicators");

class RsiCalculator {
  calculateRsi(candles, period) {
    const closePrices = candles.map((c) => c.close);
    return RSI.calculate({ period: period, values: closePrices });
  }

  // Detect pullback zones (expanded ranges for better signal generation)
  detectPullback(rsiValue, trend) {
    if (trend === "bullish" && rsiValue >= 35 && rsiValue <= 55) {
      return "long";
    }
    if (trend === "bearish" && rsiValue >= 45 && rsiValue <= 65) {
      return "short";
    }
    return "none";
  }

  getRsi(candles) {
    const rsi14 = this.calculateRsi(candles, 14);
    const lastRsi = rsi14.length > 0 ? rsi14[rsi14.length - 1] : undefined;

    return {
      rsi: lastRsi,
    };
  }
}

module.exports = new RsiCalculator();
