const EmaCalculator = require("../indicators/ema.js");
const RsiCalculator = require("../indicators/rsi.js");
const VolumeAnalyzer = require("../indicators/volume.js");
const TrendDetector = require("./trend.js");
const MarketFilters = require("../filters/marketFilters.js");

class EntryLogic {
  constructor() {
    this.openPosition = null; // can be 'long', 'short', or null
  }

  checkEntry(candles) {
    //if (candles.length < 200) {
    // Need at least 200 candles for EMA200 calculation
    if (candles.length < 20) {
      // Need at least 20 candles for faster startup (still reasonable for EMA20/50)
      return { signal: "none" };
    }

    const emas = EmaCalculator.getEmas(candles);
    const rsiInfo = RsiCalculator.getRsi(candles);
    const volumeInfo = VolumeAnalyzer.getVolumeInfo(candles);
    const price = candles[candles.length - 1].close;
    const { ema20, ema50, ema200 } = emas;

    // DEBUG: Log conditions for first candle of each minute
    const lastCandle = candles[candles.length - 1];
    const secondLastCandle = candles[candles.length - 2] || {};
    if (!secondLastCandle.timestamp || lastCandle.timestamp !== secondLastCandle.timestamp) {
      console.log("\n📈 ENTRY CHECK:", {
        price: price.toFixed(2),
        ema20: ema20?.toFixed(2) || "N/A",
        ema50: ema50?.toFixed(2) || "N/A",
        ema200: ema200?.toFixed(2) || "N/A",
        rsi: rsiInfo.rsi?.toFixed(2) || "N/A",
        trend: TrendDetector.detectTrend(emas, price),
        pullback: RsiCalculator.detectPullback(rsiInfo.rsi, TrendDetector.detectTrend(emas, price)),
        volumeSpike: volumeInfo.volumeSpike,
        hasOpenPosition: !!this.openPosition,
      });
    }

    const filterResult = MarketFilters.shouldFilter({ emas, rsi: rsiInfo, volume: volumeInfo });
    if (filterResult) {
      console.log("🚫 Trade filtered by MarketFilters");
      return { signal: "none" };
    }

    const trend = TrendDetector.detectTrend(emas, price);
    const pullback = RsiCalculator.detectPullback(rsiInfo.rsi, trend);

    console.log("✅ Passed filters - Trend:", trend, "| Pullback:", pullback);

    // LONG ENTRY
    if (
      trend === "bullish" &&
      pullback === "long" &&
      ema20 &&
      ema50 &&
      price >= ema20 &&
      price >= ema50 &&
      volumeInfo.volumeSpike &&
      !this.openPosition
    ) {
      console.log("🎯 LONG SIGNAL TRIGGERED!");
      this.openPosition = "long";
      return {
        signal: "long",
        price: price,
        timestamp: Date.now(),
      };
    }

    // SHORT ENTRY
    if (
      trend === "bearish" &&
      pullback === "short" &&
      ema20 &&
      ema50 &&
      price <= ema20 &&
      price <= ema50 &&
      volumeInfo.volumeSpike &&
      !this.openPosition
    ) {
      console.log("🎯 SHORT SIGNAL TRIGGERED!");
      this.openPosition = "short";
      return {
        signal: "short",
        price: price,
        timestamp: Date.now(),
      };
    }

    return { signal: "none" };
  }

  closePosition() {
    this.openPosition = null;
  }
}

module.exports = new EntryLogic();
