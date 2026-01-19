class TakeProfitEngine {
  constructor() {
    this.tp1Hit = false;
  }

  calculateTakeProfits(entryPrice, stopLossPrice, direction) {
    const riskDistance = Math.abs(entryPrice - stopLossPrice);

    if (direction === "long") {
      const tp1 = entryPrice + riskDistance;
      const tp2 = entryPrice + 2 * riskDistance;
      return { tp1, tp2 };
    }

    if (direction === "short") {
      const tp1 = entryPrice - riskDistance;
      const tp2 = entryPrice - 2 * riskDistance;
      return { tp1, tp2 };
    }

    return {};
  }

  checkTakeProfits(currentPrice, takeProfits, direction, onTp1) {
    if (
      !this.tp1Hit &&
      ((direction === "long" && currentPrice >= takeProfits.tp1) ||
        (direction === "short" && currentPrice <= takeProfits.tp1))
    ) {
      this.tp1Hit = true;
      onTp1(); // Callback to move SL to breakeven and close 50%
    }

    if (
      (direction === "long" && currentPrice >= takeProfits.tp2) ||
      (direction === "short" && currentPrice <= takeProfits.tp2)
    ) {
      // Close remaining position
      return "tp2";
    }

    return "none";
  }

  reset() {
    this.tp1Hit = false;
  }
}

module.exports = new TakeProfitEngine();
