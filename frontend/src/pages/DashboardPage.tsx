import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { useDashboardData } from '../hooks/useDashboardData';
import { Header } from '../components/Header';
import { AccountBar } from '../components/AccountBar';
import { OrderBook } from '../components/OrderBook';
import { PriceChart } from '../components/PriceChart';
import { OrderEntry } from '../components/OrderEntry';
import { TradeFeed } from '../components/TradeFeed';
import { Positions } from '../components/Positions';
import { OpenOrders } from '../components/OpenOrders';
import { WsTradeEvent } from '../types';

export function DashboardPage() {
  const { token, isAuthenticated } = useAuth();
  const { apiFetch } = useApi();
  const navigate = useNavigate();

  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');

  const wsChannels = useMemo(
    () => [`public:trades:${selectedSymbol}`, 'private:orders'],
    [selectedSymbol],
  );

  const { lastMessage, connectionStatus } = useWebSocket(token, wsChannels);
  const {
    account, positions, orders, trades, orderBook,
    fetchPositions, fetchOrders, prependTrade,
  } = useDashboardData(selectedSymbol);

  // Guard: redirect to login if session is lost
  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, navigate]);

  // Route incoming WS messages to state updates
  useEffect(() => {
    if (!lastMessage) return;
    const { channel, data } = lastMessage;

    if (channel === `public:trades:${selectedSymbol}`) {
      const t = data as WsTradeEvent;
      prependTrade({
        id: `${t.buyOrderId}-${t.sellOrderId}`,
        symbol: t.symbol,
        price: t.price,
        quantity: t.quantity,
        timestamp: new Date().toISOString(),
        isNew: true,
      });
      void fetchPositions(); // positions change after every fill
    } else if (channel === 'private:orders') {
      void fetchOrders();
    }
  }, [lastMessage, selectedSymbol, prependTrade, fetchPositions, fetchOrders]);

  const handleCancel = useCallback(async (orderId: string) => {
    try {
      await apiFetch(`/orders/${orderId}`, { method: 'DELETE' });
      void fetchOrders();
    } catch { /* silent — UI keeps the row until next refresh */ }
  }, [apiFetch, fetchOrders]);

  if (!isAuthenticated) return null;

  return (
    <div className="dashboard-grid">
      <Header selectedSymbol={selectedSymbol} onSymbolChange={setSelectedSymbol} />
      <OrderBook data={orderBook} />
      <PriceChart trades={trades} symbol={selectedSymbol} />
      <OrderEntry symbol={selectedSymbol} onOrderPlaced={fetchOrders} />
      <TradeFeed trades={trades} />
      <Positions positions={positions} />
      <OpenOrders orders={orders} onCancel={handleCancel} />
      <AccountBar account={account} connectionStatus={connectionStatus} />
    </div>
  );
}
