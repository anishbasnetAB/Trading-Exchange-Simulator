import { DisplayTrade } from '../types';
import { formatTime, formatPrice, formatQty } from '../utils/format';

interface Props { trades: DisplayTrade[] }

function TradeRow({ trade }: { trade: DisplayTrade }) {
  return (
    <div className={`grid grid-cols-[70px_52px_1fr_1fr] gap-x-2 px-3 py-[3px] text-[11px] font-mono border-b border-deck/50 hover:bg-white/5 ${trade.isNew ? 'animate-flash-in' : ''}`}>
      <span className="text-slate-500">{formatTime(trade.timestamp)}</span>
      <span className="text-slate-400">{trade.symbol}</span>
      <span className="text-buy text-right">${formatPrice(trade.price)}</span>
      <span className="text-slate-300 text-right">{formatQty(trade.quantity)}</span>
    </div>
  );
}

export function TradeFeed({ trades }: Props) {
  return (
    <div style={{ gridArea: 'trades' }} className="flex flex-col border-t border-r border-deck bg-surface overflow-hidden">
      {/* Column headers */}
      <div className="grid grid-cols-[70px_52px_1fr_1fr] gap-x-2 px-3 py-1.5 text-[10px] text-slate-600 uppercase border-b border-deck">
        <span>Time</span>
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
      </div>

      {trades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
          No trades yet — place matching orders to execute
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {trades.map((t, i) => <TradeRow key={`${t.id}-${i}`} trade={t} />)}
        </div>
      )}
    </div>
  );
}
