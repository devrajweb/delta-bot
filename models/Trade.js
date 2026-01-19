module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Trade", {
    // Basic Info
    symbol: DataTypes.STRING,
    side: DataTypes.STRING, // 'long' or 'short'
    qty: DataTypes.FLOAT,
    status: { type: DataTypes.STRING, defaultValue: "OPEN" }, // OPEN, CLOSED
    tradingMode: DataTypes.STRING, // PAPER, LIVE

    // Entry
    entryPrice: DataTypes.FLOAT,
    entryTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    entryOrderId: DataTypes.STRING,
    entryOrderType: { type: DataTypes.STRING, defaultValue: "Market" },

    // Exit
    exitPrice: DataTypes.FLOAT,
    exitTime: DataTypes.DATE,
    exitOrderId: DataTypes.STRING,

    // Financials
    pnl: DataTypes.FLOAT,
    realizedPnl: DataTypes.FLOAT,
    fee: DataTypes.FLOAT,
    margin: DataTypes.FLOAT,
    cashflow: DataTypes.FLOAT,

    // Order Details
    filledQty: DataTypes.FLOAT,
  });
};
