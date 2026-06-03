#include "MatchingEngine.h"
#include <chrono>
#include <iostream>
#include <vector>

int main() {
    MatchingEngine engine;
    engine.addSymbol("AAPL");

    const int NUM_ORDERS = 1000000;
    std::vector<double> latencies;
    latencies.reserve(NUM_ORDERS);

    int tradeCount = 0;
    engine.onTrade([&](const Trade&) { tradeCount++; });

    // Warm up
    for (int i = 0; i < 1000; i++) {
        Order o("w" + std::to_string(i), "u1", "AAPL",
                Side::SELL, OrderType::LIMIT, 150.0 + i, 1.0);
        engine.submitOrder(o);
    }

    // Benchmark
    auto start = std::chrono::high_resolution_clock::now();

    for (int i = 0; i < NUM_ORDERS; i++) {
        auto t0 = std::chrono::high_resolution_clock::now();

        // Alternating buy/sell at same price forces matches
        if (i % 2 == 0) {
            Order o("s" + std::to_string(i), "u1", "AAPL",
                    Side::SELL, OrderType::LIMIT, 150.0, 1.0);
            engine.submitOrder(o);
        } else {
            Order o("b" + std::to_string(i), "u2", "AAPL",
                    Side::BUY, OrderType::LIMIT, 150.0, 1.0);
            engine.submitOrder(o);
        }

        auto t1 = std::chrono::high_resolution_clock::now();
        latencies.push_back(
            std::chrono::duration<double, std::nano>(t1 - t0).count()
        );
    }

    auto end = std::chrono::high_resolution_clock::now();
    double totalMs = std::chrono::duration<double, std::milli>(end - start).count();

    // Sort for percentiles
    std::sort(latencies.begin(), latencies.end());

    double p50 = latencies[NUM_ORDERS * 0.50];
    double p99 = latencies[NUM_ORDERS * 0.99];
    double p999 = latencies[NUM_ORDERS * 0.999];
    double throughput = NUM_ORDERS / (totalMs / 1000.0);

    std::cout << "Orders processed : " << NUM_ORDERS << "\n";
    std::cout << "Trades executed  : " << tradeCount << "\n";
    std::cout << "Total time       : " << totalMs << " ms\n";
    std::cout << "Throughput       : " << (long)throughput << " orders/sec\n";
    std::cout << "Latency p50      : " << p50 << " ns\n";
    std::cout << "Latency p99      : " << p99 << " ns\n";
    std::cout << "Latency p99.9    : " << p999 << " ns\n";
}