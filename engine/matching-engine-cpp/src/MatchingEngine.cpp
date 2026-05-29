#include "../include/MatchingEngine.h"

MatchingEngine::MatchingEngine() {}

void MatchingEngine::addSymbol(const std::string& symbol) {
    // Only add if it doesn't already exist
    if (books_.find(symbol) == books_.end()) {
        books_.emplace(symbol, OrderBook(symbol));
    }
}

bool MatchingEngine::submitOrder(Order& order) {
    auto it = books_.find(order.symbol);
    if (it == books_.end()) return false; // unknown symbol

    auto trades = it->second.addOrder(order);

    // Fire order update callback
    if (orderCallback_) {
        orderCallback_(order);
    }

    // Fire trade callback for every trade that occurred
    for (const auto& trade : trades) {
        if (tradeCallback_) {
            tradeCallback_(trade);
        }
    }

    return true;
}

bool MatchingEngine::cancelOrder(const std::string& symbol,
                                  const std::string& orderId) {
    auto it = books_.find(symbol);
    if (it == books_.end()) return false;

    return it->second.cancelOrder(orderId);
}

OrderBook* MatchingEngine::getOrderBook(const std::string& symbol) {
    auto it = books_.find(symbol);
    if (it == books_.end()) return nullptr;
    return &it->second;
}