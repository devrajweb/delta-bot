import WebSocket from "ws";
import crypto from "crypto";
import coins from "../config/coins.js";

// const WEBSOCKET_URL = "wss://socket.india.delta.exchange";
const WEBSOCKET_URL = process.env.DELTA_API_BASE_WS;
const API_KEY = process.env.DELTA_API_KEYS && process.env.DELTA_API_KEYS !== "null" ? process.env.DELTA_API_KEYS : null;
const API_SECRET =
  process.env.DELTA_API_SECRETS && process.env.DELTA_API_SECRETS !== "null" ? process.env.DELTA_API_SECRETS : null;

class DeltaWebSocket {
  constructor(apiKey, apiSecret, onPrice) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.ws = null;
    this.isAuthenticated = false;
    this.onPrice = onPrice;
    this.prices = {}; // Track current prices
  }

  generateSignature(secret, message) {
    return crypto.createHmac("sha256", secret).update(message).digest("hex");
  }

  connect() {
    this.ws = new WebSocket(WEBSOCKET_URL);

    this.ws.on("open", () => {
      console.log("✅ WebSocket connection opened");

      if (this.apiKey && this.apiSecret) {
        this.authenticate();
      } else {
        console.log("📡 No API credentials, subscribing to public channels...");
        // Subscribe to public channels only
        this.subscribePublicChannels();
      }
    });

    this.ws.on("message", (data) => {
      this.handleMessage(data);
    });

    this.ws.on("error", (error) => {
      console.error("❌ WebSocket Error:", error);
    });

    this.ws.on("close", (code, reason) => {
      console.log(`⚠️ WebSocket closed: ${code} - ${reason}`);
      this.isAuthenticated = false;

      // Implement reconnection logic
      setTimeout(() => {
        console.log("🔄 Attempting to reconnect...");
        this.connect();
      }, 5000);
    });
  }

  authenticate() {
    const method = "GET";
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const path = "/live";
    const signatureData = method + timestamp + path;
    const signature = this.generateSignature(this.apiSecret, signatureData);

    const authPayload = {
      type: "auth",
      payload: {
        "api-key": this.apiKey,
        signature: signature,
        timestamp: timestamp,
      },
    };

    this.ws.send(JSON.stringify(authPayload));
    console.log("🔐 Authentication request sent");
  }

  subscribe(channel, symbols) {
    const payload = {
      type: "subscribe",
      payload: {
        channels: [
          {
            name: channel,
            symbols: symbols,
          },
        ],
      },
    };
    this.ws.send(JSON.stringify(payload));
    console.log(`📡 Subscribed to ${channel} for symbols:`, symbols);
  }

  subscribeMultiple(channels) {
    const payload = {
      type: "subscribe",
      payload: {
        channels: channels,
      },
    };
    this.ws.send(JSON.stringify(payload));
    console.log("📡 Subscribed to multiple channels");
  }

  unsubscribe(channel, symbols = null) {
    const channelObj = { name: channel };
    if (symbols) {
      channelObj.symbols = symbols;
    }

    const payload = {
      type: "unsubscribe",
      payload: {
        channels: [channelObj],
      },
    };
    this.ws.send(JSON.stringify(payload));
    console.log(`🚫 Unsubscribed from ${channel}`);
  }

  unauthenticate() {
    const payload = {
      type: "unauth",
      payload: {},
    };
    this.ws.send(JSON.stringify(payload));
    this.isAuthenticated = false;
    console.log("🔓 Unauthenticated from private channels");
  }

  subscribePublicChannels() {
    // Subscribe to public channels with configured coins
    const symbols = coins.map((c) => c.symbol);
    this.subscribeMultiple([
      {
        name: "v2/ticker",
        symbols: symbols,
      },
    ]);
  }

  subscribePrivateChannels() {
    // Subscribe to public ticker channels first
    this.subscribePublicChannels();

    // Then subscribe to private channels
    this.subscribeMultiple([
      {
        name: "orders",
        symbols: ["all"],
      },
      {
        name: "positions",
        symbols: ["all"],
      },
      {
        name: "v2/user_trades",
        symbols: ["all"],
      },
    ]);
  }

  handleMessage(data) {
    const message = JSON.parse(data);

    // Handle authentication success
    if (message.type === "success" && message.message === "Authenticated") {
      console.log("✅ Authentication successful!");
      this.isAuthenticated = true;
      this.subscribePrivateChannels();
      return;
    }

    // Handle subscription confirmation
    if (message.type === "subscriptions") {
      console.log("✅ Subscription confirmed:", message.channels);
      return;
    }

    // Handle different channel messages
    switch (message.type) {
      case "v2/ticker":
        this.handleTicker(message);
        break;
      case "l2_orderbook":
        this.handleOrderbook(message);
        break;
      case "all_trades":
        this.handleTrade(message);
        break;
      case "orders":
        this.handleOrder(message);
        break;
      case "positions":
        this.handlePosition(message);
        break;
      case "v2/user_trades":
        this.handleUserTrade(message);
        break;
      case "candlestick_1m":
      case "candlestick_5m":
      case "candlestick_15m":
        this.handleCandlestick(message);
        break;
      case "announcements":
        this.handleAnnouncement(message);
        break;
      default:
        // Log unexpected message types with data
        if (message.type && !message.type.startsWith("ping")) {
          console.log("📥 Unhandled message type:", message.type, JSON.stringify(message).substring(0, 200));
        }
        break;
    }
  }

  handleTicker(message) {
    // Store the price
    this.prices[message.symbol] = message.close;

    // Display prices in a compact format every update
    const priceDisplay = Object.entries(this.prices)
      .map(([sym, price]) => `${sym}: $${price.toFixed(2)}`)
      .join(" | ");

    console.log(`\n💹 PRICES: ${priceDisplay}`);

    // Call the price callback
    if (this.onPrice && message.close) {
      this.onPrice(message.symbol, parseFloat(message.close));
    }
  }

  handleOrderbook(message) {
    console.log(`📕 Orderbook [${message.symbol}]:`, {
      best_bid: message.buy?.[0]?.limit_price,
      best_ask: message.sell?.[0]?.limit_price,
      timestamp: message.timestamp,
    });
  }

  handleTrade(message) {
    console.log(`💱 Trade [${message.symbol}]:`, {
      price: message.price,
      size: message.size,
      buyer_role: message.buyer_role,
      timestamp: message.timestamp,
    });
  }

  handleOrder(message) {
    if (!message.result || message.result.length === 0) return;

    message.result.forEach((order) => {
      console.log(`📝 Order Update [${order.symbol}]:`, {
        action: message.action,
        order_id: order.id,
        side: order.side,
        size: order.size,
        state: order.state,
        reason: order.reason,
      });
    });
  }

  handlePosition(message) {
    if (!message.result || message.result.length === 0) return;

    message.result.forEach((position) => {
      console.log(`📌 Position Update [${position.symbol}]:`, {
        action: message.action,
        size: position.size,
        entry_price: position.entry_price,
        liquidation_price: position.liquidation_price,
      });
    });
  }

  handleUserTrade(message) {
    console.log(`💰 User Trade [${message.sy}]:`, {
      fill_id: message.f,
      side: message.S,
      size: message.s,
      price: message.p,
      role: message.r,
    });
  }

  handleCandlestick(message) {
    console.log(`🕯️ Candle [${message.symbol}] ${message.resolution}:`, {
      open: message.open,
      high: message.high,
      low: message.low,
      close: message.close,
      volume: message.volume,
    });
  }

  handleAnnouncement(message) {
    console.log("📣 System Announcement:", {
      event: message.event,
      timestamp: message.timestamp,
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export function startDeltaWS(onPrice) {
  const ws = new DeltaWebSocket(API_KEY, API_SECRET, onPrice);
  ws.connect();
}
