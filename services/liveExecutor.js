import axios from "axios";
import crypto from "crypto";

const API_KEY = process.env.DELTA_API_KEY && process.env.DELTA_API_KEY !== "null" ? process.env.DELTA_API_KEY : null;
const API_SECRET =
  process.env.DELTA_API_SECRET && process.env.DELTA_API_SECRET !== "null" ? process.env.DELTA_API_SECRET : null;
const API_BASE = process.env.DELTA_API_BASE;
const productCache = new Map();

async function getProductId(symbol) {
  if (productCache.has(symbol)) {
    return productCache.get(symbol);
  }

  try {
    const response = await axios.get(`${API_BASE}/v2/products/${symbol}`);
    const productId = response.data.result.id;
    if (!productId) {
      throw new Error(`Product ID not found for symbol ${symbol}`);
    }
    productCache.set(symbol, productId);
    return productId;
  } catch (error) {
    console.error(`❌ Error fetching product ID for ${symbol}:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

function generateSignature(secret, message) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

async function setLeverage(productId, leverage) {
  const path = `/v2/products/${productId}/orders/leverage`;
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ leverage: leverage.toString() });
  const signatureData = method + timestamp + path + body;
  const signature = generateSignature(API_SECRET, signatureData);

  const headers = {
    "api-key": API_KEY,
    signature,
    timestamp,
    "Content-Type": "application/json",
    "User-Agent": "delta-auto-trader/1.0.0",
  };

  try {
    await axios.post(API_BASE + path, body, { headers });
    console.log(`✅ Leverage for product ${productId} set to ${leverage}x`);
  } catch (error) {
    console.error(`❌ Error setting leverage for product ${productId}:`);
    if (error.response) {
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
    } else {
      console.error("Error Message:", error.message);
    }
    throw error;
  }
}

async function sendOrder(side, symbol, qty, price, leverage, reduceOnly = false) {
  if (!API_KEY || !API_SECRET) throw new Error("Missing DELTA_API_KEY/DELTA_API_SECRET for live orders");
  if (process.env.CONFIRM_LIVE !== "YES") throw new Error("CONFIRM_LIVE must be set to YES to place live orders");

  const productId = await getProductId(symbol);
  if (leverage) {
    await setLeverage(productId, leverage);
  }

  const path = "/v2/orders";
  const method = "POST";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({
    product_id: productId,
    side: side,
    size: qty.toString(),
    limit_price: price.toString(),
    order_type: "limit_order",
    reduce_only: reduceOnly,
  });

  console.log(
    `🚀 Sending live order: ${symbol} ${side} ${qty} @ ${price} (Product ID: ${productId}, Leverage: ${leverage || "default"}, ReduceOnly: ${reduceOnly})`,
  );
  console.log(`📦 Payload: ${body}`);

  const signatureData = method + timestamp + path + body;
  const signature = generateSignature(API_SECRET, signatureData);

  const headers = {
    "api-key": API_KEY,
    signature,
    timestamp,
    "Content-Type": "application/json",
    "User-Agent": "delta-auto-trader/1.0.0",
  };

  try {
    const resp = await axios.post(API_BASE + path, body, { headers });
    console.log(`✅ Live order sent for ${symbol}:`, resp.data);
    return resp.data;
  } catch (error) {
    console.error(`❌ Error sending live order for ${symbol}:`);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Data:", error.response.data);
      console.error("Status:", error.response.status);
      console.error("Headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error Message:", error.message);
    }
    throw error; // re-throw the error after logging
  }
}

export async function liveBuy(symbol, qty, price, leverage, reduceOnly = false) {
  return sendOrder("buy", symbol, qty, price, leverage, reduceOnly);
}

export async function liveSell(symbol, qty, price, leverage, reduceOnly = false) {
  return sendOrder("sell", symbol, qty, price, leverage, reduceOnly);
}
