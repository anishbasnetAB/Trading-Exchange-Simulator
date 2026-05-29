import WebSocket from 'ws';

// One active socket per userId — reconnects replace the old entry
const userConnections = new Map<string, WebSocket>();

// Public channel name (e.g. 'public:trades:AAPL') → set of subscribed sockets
const channelSubscriptions = new Map<string, Set<WebSocket>>();

export function addConnection(userId: string, ws: WebSocket): void {
  userConnections.set(userId, ws);
}

export function removeConnection(userId: string, ws: WebSocket): void {
  // Guard: only evict the userId slot if it still points to this socket.
  // A reconnect may have already replaced it, and we must not remove the new connection.
  if (userConnections.get(userId) === ws) {
    userConnections.delete(userId);
  }

  for (const [channel, sockets] of channelSubscriptions) {
    sockets.delete(ws);
    if (sockets.size === 0) channelSubscriptions.delete(channel);
  }
}

export function subscribe(channel: string, ws: WebSocket): void {
  if (!channelSubscriptions.has(channel)) {
    channelSubscriptions.set(channel, new Set());
  }
  channelSubscriptions.get(channel)!.add(ws);
}

export function broadcast(channel: string, message: string): void {
  const sockets = channelSubscriptions.get(channel);
  if (!sockets) return;

  for (const ws of sockets) {
    if (ws.readyState !== ws.OPEN) continue;
    try {
      ws.send(message);
    } catch (err) {
      console.error(`broadcast error on ${channel}:`, err);
    }
  }
}

export function sendToUser(userId: string, message: string): void {
  const ws = userConnections.get(userId);
  if (!ws || ws.readyState !== ws.OPEN) return;
  try {
    ws.send(message);
  } catch (err) {
    console.error(`sendToUser error for ${userId}:`, err);
  }
}
