import dotenv from "dotenv";
dotenv.config();
import sequelize from "../config/database.js";
import TradeModel from "../models/Trade.js";
import { DataTypes } from "sequelize";

const Trade = TradeModel(sequelize, DataTypes);

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected.");

    // Delete all OPEN trades or mark them closed
    const result = await Trade.update(
      { status: "CLOSED", exit_price: 0, pnl: 0, notes: "Force closed by script" },
      { where: { status: "OPEN" } }
    );

    console.log(`✅ Closed ${result[0]} stale OPEN trades in database.`);
  } catch (error) {
    console.error("❌ Error clearing trades:", error);
  } finally {
    await sequelize.close();
  }
})();
