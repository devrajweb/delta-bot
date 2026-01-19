class MarketFilters {
  // RSI between 45–55 → skip
  isRsiNeutral(rsi, min = 45, max = 55) {
    return rsi > min && rsi < max;
  }

  // EMA50 ≈ EMA200 → skip
  isEmaSideways(ema50, ema200, tolerance = 0.01) {
    // 1% tolerance
    const diff = Math.abs(ema50 - ema200);
    return diff / ema50 < tolerance;
  }

  // Low volume → skip
  isVolumeLow(currentVolume, averageVolume) {
    return currentVolume < averageVolume;
  }

  shouldFilter(indicators) {
    if (this.isRsiNeutral(indicators.rsi.rsi)) {
      console.log("🚫 Filter: RSI is neutral (" + indicators.rsi.rsi?.toFixed(2) + ")");
      return true;
    }
    if (this.isEmaSideways(indicators.emas.ema50, indicators.emas.ema200)) {
      console.log(
        "🚫 Filter: EMAs are sideways (EMA50: " +
          indicators.emas.ema50?.toFixed(2) +
          ", EMA200: " +
          indicators.emas.ema200?.toFixed(2) +
          ")",
      );
      return true;
    }
    if (this.isVolumeLow(indicators.volume.currentVolume, indicators.volume.averageVolume)) {
      console.log(
        "🚫 Filter: Volume is low (current: " +
          indicators.volume.currentVolume +
          ", avg: " +
          indicators.volume.averageVolume?.toFixed(2) +
          ")",
      );
      return true;
    }
    return false;
  }
}

module.exports = new MarketFilters();
