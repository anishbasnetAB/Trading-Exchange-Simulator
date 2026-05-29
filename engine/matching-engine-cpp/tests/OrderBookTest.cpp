#include <gtest/gtest.h>
#include "../include/OrderBook.h"

// ── Basic matching ─────────────────────────────────────────

TEST(OrderBookTest, LimitBuyMatchesSell) {
    OrderBook book("AAPL");

    Order sell("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 100.0);

    book.addOrder(sell);
    auto trades = book.addOrder(buy);

    EXPECT_EQ(trades.size(), 1);
    EXPECT_EQ(trades[0].price, 150.0);
    EXPECT_EQ(trades[0].quantity, 100.0);
    EXPECT_EQ(trades[0].buyOrderId, "b1");
    EXPECT_EQ(trades[0].sellOrderId, "s1");
}

TEST(OrderBookTest, NoMatchWhenPricesTooFarApart) {
    OrderBook book("AAPL");

    // Buyer only wants to pay 140, seller wants 150 — no match
    Order sell("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 140.0, 100.0);

    book.addOrder(sell);
    auto trades = book.addOrder(buy);

    EXPECT_EQ(trades.size(), 0);
    EXPECT_EQ(book.bestBid(), 140.0);
    EXPECT_EQ(book.bestAsk(), 150.0);
}

TEST(OrderBookTest, PartialFill) {
    OrderBook book("AAPL");

    Order sell("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 60.0);

    book.addOrder(sell);
    auto trades = book.addOrder(buy);

    // 60 filled, 40 remaining in book
    EXPECT_EQ(trades.size(), 1);
    EXPECT_EQ(trades[0].quantity, 60.0);

    // Sell order still in book at 150 with 40 remaining
    // We verify this by checking best ask is still there
    EXPECT_EQ(book.bestAsk(), 150.0);

    // Buy order fully filled — no bids left
    EXPECT_EQ(book.bestBid(), 0.0);
}

TEST(OrderBookTest, CancelOrder) {
    OrderBook book("AAPL");

    Order sell("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    book.addOrder(sell);

    EXPECT_EQ(book.bestAsk(), 150.0);

    bool cancelled = book.cancelOrder("s1");
    EXPECT_TRUE(cancelled);
    EXPECT_EQ(book.bestAsk(), 0.0); // book is empty now
}

TEST(OrderBookTest, CancelNonExistentOrder) {
    OrderBook book("AAPL");
    bool result = book.cancelOrder("fake-id");
    EXPECT_FALSE(result);
}

TEST(OrderBookTest, PriceTimePriority) {
    OrderBook book("AAPL");

    // Two sell orders at same price — first one should fill first
    Order sell1("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 50.0);
    Order sell2("s2", "user-3", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 50.0);
    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 50.0);

    book.addOrder(sell1);
    book.addOrder(sell2);
    auto trades = book.addOrder(buy);

    // Should match with sell1 first (placed earlier)
    EXPECT_EQ(trades[0].sellOrderId, "s1");
}

TEST(OrderBookTest, EmptyBookBestPrices) {
    OrderBook book("AAPL");
    EXPECT_EQ(book.bestBid(), 0.0);
    EXPECT_EQ(book.bestAsk(), 0.0);
}