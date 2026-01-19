const axios = require("axios");
const crypto = require("crypto");
require("dotenv/config");

const apiKey = process.env.DELTA_API_KEY;
const apiSecret = process.env.DELTA_API_SECRET;
const baseUrl = process.env.DELTA_API_BASE;

class DeltaRest {
  constructor() {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
  }

  async _request(method, path, data = {}) {
    const timestamp = Date.now().toString();
    const signature = this._generateSignature(method, path, timestamp, data);

    const config = {
      method: method,
      url: `${this.baseUrl}${path}`,
      headers: {
        "api-key": this.apiKey,
        timestamp: timestamp,
        signature: signature,
        "Content-Type": "application/json",
      },
      data: data,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error("Error making request to Delta Exchange:", error.response ? error.response.data : error.message);
      throw error;
    }
  }

  _generateSignature(method, path, timestamp, data) {
    // TODO: Implement actual signature generation as per Delta Exchange documentation
    const stringToSign = `${method}${path}${timestamp}${JSON.stringify(data)}`;
    return crypto.createHmac("sha256", this.apiSecret).update(stringToSign).digest("hex");
  }

  // Mock product IDs - replace with actual IDs from Delta Exchange
  _getSymbolId(symbol) {
    const symbolMap = {
      BTCUSD: 84,
      ETHUSD: 118,
      SOLUSD: 143,
    };
    return symbolMap[symbol];
  }

  // ☐ Fetch account balance
  async fetchAccountBalance() {
    return this._request("GET", "/v2/wallet/balance");
  }

  // ☐ Fetch open positions
  async fetchOpenPositions() {
    return this._request("GET", "/v2/positions");
  }

  // ☐ Place market order
  async placeMarketOrder(symbol, quantity, direction) {
    const productId = this._getSymbolId(symbol);
    const side = direction === "long" ? "buy" : "sell";

    return this._request("POST", "/v2/orders", {
      product_id: productId,
      size: quantity,
      side: side,
      order_type: "market",
    });
  }

  // ☐ Place limit order
  async placeLimitOrder(symbol, quantity, direction, price) {
    // TODO: Implement limit order logic
  }

  // ☐ Close position
  async closePosition(symbol) {
    const positions = await this.fetchOpenPositions();
    const position = positions.result.find((p) => p.product.symbol === symbol);
    if (!position) return;

    const direction = position.size > 0 ? "short" : "long";
    return this.placeMarketOrder(symbol, Math.abs(position.size), direction);
  }

  // ☐ Set leverage
  async setLeverage(symbol, leverage) {
    // TODO: Implement set leverage logic
  }

  // ☐ Error & retry handler
  // This is already partially handled in _request, but could be more robust.
}

module.exports = new DeltaRest();
