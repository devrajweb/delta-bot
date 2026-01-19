// Generate signals from 1-day historical candles and store them in Signals table
require("dotenv").config();
const sequelize = require("../config/database");
const { DataTypes } = require("sequelize");
const HistoricalCandles = require("../services/historicalCandles");
const CandleBuilder = require("../market-data/candleBuilder");
const EntryLogic = require("../strategies/entry.js");
const SignalModel = require("../models/Signal");
const coins = require("../config/coins.js");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");
    const Signal = SignalModel(sequelize, DataTypes);

    const symbols = coins.map((c) => c.symbol);
    for (const symbol of symbols) {
      console.log(`\n🔎 Processing ${symbol}...`);
      const candles = await HistoricalCandles.fetchHistoricalCandles(symbol, "1m", 1440, true);
      console.log(`Fetched ${candles.length} candles, non-empty: ${candles.filter((c) => c.volume > 0).length}`);

      if (!candles || candles.length === 0) {
        console.log("No candles, skipping");
        continue;
      }

      CandleBuilder.loadHistoricalCandles(symbol, candles);
      const usable = CandleBuilder.getCandles(symbol, 60000);
      console.log(`Usable candles for strategy: ${usable.length}`);

      const entry = EntryLogic.checkEntry(usable);
      if (entry.signal && entry.signal !== "none") {
        const original = entry.signal;
        let applied = original;
        let note = null;
        if (process.env.INVERT_BEARISH_TO_LONG === "YES" && original === "short") {
          applied = "long";
          note = "inverted from short to long for testing";
        }

        const emas = require("../indicators/ema").getEmas(usable);
        const rsiInfo = require("../indicators/rsi").getRsi(usable);
        const volumeInfo = require("../indicators/volume").getVolumeInfo(usable);

        const s = await Signal.create({
          symbol,
          original_signal: original,
          applied_signal: applied,
          price: entry.price,
          candles_count: usable.length,
          note,
          ema20: emas.ema20,
          ema50: emas.ema50,
          ema200: emas.ema200,
          rsi: rsiInfo.rsi,
          volume_spike: volumeInfo.volumeSpike,
        });

        console.log(`💾 Stored signal: ${symbol} ${original} -> ${applied} id=${s.id}`);
      } else {
        console.log("No signal generated");
      }
    }
  } catch (err) {
    console.error("❌ Error:", err.message || err);
  } finally {
    await sequelize.close();
  }
})();
