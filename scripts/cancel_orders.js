import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const API_KEY = process.env.DELTA_API_KEY;
const API_SECRET = process.env.DELTA_API_SECRET;
const API_BASE = process.env.DELTA_API_BASE;

function generateSignature(secret, message) {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}

async function cancelAll() {
  const path = "/v2/orders";
  const method = "DELETE";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify({ product_id: 14745 }); // DOGEUSD product_id
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
    const resp = await axios.delete(API_BASE + path, { headers, data: body });
    console.log("✅ Cancelled orders:", resp.data);
  } catch (error) {
    console.error("❌ Error cancelling orders:", error.response ? error.response.data : error.message);
  }
}

cancelAll();
