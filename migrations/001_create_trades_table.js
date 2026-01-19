"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("Trades", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      symbol: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      side: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "BUY or SELL",
      },
      qty: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      entry_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      exit_price: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      target_price: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      stop_loss: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        defaultValue: "OPEN",
        comment: "OPEN, CLOSED, CANCELLED",
      },
      pnl: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      mode: {
        type: Sequelize.STRING,
        allowNull: false,
        comment: "PAPER or LIVE",
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("Trades");
  },
};
