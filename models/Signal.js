module.exports = (sequelize, DataTypes) => {
  return sequelize.define("Signal", {
    symbol: DataTypes.STRING,
    original_signal: DataTypes.STRING,
    applied_signal: DataTypes.STRING,
    price: DataTypes.FLOAT,
    candles_count: DataTypes.INTEGER,
    note: DataTypes.TEXT,
    // Technical indicators
    ema20: DataTypes.FLOAT,
    ema50: DataTypes.FLOAT,
    ema200: DataTypes.FLOAT,
    rsi: DataTypes.FLOAT,
    volume_spike: DataTypes.BOOLEAN,
  });
};
