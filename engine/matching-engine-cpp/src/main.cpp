#include "MatchingEngine.h"
#include "../vendor/json.hpp"
#include <iostream>
#include <string>

using json = nlohmann::json;

// Convert Side enum to string
std::string sideToString(Side s) {
    return s == Side::BUY ? "BUY" : "SELL";
}

// Convert OrderStatus enum to string
std::string statusToString(OrderStatus s) {
    switch(s) {
        case OrderStatus::NEW:              return "NEW";
        case OrderStatus::ACCEPTED:        return "ACCEPTED";
        case OrderStatus::PARTIALLY_FILLED: return "PARTIALLY_FILLED";
        case OrderStatus::FILLED:          return "FILLED";
        case OrderStatus::CANCELLED:       return "CANCELLED";
        case OrderStatus::REJECTED:        return "REJECTED";
        default:                           return "UNKNOWN";
    }
}

int main() {
    MatchingEngine engine;

    // Pre-load supported symbols
    engine.addSymbol("AAPL");
    engine.addSymbol("GOOGL");
    engine.addSymbol("MSFT");
    engine.addSymbol("TSLA");
    engine.addSymbol("AMZN");

    // When a trade executes, print JSON to stdout
    engine.onTrade([](const Trade& t) {
        json event;
        event["type"]        = "TRADE";
        event["symbol"]      = t.symbol;
        event["price"]       = t.price;
        event["quantity"]    = t.quantity;
        event["buyOrderId"]  = t.buyOrderId;
        event["sellOrderId"] = t.sellOrderId;
        event["buyUserId"]   = t.buyUserId;
        event["sellUserId"]  = t.sellUserId;
        std::cout << event.dump() << "\n";
        std::cout.flush(); // critical — Node must receive this immediately
    });

    // When an order updates, print JSON to stdout
    engine.onOrderUpdate([](const Order& o) {
        json event;
        event["type"]         = "ORDER_UPDATE";
        event["orderId"]      = o.id;
        event["status"]       = statusToString(o.status);
        event["remainingQty"] = o.remainingQty;
        std::cout << event.dump() << "\n";
        std::cout.flush();
    });

    // Read commands from stdin line by line
    // Each line is a JSON command from Node.js
    std::string line;
    while (std::getline(std::cin, line)) {
        if (line.empty()) continue;

        try {
            json cmd = json::parse(line);
            std::string action = cmd["action"];

            if (action == "NEW_ORDER") {
                Side side = cmd["side"] == "BUY" ? Side::BUY : Side::SELL;
                OrderType type = cmd["orderType"] == "LIMIT"
                    ? OrderType::LIMIT : OrderType::MARKET;

                Order order(
                    cmd["orderId"].get<std::string>(),
                    cmd["userId"].get<std::string>(),
                    cmd["symbol"].get<std::string>(),
                    side, type,
                    cmd.value("price", 0.0),
                    cmd["quantity"].get<double>()
                );

                bool ok = engine.submitOrder(order);
                if (!ok) {
                    json err;
                    err["type"]    = "ERROR";
                    err["orderId"] = cmd["orderId"];
                    err["reason"]  = "Unknown symbol";
                    std::cout << err.dump() << "\n";
                    std::cout.flush();
                }

            } else if (action == "CANCEL_ORDER") {
                engine.cancelOrder(
                    cmd["symbol"].get<std::string>(),
                    cmd["orderId"].get<std::string>()
                );
            }

        } catch (const std::exception& e) {
            json err;
            err["type"]   = "ERROR";
            err["reason"] = e.what();
            std::cout << err.dump() << "\n";
            std::cout.flush();
        }
    }

    return 0;
}