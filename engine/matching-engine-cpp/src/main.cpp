#include "MatchingEngine.h"
#include <iostream>

int main() {
    MatchingEngine engine;

    // Register symbols
    engine.addSymbol("AAPL");
    engine.addSymbol("GOOGL");

    // Listen for trades
    engine.onTrade([](const Trade& t) {
        std::cout << "TRADE: " << t.symbol
                  << " price=" << t.price
                  << " qty="   << t.quantity
                  << " buyer=" << t.buyUserId
                  << " seller=" << t.sellUserId
                  << "\n";
    });

    // Listen for order updates
    engine.onOrderUpdate([](const Order& o) {
        std::cout << "ORDER UPDATE: " << o.id
                  << " status=" << static_cast<int>(o.status)
                  << " remaining=" << o.remainingQty
                  << "\n";
    });

    // Place a sell limit order: sell 100 AAPL at $150
    Order sell("order-1", "user-2", "AAPL",
                Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    engine.submitOrder(sell);

    // Place a buy limit order: buy 100 AAPL at $150 — should match
    Order buy("order-2", "user-1", "AAPL",
               Side::BUY, OrderType::LIMIT, 150.0, 100.0);
    engine.submitOrder(buy);

    std::cout << "Best bid: " << engine.getOrderBook("AAPL")->bestBid() << "\n";
    std::cout << "Best ask: " << engine.getOrderBook("AAPL")->bestAsk() << "\n";

    return 0;
}