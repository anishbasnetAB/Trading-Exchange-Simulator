export interface User {
  userId: string;
  email: string;
  role: string;
}

export interface Account {
  id: string;
  cashBalance: number;
  status: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  averagePrice: number;
  realizedPnl: number;
}

// Normalized trade for display — handles both DB rows and live WS events
export interface DisplayTrade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: string;
  isNew: boolean;
}

// Raw order row from the database (snake_case, pg doesn't transform)
export interface DbOrder {
  id: string;
  user_id: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'MARKET';
  price: string | null;
  quantity: string;
  remaining_quantity: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Raw trade row from the database
export interface DbTrade {
  id: string;
  symbol: string;
  buy_order_id: string;
  sell_order_id: string;
  buyer_user_id: string;
  seller_user_id: string;
  price: string;
  quantity: string;
  executed_at: string;
}

// Engine → Redis → WS event shape
export interface WsTradeEvent {
  type: 'TRADE';
  symbol: string;
  price: number;
  quantity: number;
  buyOrderId: string;
  sellOrderId: string;
  buyUserId: string;
  sellUserId: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
}

export interface OrderBookData {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WsMessage {
  channel: string;
  data: unknown;
}
