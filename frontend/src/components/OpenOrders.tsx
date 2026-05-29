import { DbOrder } from '../types';
import { formatTime, formatPrice } from '../utils/format';

interface Props {
  orders: DbOrder[];
  onCancel: (id: string) => Promise<void>;
}

const TERMINAL = new Set(['FILLED', 'CANCELLED', 'REJECTED']);

function OrderRow({ order: o, onCancel }: { order: DbOrder; onCancel: (id: string) => Promise<void> }) {
  const isBuy = o.side === 'BUY';
  const isActive = !TERMINAL.has(o.status);

  return (
    <div className="grid grid-cols-[70px_52px_36px_40px_68px_52px_56px] gap-x-2 items-center px-3 py-1 text-[11px] font-mono border-b border-deck/50 hover:bg-white/5">
      <span className="text-slate-500">{formatTime(o.created_at)}</span>
      <span className="text-slate-300">{o.symbol}</span>
      <span className={isBuy ? 'text-buy' : 'text-sell'}>{o.side}</span>
      <span className="text-slate-500">{o.type}</span>
      <span className="text-right text-slate-300">
        {o.price ? `$${formatPrice(parseFloat(o.price))}` : 'MKT'}
      </span>
      <span className="text-right text-slate-300">{parseFloat(o.quantity).toLocaleString()}</span>
      {isActive ? (
        <button
          onClick={() => { void onCancel(o.id); }}
          className="text-[10px] text-sell border border-sell/30 hover:bg-sell/10 rounded px-1.5 py-0.5 transition-colors"
        >
          Cancel
        </button>
      ) : (
        <span className="text-[10px] text-slate-600">{o.status}</span>
      )}
    </div>
  );
}

export function OpenOrders({ orders, onCancel }: Props) {
  return (
    <div style={{ gridArea: 'openorders' }} className="flex flex-col border-t border-deck bg-surface overflow-hidden">
      <div className="grid grid-cols-[70px_52px_36px_40px_68px_52px_56px] gap-x-2 px-3 py-1.5 text-[10px] text-slate-600 uppercase border-b border-deck">
        <span>Time</span>
        <span>Symbol</span>
        <span>Side</span>
        <span>Type</span>
        <span className="text-right">Price</span>
        <span className="text-right">Qty</span>
        <span />
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
          No orders
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {orders.map(o => <OrderRow key={o.id} order={o} onCancel={onCancel} />)}
        </div>
      )}
    </div>
  );
}
