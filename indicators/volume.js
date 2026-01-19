class VolumeAnalyzer {
  calculateAverageVolume(candles, period = 20) {
    const volumes = candles.map((c) => c.volume);
    if (volumes.length < period) return 0;

    const sum = volumes.slice(-period).reduce((acc, vol) => acc + vol, 0);
    return sum / period;
  }

  detectVolumeSpike(candles, spikeFactor = 1.5) {
    if (candles.length < 2) return false;

    const lastCandle = candles[candles.length - 1];
    const averageVolume = this.calculateAverageVolume(candles.slice(0, -1));

    return lastCandle.volume > averageVolume * spikeFactor;
  }

  getVolumeInfo(candles) {
    return {
      currentVolume: candles[candles.length - 1].volume,
      averageVolume: this.calculateAverageVolume(candles),
      volumeSpike: this.detectVolumeSpike(candles),
    };
  }
}

module.exports = new VolumeAnalyzer();
