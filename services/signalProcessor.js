require("dotenv").config();
const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
const SignalModel = require("../models/Signal");
const CandleBuilder = require("../market-data/candleBuilder");
const EntryLogic = require("../strategies/entry.js");
const PositionManager = require("../management/positionManager");
const TradeModel = require("../models/Trade");
const PositionSizer = require("../risk/positionSize");
const StopLossEngine = require("../risk/stopLoss");
const TakeProfitEngine = require("../risk/takeProfit");
const PaperEngine = require("../paper/paperEngine");
const DeltaRest = require("../exchange/deltaRest");
// Indicators
const EmaCalculator = require("../indicators/ema");
const RsiCalculator = require("../indicators/rsi");
const VolumeAnalyzer = require("../indicators/volume");
const tradingMode = (process.env.TRADING_MODE || "PAPER").toUpperCase();
const AUTO_EXECUTE = (process.env.AUTO_EXECUTE_SIGNALS || "NO") === "YES";
const Signal = SignalModel(sequelize, DataTypes);
const Trade = TradeModel(sequelize, DataTypes);

async function processCandle(symbol) {
  try {
    const candles = CandleBuilder.getCandles(symbol, 60000); // 1m
    if (!candles || candles.length === 0) return null;

    const entry = EntryLogic.checkEntry(candles);
    if (!entry || entry.signal === "none") return null;

    const original = entry.signal;
    let applied = original;
    let note = null;
    if (process.env.INVERT_BEARISH_TO_LONG === "YES" && original === "short") {
      applied = "long";
      note = "inverted from short to long for testing";
    }

    // Calculate indicators to store with signal
    const emas = EmaCalculator.getEmas(candles);
    const rsiInfo = RsiCalculator.getRsi(candles);
    const volumeInfo = VolumeAnalyzer.getVolumeInfo(candles);

    const s = await Signal.create({
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

    console.log(`💾 [SignalProcessor] Stored signal id=${s.id} ${symbol} ${original}->${applied}`);

    if (AUTO_EXECUTE) {
      // compute quantity and open position
      const accountBalance = await (tradingMode === "PAPER"
        ? PaperEngine.fetchAccountBalance()
        : DeltaRest.fetchAccountBalance());
      const balance = accountBalance.result.wallets[0].balance;
      const riskPercent = parseFloat(process.env.RISK_PERCENT || "0.5");
      const stopLoss = StopLossEngine.getStopLoss(candles, entry.price, applied);
      const quantity = PositionSizer.calculateQty(balance, riskPercent, entry.price, stopLoss);
      const takeProfits = TakeProfitEngine.calculateTakeProfits(entry.price, stopLoss, applied);

      console.log(`🚀 [SignalProcessor] Auto-executing ${applied} ${symbol} @ ${entry.price} qty=${quantity}`);
      await PositionManager.openPosition(Trade, symbol, applied, quantity, entry.price, stopLoss, takeProfits);
    }

    return s;
  } catch (err) {
    console.error("❌ [SignalProcessor] Error processing candle for", symbol, err.message || err);
    return null;
  }
}

module.exports = { processCandle };
