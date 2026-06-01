# Real-Time Distributed Trading Exchange Simulator

A production-grade trading exchange simulator featuring a C++20 matching engine,
microservice architecture, JWT authentication, Redis event streaming, and live
WebSocket market data.
Live: https://trading-exchange-simulator.vercel.app/login

**Order flow:** React → API Gateway → Risk Checks → C++20 Matching Engine → Redis Pub/Sub → Persistence Worker + WebSocket Bridge → PostgreSQL / Browser

## Architecture

```
User → React Dashboard → API Gateway → Services → C++ Matching Engine
                                                        ↓
                                                  Redis Event Bus
                                                        ↓
                                            PostgreSQL / WebSocket Updates
```

## Tech Stack

| Layer            | Technology                          |
|------------------|-------------------------------------|
| Frontend         | React + TypeScript + Tailwind       |
| API Gateway      | Node.js + Fastify + TypeScript      |
| Matching Engine  | C++20 + CMake + GoogleTest          |
| Database         | PostgreSQL + Prisma                 |
| Event Bus        | Redis Pub/Sub                       |
| Auth             | JWT + Refresh Tokens + bcrypt       |
| Containerization | Docker + Docker Compose             |

## Performance

| Component | Detail |
|-----------|--------|
| Order matching | O(log n) per operation — std::map price levels |
| Price-time priority | std::deque FIFO at each price level |
| Concurrency model | Single-threaded deterministic matching, no lock contention |
| Test coverage | 11 unit tests passing across OrderBook and MatchingEngine suites |
| End-to-end order flow | Place order → trade executed → WebSocket push: <50ms |
| API response time | ~5ms average (Railway deploy logs) |
| Trade persistence | Atomic 3-write PostgreSQL transaction per trade |
| Event fan-out | Redis Pub/Sub delivers trade events to all subscribers simultaneously |

The matching engine uses `std::map` for price level indexing (O(log n) insert and lookup) with `std::deque` at each level for FIFO ordering. Matching is single-threaded and deterministic — no concurrent access, no lock contention, no non-deterministic behavior. End-to-end latency from order placement to WebSocket push is below 50ms under normal load; API response times average around 5ms as measured in Railway deploy logs.

## Getting Started

```bash
# Clone the repository
git clone <your-repo-url>
cd trading-exchange-simulator

# Copy environment files
cp .env.example .env

# Start all services
docker compose up --build

# Frontend: http://localhost:3000
# API Gateway: http://localhost:4000
# API Health: http://localhost:4000/health
```

## Project Structure

```
trading-exchange-simulator/
├── frontend/          # React dashboard
├── services/
│   ├── api-gateway/   # Main entry point, JWT verification, routing
│   ├── auth-service/  # Registration, login, token management
│   ├── user-service/  # Account state, roles, balances
│   ├── risk-service/  # Pre-trade risk checks
│   ├── order-service/ # Order coordination
│   ├── market-data-service/  # WebSocket live updates
│   ├── persistence-worker/   # Async DB writes
│   └── audit-worker/         # Audit log consumer
├── engine/
│   └── matching-engine-cpp/  # C++20 order matching engine
├── shared/            # Contracts, schemas, event types
├── infra/             # Docker, Postgres migrations, Redis config
└── docs/              # Architecture, API, security docs
```

## Architecture and Design Decisions

**Matching engine is process-isolated.**
The C++ engine runs as a child process communicating over stdin/stdout (JSON). It has no knowledge of the database, Redis, or HTTP. Business logic lives in the application layer, not the engine. This makes the engine replaceable and independently testable.

**Engine never writes to the database.**
The engine emits events outward. A Redis consumer handles persistence asynchronously. Database latency never affects matching throughput. Tradeoff: at-most-once delivery — acceptable for a simulator.

**Two-token authentication.**
Short-lived access tokens (15 min) are stateless — verified by signature, no database lookup. Long-lived refresh tokens (7 days) are stored as bcrypt hashes in PostgreSQL, enabling revocation. Logout is immediate.

**NUMERIC not FLOAT for all financial values.**
IEEE 754 floating point cannot represent most decimal fractions exactly. Every price, quantity, balance, and PnL uses PostgreSQL NUMERIC(18,8). The pg driver returns these as strings — parsed only at the display boundary.

**Atomic trade persistence.**
Trade record + buyer position update + seller position update run in a single PostgreSQL transaction. All succeed or all roll back. No partial state.

**C++ compiled inside Docker at build time.**
Mac compiles ARM binaries. Railway runs Linux. Locally compiled binaries fail at spawn. The Dockerfile compiles the engine inside the container, ensuring the correct architecture for the runtime environment.

## Development

```bash
# View logs
docker compose logs -f api-gateway

# Rebuild a single service
docker compose up --build api-gateway

# Run C++ tests
cd engine/matching-engine-cpp && mkdir build && cd build && cmake .. && make test

# Run backend tests
cd services/api-gateway && npm test
```
