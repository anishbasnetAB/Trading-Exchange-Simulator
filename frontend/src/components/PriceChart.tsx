import { DisplayTrade } from '../types';
import { formatPrice } from '../utils/format';

interface Props {
  trades: DisplayTrade[];
  symbol: string;
}

const W = 500;
const H = 100;
const PAD = 4;

export function PriceChart({ trades, symbol }: Props) {
  // Oldest first for left-to-right time axis
  const prices = [...trades].reverse().map(t => t.price);

  if (prices.length < 2) {
    return (
      <div style={{ gridArea: 'chart' }} className="flex items-center justify-center border-r border-deck bg-surface">
        <span className="text-slate-600 text-sm font-mono">{symbol} · waiting for trades</span>
      </div>
    );
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 0.01;
  const last  = prices[prices.length - 1];
  const first = prices[0];
  const diff  = last - first;
  const isUp  = diff >= 0;
  const color = isUp ? '#00d97e' : '#f23645';

  const pts = prices.map((p, i) => [
    PAD + (i / (prices.length - 1)) * (W - PAD * 2),
    PAD + (1 - (p - min) / range) * (H - PAD * 2),
  ]);

  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${W - PAD},${H} L${PAD},${H} Z`;

  return (
    <div style={{ gridArea: 'chart' }} className="flex flex-col border-r border-deck bg-surface overflow-hidden">
      {/* Mini header */}
      <div className="flex items-baseline justify-between px-3 py-1.5 border-b border-deck">
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{symbol} Price</span>
        <span className={`font-mono text-sm ${isUp ? 'text-buy' : 'text-sell'}`}>
          ${formatPrice(last)}
          <span className="text-xs ml-1 opacity-70">
            ({isUp ? '+' : ''}{formatPrice(diff)})
          </span>
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex-1 min-h-0 p-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`g-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0"    />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#g-${symbol})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" />
        </svg>
      </div>
    </div>
  );
}
