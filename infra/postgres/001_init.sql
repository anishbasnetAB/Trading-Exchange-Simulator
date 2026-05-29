CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM ('USER', 'TRADER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE order_side AS ENUM ('BUY', 'SELL');
CREATE TYPE order_type AS ENUM ('LIMIT', 'MARKET');
CREATE TYPE order_status AS ENUM (
  'NEW', 'ACCEPTED', 'REJECTED',
  'PARTIALLY_FILLED', 'FILLED', 'CANCELLED'
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'TRADER',
  status        user_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE accounts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cash_balance NUMERIC(18,8) NOT NULL DEFAULT 100000.00,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accounts_user_unique UNIQUE(user_id),
  CONSTRAINT cash_non_negative CHECK (cash_balance >= 0)
);

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES users(id),
  symbol             VARCHAR(20) NOT NULL,
  side               order_side NOT NULL,
  type               order_type NOT NULL,
  price              NUMERIC(18,8),
  quantity           NUMERIC(18,8) NOT NULL,
  remaining_quantity NUMERIC(18,8) NOT NULL,
  status             order_status NOT NULL DEFAULT 'NEW',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT price_required_for_limit CHECK (type = 'MARKET' OR price IS NOT NULL)
);

CREATE TABLE trades (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol         VARCHAR(20) NOT NULL,
  buy_order_id   UUID NOT NULL REFERENCES orders(id),
  sell_order_id  UUID NOT NULL REFERENCES orders(id),
  buyer_user_id  UUID NOT NULL REFERENCES users(id),
  seller_user_id UUID NOT NULL REFERENCES users(id),
  price          NUMERIC(18,8) NOT NULL,
  quantity       NUMERIC(18,8) NOT NULL,
  executed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE positions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id),
  symbol        VARCHAR(20) NOT NULL,
  quantity      NUMERIC(18,8) NOT NULL DEFAULT 0,
  average_price NUMERIC(18,8) NOT NULL DEFAULT 0,
  realized_pnl  NUMERIC(18,8) NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT positions_unique UNIQUE(user_id, symbol)
);

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        VARCHAR(50) NOT NULL,
  ip_address    INET,
  request_id    VARCHAR(36),
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email      ON users(email);
CREATE INDEX idx_orders_user_id   ON orders(user_id);
CREATE INDEX idx_orders_symbol    ON orders(symbol);
CREATE INDEX idx_trades_symbol    ON trades(symbol);
CREATE INDEX idx_positions_user   ON positions(user_id);
CREATE INDEX idx_audit_created    ON audit_logs(created_at DESC);