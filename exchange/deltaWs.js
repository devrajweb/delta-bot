require("dotenv/config");
const WebSocket = require("ws");
const coins = require("../config/coins.js");

const wsUrl = process.env.DELTA_API_BASE_WS_TESTNET;
const symbols = coins.map((c) => c.symbol);

class DeltaWs {
  constructor(onTick) {
    this.ws = null;
    this.onTick = onTick;
    this.livePriceCache = {};
    this._connect();
  }

  _connect() {
    this.ws = new WebSocket(wsUrl);
    console.log("🔌 Attempting WebSocket connection to:", wsUrl);

    this.ws.on("open", () => {
      console.log("✅ WebSocket OPEN - Connected to Delta Exchange");
      this._subscribe();
    });

    this.ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        if (message.type === "v2/ticker") {
          console.log(`📊 Ticker received - ${message.symbol}: ${message.close}`);
          this.livePriceCache[message.symbol] = message.close;
          this.onTick(message.symbol, parseFloat(message.close), parseFloat(message.volume));
        } else if (message.type === "subscriptions") {
          console.log("✅ Subscription confirmed for channels:", message.channels);
        } else if (message.type === "ping") {
          console.log("📍 Received PING from server");
          this.ws.send(JSON.stringify({ type: "pong" }));
        } else {
          console.log("📥 Received message type:", message.type, "Data:", JSON.stringify(message).substring(0, 200));
        }
      } catch (err) {
        console.error("❌ Error parsing message:", err.message, "Raw data:", data);
      }
    });

    this.ws.on("ping", (data) => {
      console.log("🏓 Received WebSocket PING");
      this.ws.pong(data);
    });

    this.ws.on("pong", (data) => {
      console.log("🏓 Received WebSocket PONG");
    });

    this.ws.on("close", () => {
      console.log("⚠️ Disconnected from Delta Exchange WebSocket. Reconnecting in 5s...");
      setTimeout(() => this._connect(), 5000); // Auto reconnect logic
    });

    this.ws.on("error", (error) => {
      console.error("❌ Delta Exchange WebSocket error:", error.message);
      this.ws.close();
    });
  }

  _subscribe() {
    const subscriptionMessage = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: "v2/ticker",
            symbols: symbols,
          },
        ],
      },
    };
    console.log("📡 Sending subscription for symbols:", symbols);
    console.log("📡 Full subscription payload:", JSON.stringify(subscriptionMessage, null, 2));
    this.ws.send(JSON.stringify(subscriptionMessage));
    console.log("✉️ Subscription message sent");
  }
}

// TODO: WebSocket module
// ☐ Connect to ticker stream
// ☐ Subscribe to:
// BTCUSD
// ETHUSD
// SOLUSD
// ☐ Live price cache
// ☐ Auto reconnect logic

module.exports = DeltaWs;
