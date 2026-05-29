import { useState, useEffect, useCallback } from 'react';
import { useApi } from './useApi';
import { Account, Position, DbOrder, DbTrade, OrderBookData, DisplayTrade } from '../types';

function dbTradeToDisplay(t: DbTrade): DisplayTrade {
  return {
    id: t.id,
    symbol: t.symbol,
    price: parseFloat(t.price),
    quantity: parseFloat(t.quantity),
    timestamp: t.executed_at,
    isNew: false,
  };
}

export function useDashboardData(symbol: string) {
  const { apiFetch } = useApi();

  const [account,   setAccount]   = useState<Account | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders,    setOrders]    = useState<DbOrder[]>([]);
  const [trades,    setTrades]    = useState<DisplayTrade[]>([]);
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);

  const fetchAccount = useCallback(async () => {
    try { setAccount(await apiFetch<Account>('/account/me')); } catch { /* silent */ }
  }, [apiFetch]);

  const fetchPositions = useCallback(async () => {
    try { setPositions((await apiFetch<Position[]>('/account/positions')) ?? []); } catch { /* silent */ }
  }, [apiFetch]);

  const fetchOrders = useCallback(async () => {
    try { setOrders((await apiFetch<DbOrder[]>('/orders')) ?? []); } catch { /* silent */ }
  }, [apiFetch]);

  const fetchTrades = useCallback(async (sym: string) => {
    try {
      const raw = (await apiFetch<DbTrade[]>(`/trades/${sym}`)) ?? [];
      setTrades(raw.map(dbTradeToDisplay));
    } catch { /* silent */ }
  }, [apiFetch]);

  const fetchOrderBook = useCallback(async (sym: string) => {
    try { setOrderBook(await apiFetch<OrderBookData>(`/orderbook/${sym}`)); } catch { /* silent */ }
  }, [apiFetch]);

  // Prepend a live trade from WebSocket; keep list capped at 50
  const prependTrade = useCallback((trade: DisplayTrade) => {
    setTrades(prev => [{ ...trade, isNew: true }, ...prev].slice(0, 50));
  }, []);

  // Initial load — fetch account, positions, orders in parallel
  useEffect(() => {
    void Promise.all([fetchAccount(), fetchPositions(), fetchOrders()]);
  }, [fetchAccount, fetchPositions, fetchOrders]);

  // Refetch symbol-specific data when symbol changes
  useEffect(() => {
    void fetchTrades(symbol);
    void fetchOrderBook(symbol);
  }, [symbol, fetchTrades, fetchOrderBook]);

  return {
    account, positions, orders, trades, orderBook,
    fetchPositions, fetchOrders, prependTrade,
  };
}
