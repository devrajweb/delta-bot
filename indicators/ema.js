const { EMA } = require("technicalindicators");

class EmaCalculator {
  calculateEma(candles, period) {
    const closePrices = candles.map((c) => c.close);
    return EMA.calculate({ period: period, values: closePrices });
  }

  getEmas(candles) {
    const ema20 = this.calculateEma(candles, 20);
    const ema50 = this.calculateEma(candles, 50);
    const ema200 = this.calculateEma(candles, 200);

    return {
      ema20: ema20.length > 0 ? ema20[ema20.length - 1] : undefined,
      ema50: ema50.length > 0 ? ema50[ema50.length - 1] : undefined,
      ema200: ema200.length > 0 ? ema200[ema200.length - 1] : undefined,
    };
  }
}

module.exports = new EmaCalculator();
