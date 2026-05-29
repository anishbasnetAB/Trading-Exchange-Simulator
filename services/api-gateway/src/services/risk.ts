import { getAccountByUserId } from '../db/accounts';

interface OrderInput {
  userId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price?: number;
  quantity: number;
}

interface RiskResult {
  approved: boolean;
  reason?: string;
}

// Supported symbols — reject anything not on this list
const ALLOWED_SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'];

// Maximum order size
const MAX_QUANTITY = 10_000;

// Maximum notional value per order (price * quantity)
const MAX_NOTIONAL = 1_000_000;

export async function checkRisk(order: OrderInput): Promise<RiskResult> {
  // ── Check symbol is allowed ──────────────────────────────
  if (!ALLOWED_SYMBOLS.includes(order.symbol)) {
    return { approved: false, reason: `Symbol ${order.symbol} is not tradeable` };
  }

  // ── Check quantity limits ────────────────────────────────
  if (order.quantity <= 0) {
    return { approved: false, reason: 'Quantity must be greater than 0' };
  }

  if (order.quantity > MAX_QUANTITY) {
    return { approved: false, reason: `Quantity exceeds maximum of ${MAX_QUANTITY}` };
  }

  // ── Check notional value ─────────────────────────────────
  if (order.type === 'LIMIT' && order.price) {
    const notional = order.price * order.quantity;
    if (notional > MAX_NOTIONAL) {
      return { approved: false, reason: `Notional value $${notional} exceeds maximum` };
    }
  }

  // ── Check account status and buying power ────────────────
  const account = await getAccountByUserId(order.userId);

  if (!account) {
    return { approved: false, reason: 'Account not found' };
  }

  if (account.status !== 'ACTIVE') {
    return { approved: false, reason: 'Account is not active' };
  }

  // For buy orders, check if user has enough cash
  if (order.side === 'BUY' && order.type === 'LIMIT' && order.price) {
    const requiredCash = order.price * order.quantity;
    const availableCash = parseFloat(account.cash_balance);

    if (requiredCash > availableCash) {
      return {
        approved: false,
        reason: `Insufficient funds. Required: $${requiredCash}, Available: $${availableCash}`,
      };
    }
  }

  return { approved: true };
}