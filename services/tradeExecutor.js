import strategy from "../config/strategy.config.js";
import coins from "../config/coins.js";
import { paperBuy, paperSell } from "../paper/paperEngine.js";
import { liveBuy, liveSell } from "./liveExecutor.js";
import { getPriceHistory } from "./priceHistory.js";
import { EMA } from "technicalindicators";

let openTrades = {};
let tradeCount = {}; // Track trades per symbol

const FAST_EMA_PERIOD = 9;
const SLOW_EMA_PERIOD = 21;

// Get qty and leverage from coins config
function getCoinConfig(symbol) {
  const coin = coins.find((c) => c.symbol === symbol);
  return coin || { qty: 1, leverage: 10 }; // Default values
}

export async function tryEntry(symbol, price, Trade) {
  // Check if already in trade
  if (openTrades[symbol]) return;

  const priceHistory = getPriceHistory(symbol);

  // Check if we have enough data for EMAs
  if (priceHistory.length < SLOW_EMA_PERIOD) {
    console.log(`⏳ Collecting more price data for ${symbol}... (${priceHistory.length}/${SLOW_EMA_PERIOD})`);
    return;
  }

  // Calculate EMAs
  const currentPrices = priceHistory.slice(); // Create a copy
  const previousPrices = priceHistory.slice(0, -1);

  const currentFastEma = EMA.calculate({ period: FAST_EMA_PERIOD, values: currentPrices });
  const currentSlowEma = EMA.calculate({ period: SLOW_EMA_PERIOD, values: currentPrices });
  const previousFastEma = EMA.calculate({ period: FAST_EMA_PERIOD, values: previousPrices });
  const previousSlowEma = EMA.calculate({ period: SLOW_EMA_PERIOD, values: previousPrices });

  const lastCurrentFastEma = currentFastEma[currentFastEma.length - 1];
  const lastCurrentSlowEma = currentSlowEma[currentSlowEma.length - 1];
  const lastPreviousFastEma = previousFastEma[previousFastEma.length - 1];
  const lastPreviousSlowEma = previousSlowEma[previousSlowEma.length - 1];

  const { qty, leverage } = getCoinConfig(symbol);

  // EMA Crossover Strategy
  const isBullishCrossover = lastPreviousFastEma <= lastPreviousSlowEma && lastCurrentFastEma > lastCurrentSlowEma;
  const isBearishCrossover = lastPreviousFastEma >= lastPreviousSlowEma && lastCurrentFastEma < lastCurrentSlowEma;

  if (isBullishCrossover) {
    // LONG: BUY to open
    const target = price * (1 + strategy.targetPercent / 100);
    const stop = price * (1 - strategy.stopLossPercent / 100);

    if ((process.env.TRADING_MODE || "PAPER").toUpperCase() === "LIVE") {
      try {
        await liveBuy(symbol, qty, price, leverage);
      } catch (err) {
        console.error("⚠️ Live Buy Failed (continuing):", err.message);
        return; // Don't record trade if live order failed
      }
    } else {
      paperBuy(symbol, qty, price);
    }

    await Trade.create({
      symbol,
      side: "BUY",
      qty: qty,
      entry_price: price,
      target_price: target,
      stop_loss: stop,
      mode: (process.env.TRADING_MODE || "PAPER").toUpperCase(),
    });

    openTrades[symbol] = true;
    const count = tradeCount[symbol] || 0;
    tradeCount[symbol] = count + 1;
    console.log(
      `🟢 LONG ${symbol} | Qty: ${qty} @ $${price.toFixed(2)} | Leverage: ${leverage}x | Target: $${target.toFixed(
        2,
      )} | Stop: $${stop.toFixed(2)}`,
    );
  } else if (isBearishCrossover) {
    // SHORT: SELL to open
    const target = price * (1 - strategy.targetPercent / 100);
    const stop = price * (1 + strategy.stopLossPercent / 100);

    if ((process.env.TRADING_MODE || "PAPER").toUpperCase() === "LIVE") {
      try {
        await liveSell(symbol, qty, price, leverage);
      } catch (err) {
        console.error("⚠️ Live Sell Failed (continuing):", err.message);
        return; // Don't record trade if live order failed
      }
    } else {
      paperSell(symbol, qty, price);
    }

    await Trade.create({
      symbol,
      side: "SELL",
      qty: qty,
      entry_price: price,
      target_price: target,
      stop_loss: stop,
      mode: (process.env.TRADING_MODE || "PAPER").toUpperCase(),
    });

    openTrades[symbol] = true;
    const count = tradeCount[symbol] || 0;
    tradeCount[symbol] = count + 1;
    console.log(
      `🔴 SHORT ${symbol} | Qty: ${qty} @ $${price.toFixed(2)} | Leverage: ${leverage}x | Target: $${target.toFixed(
        2,
      )} | Stop: $${stop.toFixed(2)}`,
    );
  }
}

export function closeTrade(symbol) {
  openTrades[symbol] = false;
}
