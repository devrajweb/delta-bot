"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn("Trades", "entry_price", "entryPrice");
    await queryInterface.renameColumn("Trades", "exit_price", "exitPrice");
    await queryInterface.renameColumn("Trades", "mode", "tradingMode");

    await queryInterface.addColumn("Trades", "entryTime", {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW,
    });
    await queryInterface.addColumn("Trades", "entryOrderId", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("Trades", "entryOrderType", {
      type: Sequelize.STRING,
      defaultValue: "Market",
    });
    await queryInterface.addColumn("Trades", "exitTime", {
      type: Sequelize.DATE,
    });
    await queryInterface.addColumn("Trades", "exitOrderId", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("Trades", "realizedPnl", {
      type: Sequelize.FLOAT,
    });
    await queryInterface.addColumn("Trades", "fee", {
      type: Sequelize.FLOAT,
    });
    await queryInterface.addColumn("Trades", "margin", {
      type: Sequelize.FLOAT,
    });
    await queryInterface.addColumn("Trades", "cashflow", {
      type: Sequelize.FLOAT,
    });
    await queryInterface.addColumn("Trades", "filledQty", {
      type: Sequelize.FLOAT,
    });

    await queryInterface.removeColumn("Trades", "target_price");
    await queryInterface.removeColumn("Trades", "stop_loss");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.renameColumn("Trades", "entryPrice", "entry_price");
    await queryInterface.renameColumn("Trades", "exitPrice", "exit_price");
    await queryInterface.renameColumn("Trades", "tradingMode", "mode");

    await queryInterface.removeColumn("Trades", "entryTime");
    await queryInterface.removeColumn("Trades", "entryOrderId");
    await queryInterface.removeColumn("Trades", "entryOrderType");
    await queryInterface.removeColumn("Trades", "exitTime");
    await queryInterface.removeColumn("Trades", "exitOrderId");
    await queryInterface.removeColumn("Trades", "realizedPnl");
    await queryInterface.removeColumn("Trades", "fee");
    await queryInterface.removeColumn("Trades", "margin");
    await queryInterface.removeColumn("Trades", "cashflow");
    await queryInterface.removeColumn("Trades", "filledQty");

    await queryInterface.addColumn("Trades", "target_price", {
      type: Sequelize.FLOAT,
    });
    await queryInterface.addColumn("Trades", "stop_loss", {
      type: Sequelize.FLOAT,
    });
  },
};
