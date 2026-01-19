class TrendDetector {
  detectTrend(emas, price) {
    const { ema50 } = emas;
    // const { ema50, ema200 } = emas;  // TODO: Enable EMA200 when enough candles available

    // Handle missing EMAs (not enough candles yet)
    if (!ema50) {
      return "sideways";
    }

    // Simplified trend detection without EMA200 (for faster startup)
    // TODO: Add EMA200 comparison for stronger trend confirmation
    const trend = price > ema50 ? "bullish" : "bearish";
    return trend;

    /* FUTURE: Enhanced trend with EMA200
    // Bullish Trend
    if (ema50 > ema200 && price > ema50) {
      return "bullish";
    }

    // Bearish Trend
    if (ema50 < ema200 && price < ema50) {
      return "bearish";
    }

    // Sideways Trend
    return "sideways";
    */
  }
}

module.exports = new TrendDetector();
