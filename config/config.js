import dotenv from "dotenv";
dotenv.config();

const env = (process.env.NODE_ENV || "development").toLowerCase();

function clean(value) {
  if (typeof value !== "string") return value;
  return value.replace(/^\s*["']?|["']?\s*$/g, "").trim();
}

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// prefer production-specific env vars when in production
const dbHost = env === "production" ? process.env.PROD_DB_HOST || process.env.DB_HOST : process.env.DB_HOST;
const dbName = env === "production" ? process.env.PROD_DB_NAME || process.env.DB_NAME : process.env.DB_NAME;
const dbUser = env === "production" ? process.env.PROD_DB_USER || process.env.DB_USER : process.env.DB_USER;
const dbPassword =
  env === "production" ? process.env.PROD_DB_PASSWORD || process.env.DB_PASSWORD : process.env.DB_PASSWORD;
const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;

const common = {
  env,
  port,
  appName: clean(process.env.APP_NAME) || "delta-auto-trader",
};

const db = {
  host: clean(dbHost) || "127.0.0.1",
  user: clean(dbUser) || process.env.USER || "root",
  password: clean(dbPassword) || "",
  database: clean(dbName) || "database",
  port: dbPort,
};

const configs = {
  development: Object.assign({}, common, { db }),
  production: Object.assign({}, common, { db }),
};

export default configs[env] || configs.development;
