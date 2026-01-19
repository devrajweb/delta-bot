class PositionSizer {
  calculateQty(accountBalance, riskPercent, entryPrice, stopLossPrice) {
    if (entryPrice === stopLossPrice) return 0;

    const riskAmount = accountBalance * (riskPercent / 100);
    const slDistance = Math.abs(entryPrice - stopLossPrice);
    const quantity = riskAmount / slDistance;

    return quantity;
  }
}

module.exports = new PositionSizer();
