# Real-Time Distributed Trading Exchange Simulator

A production-grade trading exchange simulator featuring a C++20 matching engine,
microservice architecture, JWT authentication, Redis event streaming, and live
WebSocket market data.
Live: https://trading-exchange-simulator.vercel.app/login
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

## Build Phases

-   Phase 1: Foundation (Docker + PostgreSQL + Redis + API health + React shell)
-   Phase 2: Authentication (register, login, JWT, refresh tokens)
-   Phase 3: User & Account Service
-   Phase 4: C++ Matching Engine MVP
-   Phase 5: Order API
-   Phase 6: Risk Service
-   Phase 7: Redis Event Bus
-   Phase 8: Persistence Worker
-   Phase 9: WebSocket Market Data
-   Phase 10: Frontend Dashboard
-   Phase 11: Security Hardening
-   Phase 12: Production Polish

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
