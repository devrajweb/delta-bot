require("dotenv/config");

class SafetyLimits {
  constructor() {
    this.maxTradesPerDay = 10;
    this.maxDailyLoss = parseFloat(process.env.MAX_DAILY_LOSS) || -500;
    this.cooldownPeriod = 15 * 60 * 1000; // 15 minutes

    this.tradeCount = 0;
    this.dailyPnl = 0;
    this.lastLossTimestamp = 0;
    this.resetDailyStats();
  }

  resetDailyStats() {
    const now = new Date();
    const midnight = new Date(now).setHours(24, 0, 0, 0);

    setTimeout(() => {
      this.tradeCount = 0;
      this.dailyPnl = 0;
      this.resetDailyStats();
    }, midnight - now.getTime());
  }

  canTrade() {
    if (this.tradeCount >= this.maxTradesPerDay) {
      console.log("Safety Limit: Max trades per day reached.");
      return false;
    }
    if (this.dailyPnl <= this.maxDailyLoss) {
      console.log("Safety Limit: Max daily loss reached.");
      return false;
    }
    if (Date.now() - this.lastLossTimestamp < this.cooldownPeriod) {
      console.log("Safety Limit: In cooldown period after a loss.");
      return false;
    }
    return true;
  }

  recordTrade(pnl) {
    this.tradeCount++;
    this.dailyPnl += pnl;
    if (pnl < 0) {
      this.lastLossTimestamp = Date.now();
    }
  }
}

module.exports = new SafetyLimits();
