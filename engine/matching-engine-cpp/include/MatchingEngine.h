#pragma once
#include "OrderBook.h"
#include <unordered_map>
#include <functional>
#include <string>

// Callback types — engine calls these when events happen
// Instead of writing to DB directly, engine fires events outward
// This keeps the engine pure and fast — no IO in the hot path
using TradeCallback    = std::function<void(const Trade&)>;
using OrderCallback    = std::function<void(const Order&)>;

class MatchingEngine {
public:
    MatchingEngine();

    // Register event listeners
    void onTrade(TradeCallback cb)        { tradeCallback_ = cb; }
    void onOrderUpdate(OrderCallback cb)  { orderCallback_ = cb; }

    // Submit a new order — returns false if symbol not found
    bool submitOrder(Order& order);

    // Cancel an order
    bool cancelOrder(const std::string& symbol, const std::string& orderId);

    // Add a new tradeable symbol
    void addSymbol(const std::string& symbol);

    // Get order book for a symbol
    OrderBook* getOrderBook(const std::string& symbol);

private:
    // One order book per symbol
    std::unordered_map<std::string, OrderBook> books_;

    TradeCallback tradeCallback_;
    OrderCallback orderCallback_;
};