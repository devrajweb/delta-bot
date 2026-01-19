// Fetch last 1 day (1m candles) for BTCUSD and print a summary
require("dotenv").config();
const HistoricalCandles = require("../services/historicalCandles");

(async () => {
  try {
    const candles = await HistoricalCandles.fetchHistoricalCandles("BTCUSD", "1m", 1440, false);
    console.log(`Fetched ${candles.length} candles for BTCUSD`);
    const nonEmpty = candles.filter((c) => c.volume > 0).length;
    console.log(`Non-empty candles: ${nonEmpty}`);
    if (candles.length > 0) {
      console.log("First candle:", candles[0]);
      console.log("Last candle:", candles[candles.length - 1]);
    }
  } catch (err) {
    console.error("Error fetching candles:", err.message || err);
  }
})();
