const priceHistory = {};
const MAX_HISTORY = 100; // Store last 100 prices for each symbol

export function addPrice(symbol, price) {
  if (!priceHistory[symbol]) {
    priceHistory[symbol] = [];
  }

  priceHistory[symbol].push(price);

  if (priceHistory[symbol].length > MAX_HISTORY) {
    priceHistory[symbol].shift(); // Remove the oldest price
  }
}

export function getPriceHistory(symbol) {
  return priceHistory[symbol] || [];
}
