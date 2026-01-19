const OrderTracker = require("./orderTracker");
const DeltaRest = require("../exchange/deltaRest");

const tradingMode = (process.env.TRADING_MODE || "PAPER").toUpperCase();

class PositionManager {
  constructor() {
    this.positions = {}; // { symbol: position }
  }

  // One position per coin
  hasPosition(symbol) {
    return !!this.positions[symbol];
  }

  getPosition(symbol) {
    return this.positions[symbol];
  }

  async openPosition(Trade, symbol, direction, quantity, entryPrice, stopLoss, takeProfits) {
    if (this.hasPosition(symbol)) {
      console.log(`Preventing double entry for ${symbol}.`);
      return;
    }

    let marketOrder = { id: `PAPER-${Date.now()}` };
    if (tradingMode === "LIVE") {
      marketOrder = await DeltaRest.placeMarketOrder(symbol, quantity, direction);
    }

    const trade = await Trade.create({
      symbol: symbol,
      side: direction,
      qty: quantity,
      entryPrice: entryPrice,
      entryOrderId: marketOrder.id,
      tradingMode: tradingMode,
    });

    this.positions[symbol] = {
      symbol,
      direction,
      quantity,
      entryPrice,
      stopLoss,
      takeProfits,
      orders: { market: marketOrder },
      dbEntry: trade,
    };

    console.log(`✅ Position opened and logged for ${symbol}.`);
  }

  async closePosition(symbol, exitPrice) {
    const position = this.positions[symbol];
    if (position) {
      if (tradingMode === "LIVE") {
        await DeltaRest.closePosition(symbol);
      }

      const pnl = (exitPrice - position.entryPrice) * position.quantity * (position.direction === "long" ? 1 : -1);

      await position.dbEntry.update({
        status: "CLOSED",
        exitPrice: exitPrice,
        exitTime: new Date(),
        pnl: pnl,
        realizedPnl: pnl, // Simplified for now
      });

      delete this.positions[symbol];
      console.log(`❌ Position closed and logged for ${symbol}.`);
    }
  }

  // Emergency close all
  async emergencyCloseAll(currentPrices) {
    console.log("🚨 EMERGENCY CLOSE ALL POSITIONS 🚨");
    for (const symbol in this.positions) {
      await this.closePosition(symbol, currentPrices[symbol]);
    }
  }
}

module.exports = new PositionManager();
