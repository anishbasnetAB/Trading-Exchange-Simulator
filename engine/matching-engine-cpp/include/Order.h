#pragma once
#include <string>
#include <chrono>

// Order sides
enum class Side { BUY, SELL };

// Order types
enum class OrderType { LIMIT, MARKET };

// All possible states an order can be in
enum class OrderStatus {
    NEW,
    ACCEPTED,
    PARTIALLY_FILLED,
    FILLED,
    CANCELLED,
    REJECTED
};

struct Order {
    std::string id;        // UUID from the API layer
    std::string userId;
    std::string symbol;
    Side side;
    OrderType type;
    double price;          // 0 for market orders
    double quantity;
    double remainingQty;
    OrderStatus status;

    // Timestamp for price-time priority
    // Two orders at same price — earlier one gets filled first
    std::chrono::nanoseconds timestamp;

    // Constructor
    Order(std::string id, std::string userId, std::string symbol,
          Side side, OrderType type, double price, double quantity);
};