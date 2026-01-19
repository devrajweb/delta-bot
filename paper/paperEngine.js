class PaperEngine {
  constructor(initialBalance = 10000) {
    this.balance = initialBalance;
    this.positions = {};
    this.pnl = 0;
  }

  // Mimic the DeltaRest.fetchAccountBalance() structure
  async fetchAccountBalance() {
    return {
      result: {
        wallets: [
          {
            balance: this.balance,
          },
        ],
      },
    };
  }

  // Simulate placing a market order
  async placeMarketOrder(symbol, quantity, direction) {
    // In a real scenario, you'd get the fill price from the exchange.
    // For paper trading, we'll need to get the current price from our live price cache.
    // This is a placeholder for now, as we'll do this in app.js.
    return {
      symbol: symbol,
      quantity: quantity,
      direction: direction,
      status: "filled",
    };
  }

  // These methods will be called from app.js to update the paper account
  openPosition(symbol, quantity, direction, price) {
    if (this.positions[symbol]) return; // Already have a position
    this.positions[symbol] = {
      quantity: quantity,
      direction: direction,
      entryPrice: price,
    };
  }

  closePosition(symbol, price) {
    const position = this.positions[symbol];
    if (!position) return;

    const pnl = (price - position.entryPrice) * position.quantity * (position.direction === "long" ? 1 : -1);
    this.balance += pnl;
    this.pnl += pnl;
    delete this.positions[symbol];
    return pnl;
  }
}

module.exports = new PaperEngine();
