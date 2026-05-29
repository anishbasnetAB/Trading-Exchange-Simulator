#include "../include/Order.h"

Order::Order(std::string id, std::string userId, std::string symbol,
             Side side, OrderType type, double price, double quantity)
    : id(std::move(id))
    , userId(std::move(userId))
    , symbol(std::move(symbol))
    , side(side)
    , type(type)
    , price(price)
    , quantity(quantity)
    , remainingQty(quantity)
    , status(OrderStatus::NEW)
    // Capture nanosecond timestamp at construction — used for price-time priority
    , timestamp(std::chrono::duration_cast<std::chrono::nanoseconds>(
          std::chrono::steady_clock::now().time_since_epoch()))
{}