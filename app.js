require("dotenv/config");
const DeltaWs = require("./exchange/deltaWs.js");
const CandleBuilder = require("./market-data/candleBuilder.js");
const EntryLogic = require("./strategies/entry.js");
const PositionSizer = require("./risk/positionSize.js");
const StopLossEngine = require("./risk/stopLoss.js");
const TakeProfitEngine = require("./risk/takeProfit.js");
const DeltaRest = require("./exchange/deltaRest.js");
const PaperEngine = require("./paper/paperEngine.js");
const SafetyLimits = require("./filters/safetyLimits.js");
const PositionManager = require("./management/positionManager.js");
const sequelize = require("./config/database.js");
const { DataTypes } = require("sequelize");
const TradeModel = require("./models/Trade.js");

const Trade = TradeModel(sequelize, DataTypes);

(async () => {
  await sequelize.sync();
  console.log("✅ Database Ready");

  const tradingMode = (process.env.TRADING_MODE || "PAPER").toUpperCase();
  const riskPercent = 0.5; // 0.5% risk per trade
  const tradeExecutor = tradingMode === "PAPER" ? PaperEngine : DeltaRest;

  if (tradingMode === "LIVE") {
    if (process.env.CONFIRM_LIVE !== "YES") {
      console.error("🚨 CONFIRM_LIVE is not set to YES. Aborting startup in LIVE mode.");
      process.exit(1);
    }
    if (!process.env.DELTA_API_KEY || !process.env.DELTA_API_SECRET) {
      console.error("🚨 DELTA_API_KEY and DELTA_API_SECRET must be set for LIVE mode. Aborting.");
      process.exit(1);
    }
    console.log("⚠️ Starting in LIVE trading mode — CONFIRM_LIVE=YES and API keys present");
  } else {
    console.log("🧪 Starting in PAPER trading mode");
  }

  const onTick = async (symbol, price, volume) => {
    CandleBuilder.addTick(symbol, price, volume);
    const candles = CandleBuilder.getCandles(symbol, 5000); // 5-second candles for faster signals

    if (candles.length === 0) return;

    const openPosition = PositionManager.getPosition(symbol);

    if (!openPosition) {
      if (!SafetyLimits.canTrade()) return;

      const entry = EntryLogic.checkEntry(candles);

      if (entry.signal !== "none") {
        const accountBalance = await tradeExecutor.fetchAccountBalance();
        const stopLoss = StopLossEngine.getStopLoss(candles, entry.price, entry.signal);
        const quantity = PositionSizer.calculateQty(
          accountBalance.result.wallets[0].balance,
          riskPercent,
          entry.price,
          stopLoss,
        );

        const takeProfits = TakeProfitEngine.calculateTakeProfits(entry.price, stopLoss, entry.signal);

        console.log(`🚀 NEW TRADE SIGNAL: ${entry.signal.toUpperCase()} ${symbol} @ ${entry.price}`);
        console.log(`   - Stop Loss: ${stopLoss}`);
        console.log(`   - Take Profit 1: ${takeProfits.tp1}`);
        console.log(`   - Take Profit 2: ${takeProfits.tp2}`);
        console.log(`   - Quantity: ${quantity}`);

        await PositionManager.openPosition(Trade, symbol, entry.signal, quantity, entry.price, stopLoss, takeProfits);
      }
    } else {
      // Manage open position
      const { entryPrice, direction, stopLoss, quantity, takeProfits } = openPosition;

      const onTp1 = async () => {
        console.log(`💰 TP1 HIT for ${symbol}! Moving SL to breakeven.`);
        let pnl = (takeProfits.tp1 - entryPrice) * (quantity / 2) * (direction === "long" ? 1 : -1);
        if (tradingMode === "PAPER") {
          const paperPnl = PaperEngine.closePosition(symbol, takeProfits.tp1);
          pnl = paperPnl; // Use the more accurate paper P&L
          PaperEngine.openPosition(symbol, quantity / 2, direction, entryPrice); // Re-open with half qty
        } else {
          await DeltaRest.placeMarketOrder(symbol, quantity / 2, direction === "long" ? "sell" : "buy");
          // TODO: Move SL order
        }
        SafetyLimits.recordTrade(pnl);
        openPosition.stopLoss = entryPrice;
        openPosition.quantity = quantity / 2;
      };
      const tpSignal = TakeProfitEngine.checkTakeProfits(price, takeProfits, direction, onTp1);

      if (tpSignal === "tp2") {
        console.log(`💰💰 TP2 HIT for ${symbol}! Closing position.`);
        let pnl = (takeProfits.tp2 - entryPrice) * quantity * (direction === "long" ? 1 : -1);
        if (tradingMode === "PAPER") {
          pnl = PaperEngine.closePosition(symbol, takeProfits.tp2);
        }
        SafetyLimits.recordTrade(pnl);
        await PositionManager.closePosition(symbol, takeProfits.tp2);
        TakeProfitEngine.reset();
      }

      if ((direction === "long" && price <= stopLoss) || (direction === "short" && price >= stopLoss)) {
        console.log(`❌ SL HIT for ${symbol}! Closing position.`);
        let pnl = (stopLoss - entryPrice) * quantity * (direction === "long" ? 1 : -1);
        if (tradingMode === "PAPER") {
          pnl = PaperEngine.closePosition(symbol, stopLoss);
        }
        SafetyLimits.recordTrade(pnl);
        await PositionManager.closePosition(symbol, stopLoss);
        TakeProfitEngine.reset();
      }
    }
  };

  const deltaWs = new DeltaWs(onTick);

  console.log("✅ Trading Bot Started");
})();
