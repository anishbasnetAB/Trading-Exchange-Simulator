import { OrderBookData, OrderBookLevel } from '../types';

interface Props { data: OrderBookData | null }

interface RowProps {
  level: OrderBookLevel;
  maxQty: number;
  side: 'bid' | 'ask';
}

function BookRow({ level, maxQty, side }: RowProps) {
  const pct = maxQty > 0 ? (level.quantity / maxQty) * 100 : 0;
  const isBid = side === 'bid';

  return (
    <div className="relative flex justify-between font-mono text-[11px] px-2 py-[2px] hover:bg-white/5">
      {/* Depth bar — anchored to the price side */}
      <div
        className={`absolute inset-y-0 ${isBid ? 'left-0' : 'right-0'} ${isBid ? 'bg-buy/10' : 'bg-sell/10'}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative z-10 ${isBid ? 'text-buy' : 'text-sell'}`}>
        {level.price.toFixed(2)}
      </span>
      <span className="relative z-10 text-slate-400">
        {level.quantity.toLocaleString()}
      </span>
    </div>
  );
}

export function OrderBook({ data }: Props) {
  if (!data) {
    return (
      <div style={{ gridArea: 'orderbook' }} className="flex items-center justify-center text-slate-600 text-sm border-r border-deck">
        Loading…
      </div>
    );
  }

  const maxAsk = Math.max(...data.asks.map(a => a.quantity), 1);
  const maxBid = Math.max(...data.bids.map(b => b.quantity), 1);
  const spread = (data.asks[0]?.price ?? 0) - (data.bids[0]?.price ?? 0);

  return (
    <div style={{ gridArea: 'orderbook' }} className="flex flex-col border-r border-deck bg-surface overflow-hidden">
      <p className="px-2 py-1.5 text-[10px] text-slate-500 uppercase tracking-widest border-b border-deck">
        Order Book · {data.symbol}
      </p>

      {/* Column headers */}
      <div className="flex justify-between px-2 py-0.5 text-[10px] text-slate-600 uppercase">
        <span>Price</span><span>Size</span>
      </div>

      {/* Asks — reversed so lowest ask is closest to spread line */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        {[...data.asks].reverse().map((a, i) => (
          <BookRow key={i} level={a} maxQty={maxAsk} side="ask" />
        ))}
      </div>

      {/* Spread */}
      <div className="py-1 text-center text-[11px] text-slate-500 border-y border-deck font-mono">
        Spread {spread.toFixed(2)}
      </div>

      {/* Bids */}
      <div className="flex-1 overflow-hidden">
        {data.bids.map((b, i) => (
          <BookRow key={i} level={b} maxQty={maxBid} side="bid" />
        ))}
      </div>
    </div>
  );
}
