// Fetch historical candles from Delta Exchange API (symbol-based)
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv/config");

const API_BASE = process.env.DELTA_API_BASE;
const CACHE_TTL = parseInt(process.env.HISTORICAL_CACHE_TTL || "3600", 10); // seconds
const CACHE_DIR = path.join(process.cwd(), "data", "historical");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function cachePathFor(symbol) {
  return path.join(CACHE_DIR, `${symbol}.json`);
}

function readCache(symbol) {
  try {
    const p = cachePathFor(symbol);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    const parsed = JSON.parse(raw);

    // Sanitize volumes for cached data (ensure non-zero)
    if (parsed && Array.isArray(parsed.candles)) {
      let dirty = false;
      parsed.candles = parsed.candles.map((c) => {
        const vol = Math.max(1, Number(c.volume) || 0);
        if (vol !== c.volume) dirty = true;
        return { ...c, volume: vol };
      });
      if (dirty) {
        // update cache with sanitized data
        try {
          fs.writeFileSync(p, JSON.stringify(parsed, null, 2), "utf8");
          console.log(`♻️ Sanitized and updated cache for ${symbol}`);
        } catch (err) {
          console.warn(`⚠️ Failed to update sanitized cache for ${symbol}:`, err.message);
        }
      }
    }

    return parsed;
  } catch (err) {
    console.warn(`⚠️ Failed to read cache for ${symbol}:`, err.message);
    return null;
  }
}

function writeCache(symbol, data) {
  try {
    ensureCacheDir();
    const p = cachePathFor(symbol);
    fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
    console.log(`💾 Cached historical candles for ${symbol} -> ${p}`);
  } catch (err) {
    console.warn(`⚠️ Failed to write cache for ${symbol}:`, err.message);
  }
}

class HistoricalCandlesService {
  async fetchHistoricalCandles(symbol, resolution = "1m", limit = 500, useCache = true) {
    /**
     * Fetch historical OHLCV candles from Delta Exchange using symbol endpoint
     * Example: /v2/history/candles?resolution=5m&symbol=BTCUSD&start=1685618835&end=1722511635
     * @param {string} symbol - Symbol (e.g., BTCUSD)
     * @param {string} resolution - "1m", "5m", "15m", "1h"
     * @param {number} limit - Number of candles to fetch
     * @param {boolean} useCache - whether to attempt reading from disk cache
     * @returns {Array} Array of candle objects {open, high, low, close, volume, timestamp}
     */
    try {
      // Try cache
      if (useCache) {
        const cached = readCache(symbol);
        if (cached && cached.fetchedAt) {
          const age = Math.floor(Date.now() / 1000) - cached.fetchedAt;
          if (age <= CACHE_TTL && Array.isArray(cached.candles) && cached.candles.length > 0) {
            console.log(`📥 Using cached ${cached.candles.length} candles for ${symbol} (age ${age}s)`);
            return cached.candles.slice(-limit);
          }
        }
      }

      const resolutionInSeconds = { "1m": 60, "5m": 300, "15m": 900, "1h": 3600 }[resolution] || 60;
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const startInSeconds = nowInSeconds - limit * resolutionInSeconds;

      const pathUrl = `/v2/history/candles?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&start=${startInSeconds}&end=${nowInSeconds}`;

      const headers = { Accept: "application/json", "User-Agent": "delta-auto-trader/1.0.0" };

      console.log(`📡 Fetching ${limit} historical candles for ${symbol} (${resolution})...`);

      const response = await axios.get(API_BASE + pathUrl, { headers });

      if (response.data && response.data.result) {
        const candles = response.data.result.map((candle) => {
          // Handle different response formats: object or array [ts, open, high, low, close, volume]
          let tsRaw, open, high, low, close, volume;

          if (Array.isArray(candle)) {
            // common kline array format
            tsRaw = candle[0];
            open = candle[1];
            high = candle[2];
            low = candle[3];
            close = candle[4];
            volume = candle[5];
          } else {
            tsRaw = candle.timestamp || candle.time || candle.t || candle[0];
            open = candle.open;
            high = candle.high;
            low = candle.low;
            close = candle.close;
            volume = candle.volume || candle.v;
          }

          // robust timestamp parsing
          let ts = null;
          if (typeof tsRaw === "number") {
            ts = tsRaw > 1e12 ? tsRaw : Math.floor(tsRaw) * 1000; // seconds -> ms
          } else if (typeof tsRaw === "string") {
            const f = parseFloat(tsRaw);
            if (!Number.isNaN(f)) {
              ts = f > 1e12 ? Math.floor(f) : Math.floor(f) * 1000;
            }
          }

          // fallback to current minute if parsing failed
          if (!ts || Number.isNaN(ts)) {
            const now = Date.now();
            const minute = new Date(
              new Date(now).getFullYear(),
              new Date(now).getMonth(),
              new Date(now).getDate(),
              new Date(now).getHours(),
              new Date(now).getMinutes(),
            ).getTime();
            ts = minute;
          }

          return {
            open: parseFloat(open),
            high: parseFloat(high),
            low: parseFloat(low),
            close: parseFloat(close),
            // Ensure non-zero volume
            volume: Math.max(1, parseFloat(volume) || 0),
            timestamp: ts,
          };
        });

        console.log(`✅ Fetched ${candles.length} candles for ${symbol}`);

        // Save to cache
        writeCache(symbol, { fetchedAt: Math.floor(Date.now() / 1000), candles });

        return candles;
      }

      return [];
    } catch (error) {
      console.error(
        `❌ Error fetching historical candles for ${symbol}:`,
        error.response ? error.response.data : error.message,
      );
      return [];
    }
  }

  async fetchAllHistoricalCandles(symbols, resolution = "1m", limit = 500, useCache = true) {
    const results = {};
    for (const symbol of symbols) {
      const candles = await this.fetchHistoricalCandles(symbol, resolution, limit, useCache);
      results[symbol] = candles;
      // small delay to reduce risk of rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
    return results;
  }
}

module.exports = new HistoricalCandlesService();
