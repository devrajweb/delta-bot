require("dotenv/config");
const DeltaWs = require("./exchange/deltaWs.js");
const CandleBuilder = require("./market-data/candleBuilder.js");
const HistoricalCandles = require("./services/historicalCandles.js");
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
const SignalModel = require("./models/Signal.js");
const Signal = SignalModel(sequelize, DataTypes);
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

  // Load historical candles for faster startup (default: last 1 day)
  console.log("🚀 Loading historical candles from Delta Exchange...");
  const coins = require("./config/coins.js");
  const symbols = coins.map((c) => c.symbol);

  // Number of days to fetch (use HISTORICAL_DAYS env var), default 1 day
  const historicalDays = parseInt(process.env.HISTORICAL_DAYS || "1", 10);
  const resolution = "1m";
  const limitPerDay = { "1m": 60 * 24, "5m": 12 * 24, "15m": 4 * 24, "1h": 24 }[resolution] || 1440;
  const limit = historicalDays * limitPerDay;
  const useCache = process.env.HISTORICAL_REFRESH === "YES" ? false : true;

  try {
    const historicalData = await HistoricalCandles.fetchAllHistoricalCandles(symbols, resolution, limit, useCache);

    // Load candles into CandleBuilder
    for (const [symbol, candles] of Object.entries(historicalData)) {
      if (symbol && candles.length > 0) {
        CandleBuilder.loadHistoricalCandles(symbol, candles);
      }
    }

    // Log per-symbol summary
    for (const s of symbols) {
      const all = CandleBuilder.candles[s] ? Object.values(CandleBuilder.candles[s]).length : 0;
      const nonEmpty = (CandleBuilder.candles[s] ? Object.values(CandleBuilder.candles[s]) : []).filter(
        (c) => c.volume > 0,
      ).length;
      console.log(`ℹ️ ${s}: loaded ${all} candles (${nonEmpty} non-empty)`);
    }

    console.log("✅ Historical candles loaded successfully!");

    // Run initial strategy checks using loaded historical candles
    console.log("🔎 Running initial strategy checks on historical data...");
    for (const symbol of symbols) {
      const candles = CandleBuilder.getCandles(symbol, 60000); // 1m candles
      if (!candles || candles.length === 0) continue;

      const openPosition = PositionManager.getPosition(symbol);
      if (openPosition) continue;
      if (!SafetyLimits.canTrade()) continue;

      const entry = EntryLogic.checkEntry(candles);
      if (entry.signal !== "none") {
        try {
          const accountBalance = await tradeExecutor.fetchAccountBalance();
          const stopLoss = StopLossEngine.getStopLoss(candles, entry.price, entry.signal);
          const quantity = PositionSizer.calculateQty(
            accountBalance.result.wallets[0].balance,
            riskPercent,
            entry.price,
            stopLoss,
          );

          const takeProfits = TakeProfitEngine.calculateTakeProfits(entry.price, stopLoss, entry.signal);

          console.log(`🚀 [INIT] NEW TRADE SIGNAL: ${entry.signal.toUpperCase()} ${symbol} @ ${entry.price}`);
          console.log(`   - Stop Loss: ${stopLoss}`);
          console.log(`   - Take Profit 1: ${takeProfits.tp1}`);
          console.log(`   - Take Profit 2: ${takeProfits.tp2}`);
          console.log(`   - Quantity: ${quantity}`);

          await PositionManager.openPosition(Trade, symbol, entry.signal, quantity, entry.price, stopLoss, takeProfits);
        } catch (err) {
          console.error(`❌ Failed to open initial position for ${symbol}:`, err.message || err);
        }
      }
    }
  } catch (error) {
    console.warn("⚠️ Could not load historical candles, will build from ticks:", error.message);
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
        // Record signal in DB
        try {
          const original = entry.signal;
          let applied = original;
          let note = null;

          // For testing: invert bearish/short to long when INVERT_BEARISH_TO_LONG=YES
          if (process.env.INVERT_BEARISH_TO_LONG === "YES" && original === "short") {
            applied = "long";
            note = "inverted from short to long for testing";
            console.log("⚠️ INVERT_BEARISH_TO_LONG active: treating short as long");
          }

          // compute indicators
          const emas = require("./indicators/ema").getEmas(candles);
          const rsiInfo = require("./indicators/rsi").getRsi(candles);
          const volumeInfo = require("./indicators/volume").getVolumeInfo(candles);

          await Signal.create({
            symbol,
            original_signal: original,
            applied_signal: applied,
            price: entry.price,
            candles_count: candles.length,
            note,
            ema20: emas.ema20,
            ema50: emas.ema50,
            ema200: emas.ema200,
            rsi: rsiInfo.rsi,
            volume_spike: volumeInfo.volumeSpike,
          });
          console.log(`💾 Signal recorded: ${symbol} ${original} -> ${applied}`);

          // Use the applied signal for execution
          entry.signal = applied;
        } catch (err) {
          console.error("❌ Failed to record signal:", err.message || err);
        }

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
