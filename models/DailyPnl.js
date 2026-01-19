module.exports = (sequelize, DataTypes) => {
  return sequelize.define("DailyPnl", {
    date: DataTypes.DATEONLY,
    pnl: DataTypes.FLOAT,
    trades: DataTypes.INTEGER,
    createAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updateAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
};
