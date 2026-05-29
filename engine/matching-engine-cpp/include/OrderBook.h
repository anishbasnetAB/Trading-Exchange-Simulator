#pragma once
#include "Order.h"
#include <map>
#include <deque>
#include <vector>
#include <string>

// Represents a single trade that was executed
struct Trade {
    std::string buyOrderId;
    std::string sellOrderId;
    std::string buyUserId;
    std::string sellUserId;
    std::string symbol;
    double price;
    double quantity;
};

// The order book maintains buy and sell orders for ONE symbol
// e.g. one OrderBook for AAPL, one for GOOGL
class OrderBook {
public:
    explicit OrderBook(std::string symbol);

    // Add a new order — returns list of trades if matches occurred
    std::vector<Trade> addOrder(Order& order);

    // Cancel an existing order by ID
    bool cancelOrder(const std::string& orderId);

    // Best bid (highest buy price)
    double bestBid() const;

    // Best ask (lowest sell price)
    double bestAsk() const;

    const std::string& getSymbol() const { return symbol_; }

private:
    std::string symbol_;

    // BUY side: sorted highest price first (std::greater)
    // Key = price, Value = queue of orders at that price (FIFO)
    std::map<double, std::deque<Order>, std::greater<double>> bids_;

    // SELL side: sorted lowest price first (default)
    std::map<double, std::deque<Order>> asks_;

    // Match a limit buy order against the ask side
    std::vector<Trade> matchBuy(Order& order);

    // Match a limit sell order against the bid side
    std::vector<Trade> matchSell(Order& order);
};