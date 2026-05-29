import { useEffect, useRef, useState } from 'react';
import { ConnectionStatus, WsMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:4000';

export function useWebSocket(token: string | null, channels: string[]) {
  const [lastMessage,      setLastMessage]      = useState<WsMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  const wsRef       = useRef<WebSocket | null>(null);
  const backoffRef  = useRef(1000);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();
  const deadRef     = useRef(false);
  // Ref so the reconnect closure always sees the latest channel list without re-creating
  const channelsRef = useRef(channels);
  channelsRef.current = channels;

  useEffect(() => {
    if (!token) return;
    deadRef.current = false;

    function connect() {
      if (deadRef.current) return;

      const ws = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = ws;
      setConnectionStatus('connecting');

      ws.onopen = () => {
        setConnectionStatus('connected');
        backoffRef.current = 1000; // reset on success
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', channels: channelsRef.current }));
      };

      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data as string) as WsMessage;
          if (msg.channel) setLastMessage(msg);
        } catch { /* ignore malformed frames */ }
      };

      ws.onclose = () => {
        if (deadRef.current) return;
        wsRef.current = null;
        setConnectionStatus('disconnected');
        const delay = backoffRef.current;
        backoffRef.current = Math.min(delay * 2, 30_000);
        timerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => setConnectionStatus('error');
    }

    connect();

    return () => {
      deadRef.current = true;
      clearTimeout(timerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]); // reconnect only when token changes

  // Re-subscribe when selected symbol (channels) changes without a full reconnect
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', channels }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.join(',')]); // stringify to compare content, not array reference

  return { lastMessage, connectionStatus };
}
