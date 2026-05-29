import { Position } from '../types';
import { formatPrice, formatQty } from '../utils/format';

interface Props { positions: Position[] }

function PositionRow({ p }: { p: Position }) {
  const pnlPos = p.realizedPnl >= 0;
  return (
    <div className="grid grid-cols-[52px_1fr_1fr_1fr] gap-x-2 px-3 py-1.5 text-[11px] font-mono border-b border-deck/50 hover:bg-white/5">
      <span className="text-accent">{p.symbol}</span>
      <span className={`text-right ${p.quantity >= 0 ? 'text-slate-300' : 'text-sell'}`}>
        {formatQty(p.quantity)}
      </span>
      <span className="text-right text-slate-300">${formatPrice(p.averagePrice)}</span>
      <span className={`text-right ${pnlPos ? 'text-buy' : 'text-sell'}`}>
        {pnlPos ? '+' : ''}{formatPrice(p.realizedPnl)}
      </span>
    </div>
  );
}

export function Positions({ positions }: Props) {
  return (
    <div style={{ gridArea: 'positions' }} className="flex flex-col border-t border-l border-deck bg-surface overflow-hidden">
      <div className="grid grid-cols-[52px_1fr_1fr_1fr] gap-x-2 px-3 py-1.5 text-[10px] text-slate-600 uppercase border-b border-deck">
        <span>Sym</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Avg</span>
        <span className="text-right">P&amp;L</span>
      </div>

      {positions.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-600 text-xs">
          No positions
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {positions.map(p => <PositionRow key={p.symbol} p={p} />)}
        </div>
      )}
    </div>
  );
}
