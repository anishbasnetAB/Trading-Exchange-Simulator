#include "../include/OrderBook.h"
#include <stdexcept>

OrderBook::OrderBook(std::string symbol) : symbol_(std::move(symbol)) {}

std::vector<Trade> OrderBook::addOrder(Order& order) {
    if (order.type == OrderType::LIMIT) {
        if (order.side == Side::BUY) return matchBuy(order);
        else                          return matchSell(order);
    }

    // Market orders match immediately — no price condition
    if (order.side == Side::BUY) {
        order.price = bestAsk(); // match at best available ask
        return matchBuy(order);
    } else {
        order.price = bestBid(); // match at best available bid
        return matchSell(order);
    }
}

std::vector<Trade> OrderBook::matchBuy(Order& order) {
    std::vector<Trade> trades;

    // Keep matching while:
    // 1. There are sell orders available
    // 2. The best ask price <= our buy price
    // 3. We still have quantity remaining
    while (!asks_.empty()
           && order.remainingQty > 0
           && asks_.begin()->first <= order.price)
    {
        auto& [askPrice, askQueue] = *asks_.begin();
        
        while (!askQueue.empty() && order.remainingQty > 0) {
            Order& restingOrder = askQueue.front();

            // How much can we fill? Minimum of both sides
            double fillQty = std::min(order.remainingQty, restingOrder.remainingQty);

            // Build the trade record
            Trade trade;
            trade.buyOrderId  = order.id;
            trade.sellOrderId = restingOrder.id;
            trade.buyUserId   = order.userId;
            trade.sellUserId  = restingOrder.userId;
            trade.symbol      = symbol_;
            trade.price       = askPrice; // trade happens at resting order price
            trade.quantity    = fillQty;
            trades.push_back(trade);

            // Update quantities
            order.remainingQty        -= fillQty;
            restingOrder.remainingQty -= fillQty;

            // Update statuses
            order.status = order.remainingQty == 0
                ? OrderStatus::FILLED : OrderStatus::PARTIALLY_FILLED;

            restingOrder.status = restingOrder.remainingQty == 0
                ? OrderStatus::FILLED : OrderStatus::PARTIALLY_FILLED;

            // Remove fully filled resting order from book
            if (restingOrder.remainingQty == 0) {
                askQueue.pop_front();
            }
        }

        // Remove empty price level
        if (askQueue.empty()) {
            asks_.erase(asks_.begin());
        }
    }

    // If buy order still has remaining quantity — add to book
    if (order.remainingQty > 0 && order.type == OrderType::LIMIT) {
        order.status = OrderStatus::ACCEPTED;
        bids_[order.price].push_back(order);
    }

    return trades;
}

std::vector<Trade> OrderBook::matchSell(Order& order) {
    std::vector<Trade> trades;

    // Keep matching while:
    // 1. There are buy orders available
    // 2. The best bid price >= our sell price
    // 3. We still have quantity remaining
    while (!bids_.empty()
           && order.remainingQty > 0
           && bids_.begin()->first >= order.price)
    {
        auto& [bidPrice, bidQueue] = *bids_.begin();

        while (!bidQueue.empty() && order.remainingQty > 0) {
            Order& restingOrder = bidQueue.front();

            double fillQty = std::min(order.remainingQty, restingOrder.remainingQty);

            Trade trade;
            trade.buyOrderId  = restingOrder.id;
            trade.sellOrderId = order.id;
            trade.buyUserId   = restingOrder.userId;
            trade.sellUserId  = order.userId;
            trade.symbol      = symbol_;
            trade.price       = bidPrice; // trade at resting order price
            trade.quantity    = fillQty;
            trades.push_back(trade);

            order.remainingQty        -= fillQty;
            restingOrder.remainingQty -= fillQty;

            order.status = order.remainingQty == 0
                ? OrderStatus::FILLED : OrderStatus::PARTIALLY_FILLED;

            restingOrder.status = restingOrder.remainingQty == 0
                ? OrderStatus::FILLED : OrderStatus::PARTIALLY_FILLED;

            if (restingOrder.remainingQty == 0) {
                bidQueue.pop_front();
            }
        }

        if (bidQueue.empty()) {
            bids_.erase(bids_.begin());
        }
    }

    // Remaining quantity goes into the book
    if (order.remainingQty > 0 && order.type == OrderType::LIMIT) {
        order.status = OrderStatus::ACCEPTED;
        asks_[order.price].push_back(order);
    }

    return trades;
}

bool OrderBook::cancelOrder(const std::string& orderId) {
    // Search buy side
    for (auto& [price, queue] : bids_) {
        for (auto it = queue.begin(); it != queue.end(); ++it) {
            if (it->id == orderId) {
                queue.erase(it);
                // Clean up empty price level so bestBid() returns correctly
                if (queue.empty()) {
                    bids_.erase(price);
                }
                return true;
            }
        }
    }
    // Search sell side
    for (auto& [price, queue] : asks_) {
        for (auto it = queue.begin(); it != queue.end(); ++it) {
            if (it->id == orderId) {
                queue.erase(it);
                // Clean up empty price level so bestAsk() returns correctly
                if (queue.empty()) {
                    asks_.erase(price);
                }
                return true;
            }
        }
    }
    return false;
}

double OrderBook::bestBid() const {
    if (bids_.empty()) return 0.0;
    return bids_.begin()->first;
}

double OrderBook::bestAsk() const {
    if (asks_.empty()) return 0.0;
    return asks_.begin()->first;
}