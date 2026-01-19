// This class will be responsible for keeping track of all our orders.
// It's a simplified version and doesn't yet interact with the exchange.

class OrderTracker {
  constructor() {
    this.orders = {};
    this.orderIdCounter = 1;
  }

  // Create a new order
  addOrder(order) {
    const orderId = this.orderIdCounter++;
    this.orders[orderId] = {
      ...order,
      id: orderId,
      status: "open",
      filledQty: 0,
    };
    return this.orders[orderId];
  }

  // Update an order's status (e.g., to handle partial fills)
  updateOrder(orderId, updates) {
    if (this.orders[orderId]) {
      this.orders[orderId] = { ...this.orders[orderId], ...updates };
    }
  }

  // Get an order by its ID
  getOrder(orderId) {
    return this.orders[orderId];
  }

  // Get all open orders for a symbol
  getOpenOrders(symbol) {
    return Object.values(this.orders).filter((o) => o.symbol === symbol && o.status === "open");
  }
}

module.exports = new OrderTracker();
