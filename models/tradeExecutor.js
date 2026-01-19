import strategy from "../config/strategy.config.js";
import { paperBuy } from "../paper/paperEngine.js";

let openTrades = {};

export async function tryEntry(symbol, price, Trade) {
  if (openTrades[symbol]) return;
  if (Math.random() > 0.03) return;

  const target = price * (1 + strategy.targetPercent / 100);
  const stop = price * (1 - strategy.stopLossPercent / 100);

  paperBuy(price);

  await Trade.create({
    symbol,
    side: "BUY",
    qty: 1,
    entry_price: price,
    target_price: target,
    stop_loss: stop,
    mode: process.env.TRADING_MODE
  });

  openTrades[symbol] = true;
  console.log(`🟢 ENTRY ${symbol} @ ${price}`);
}

export function closeTrade(symbol) {
  openTrades[symbol] = false;
}
