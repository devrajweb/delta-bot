import { closeTrade } from "./tradeExecutor.js";
import { paperBuy, paperSell } from "../paper/paperEngine.js";
import { liveBuy, liveSell } from "./liveExecutor.js";

export async function checkExit(symbol, price, Trade) {
  const trade = await Trade.findOne({ where: { symbol, status: "OPEN" } });
  if (!trade) return;

  let exitReason = "";
  let isProfit = false;
  let pnl = 0;

  const isLong = trade.side === "BUY";

  if (isLong) {
    // LONG position: profit if price goes up
    if (price >= trade.target_price) {
      exitReason = `TARGET HIT 🎯`;
      isProfit = true;
    } else if (price <= trade.stop_loss) {
      exitReason = `STOP LOSS 🛑`;
      isProfit = false;
    } else {
      return;
    }
    pnl = price - trade.entry_price;
    if ((process.env.TRADING_MODE || "PAPER").toUpperCase() === "LIVE") {
      try {
        await liveSell(symbol, trade.qty, price, undefined, true); // reduceOnly = true
      } catch (err) {
        console.error("⚠️ Live Exit Failed (will retry):", err.message);
        return; // Don't close trade in DB, retry next tick
      }
    } else {
      paperSell(symbol, trade.qty, price);
    }
  } else {
    // SHORT position: profit if price goes down
    if (price <= trade.target_price) {
      exitReason = `TARGET HIT 🎯`;
      isProfit = true;
    } else if (price >= trade.stop_loss) {
      exitReason = `STOP LOSS 🛑`;
      isProfit = false;
    } else {
      return;
    }
    pnl = trade.entry_price - price; // For SHORT: entry - exit
    if ((process.env.TRADING_MODE || "PAPER").toUpperCase() === "LIVE") {
      try {
        await liveBuy(symbol, trade.qty, price, undefined, true); // reduceOnly = true
      } catch (err) {
        console.error("⚠️ Live Exit Failed (will retry):", err.message);
        return; // Don't close trade in DB, retry next tick
      }
    } else {
      paperBuy(symbol, trade.qty, price);
    }
  }

  const pnlPercent = ((pnl / trade.entry_price) * 100).toFixed(2);
  const emoji = isProfit ? "📈" : "📉";
  const action = isLong ? "SELL" : "BUY";

  // Update trade record
  trade.exit_price = price;
  trade.status = "CLOSED";
  trade.pnl = pnl;
  await trade.save();

  closeTrade(symbol);
  console.log(
    `${emoji} ${action} (Close) ${symbol} | Qty: ${trade.qty} @ $${price.toFixed(2)} | PnL: $${pnl.toFixed(
      2
    )} (${pnlPercent}%) | ${exitReason}`
  );
}
