const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
dotenv.config();

let sequelize;

if (process.env.NODE_ENV === "production") {
  // Production configuration - assuming different env vars or settings
  sequelize = new Sequelize(
    process.env.PROD_DB_NAME || process.env.DB_NAME,
    process.env.PROD_DB_USER || process.env.DB_USER,
    process.env.PROD_DB_PASSWORD || process.env.DB_PASSWORD,
    {
      host: process.env.PROD_DB_HOST || process.env.DB_HOST,
      dialect: "mysql",
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    },
  );
} else {
  // Development configuration
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  });
}

module.exports = sequelize;
