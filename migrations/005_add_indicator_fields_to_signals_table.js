"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("Signals", "ema20", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn("Signals", "ema50", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn("Signals", "ema200", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn("Signals", "rsi", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn("Signals", "volume_spike", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("Signals", "ema20");
    await queryInterface.removeColumn("Signals", "ema50");
    await queryInterface.removeColumn("Signals", "ema200");
    await queryInterface.removeColumn("Signals", "rsi");
    await queryInterface.removeColumn("Signals", "volume_spike");
  },
};
