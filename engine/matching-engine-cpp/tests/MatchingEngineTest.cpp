#include <gtest/gtest.h>
#include "MatchingEngine.h"

TEST(MatchingEngineTest, AddSymbolAndSubmitOrder) {
    MatchingEngine engine;
    engine.addSymbol("AAPL");

    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 100.0);
    bool result = engine.submitOrder(buy);

    EXPECT_TRUE(result);
    EXPECT_EQ(engine.getOrderBook("AAPL")->bestBid(), 150.0);
}

TEST(MatchingEngineTest, UnknownSymbolRejected) {
    MatchingEngine engine;

    Order buy("b1", "user-1", "UNKNOWN", Side::BUY, OrderType::LIMIT, 150.0, 100.0);
    bool result = engine.submitOrder(buy);

    EXPECT_FALSE(result);
}

TEST(MatchingEngineTest, TradeCallbackFired) {
    MatchingEngine engine;
    engine.addSymbol("AAPL");

    int tradeCount = 0;
    engine.onTrade([&tradeCount](const Trade&) { tradeCount++; });

    Order sell("s1", "user-2", "AAPL", Side::SELL, OrderType::LIMIT, 150.0, 100.0);
    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 100.0);

    engine.submitOrder(sell);
    engine.submitOrder(buy);

    EXPECT_EQ(tradeCount, 1);
}

TEST(MatchingEngineTest, CancelOrder) {
    MatchingEngine engine;
    engine.addSymbol("AAPL");

    Order buy("b1", "user-1", "AAPL", Side::BUY, OrderType::LIMIT, 150.0, 100.0);
    engine.submitOrder(buy);

    bool cancelled = engine.cancelOrder("AAPL", "b1");
    EXPECT_TRUE(cancelled);
    EXPECT_EQ(engine.getOrderBook("AAPL")->bestBid(), 0.0);
}