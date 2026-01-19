// Simple script to insert a test bearish signal into DB
require("dotenv").config();
const sequelize = require("../config/database");
const SignalModel = require("../models/Signal");
const { DataTypes } = require("sequelize");

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connected");
    const Signal = SignalModel(sequelize, DataTypes);

    const symbol = process.argv[2] || "BTCUSD";
    const original = process.argv[3] || "short";
    const applied = process.env.INVERT_BEARISH_TO_LONG === "YES" && original === "short" ? "long" : original;

    const s = await Signal.create({
      symbol,
      original_signal: original,
      applied_signal: applied,
      price: 1,
      candles_count: 10,
      note: "test signal inserted via script",
    });

    console.log("✅ Inserted test signal:", s.toJSON());
  } catch (err) {
    console.error("❌ Error inserting test signal:", err.message || err);
  } finally {
    await sequelize.close();
  }
})();
