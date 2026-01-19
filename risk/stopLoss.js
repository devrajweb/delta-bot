class StopLossEngine {
  // SL at recent swing
  findRecentSwing(candles, direction) {
    // For a long, find the lowest low of the last N candles
    if (direction === "long") {
      return Math.min(...candles.slice(-5).map((c) => c.low));
    }
    // For a short, find the highest high of the last N candles
    if (direction === "short") {
      return Math.max(...candles.slice(-5).map((c) => c.high));
    }
    return null;
  }

  // OR fixed % fallback
  calculateFixedPercentageSL(entryPrice, direction, percentage) {
    if (direction === "long") {
      return entryPrice * (1 - percentage / 100);
    }
    if (direction === "short") {
      return entryPrice * (1 + percentage / 100);
    }
    return null;
  }

  // Auto SL placement
  getStopLoss(candles, entryPrice, direction) {
    let sl = this.findRecentSwing(candles, direction);
    if (!sl) {
      sl = this.calculateFixedPercentageSL(entryPrice, direction, 1); // 1% fallback
    }
    return sl;
  }
}

module.exports = new StopLossEngine();
