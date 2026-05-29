import { useState, FormEvent } from 'react';
import { useApi } from '../hooks/useApi';
import { formatCash } from '../utils/format';

interface Props {
  symbol: string;
  onOrderPlaced: () => void;
}

type Side      = 'BUY' | 'SELL';
type OrderType = 'LIMIT' | 'MARKET';

export function OrderEntry({ symbol, onOrderPlaced }: Props) {
  const [side,      setSide]      = useState<Side>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');
  const [price,     setPrice]     = useState('');
  const [quantity,  setQuantity]  = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [loading,   setLoading]   = useState(false);

  const { apiFetch } = useApi();

  const estimatedCost =
    orderType === 'LIMIT' && price && quantity
      ? parseFloat(price) * parseFloat(quantity)
      : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const qty = parseFloat(quantity);
    const px  = parseFloat(price);
    if (!isFinite(qty) || qty <= 0) return setError('Invalid quantity');
    if (orderType === 'LIMIT' && (!isFinite(px) || px <= 0)) return setError('Invalid price');

    setLoading(true);
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          symbol, side, type: orderType,
          price: orderType === 'LIMIT' ? px : undefined,
          quantity: qty,
        }),
      });
      setSuccess(true);
      setQuantity('');
      setPrice('');
      onOrderPlaced();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
    }
  }

  const isBuy = side === 'BUY';

  return (
    <div style={{ gridArea: 'orderentry' }} className="flex flex-col bg-surface border-l border-deck overflow-auto p-3 gap-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Place Order</p>

      {/* Buy / Sell toggle */}
      <div className="flex gap-1 bg-background rounded p-1">
        {(['BUY', 'SELL'] as Side[]).map(s => (
          <button key={s} type="button" onClick={() => setSide(s)}
            className={`flex-1 py-1.5 text-xs rounded font-medium transition-colors ${
              side === s
                ? s === 'BUY' ? 'bg-buy text-background' : 'bg-sell text-white'
                : 'text-slate-500 hover:text-slate-300'
            }`}>
            {s}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Limit / Market */}
        <div className="flex gap-1">
          {(['LIMIT', 'MARKET'] as OrderType[]).map(t => (
            <button key={t} type="button" onClick={() => setOrderType(t)}
              className={`flex-1 py-1 text-[11px] rounded border transition-colors ${
                orderType === t ? 'border-accent text-accent' : 'border-deck text-slate-500'
              }`}>
              {t}
            </button>
          ))}
        </div>

        {/* Symbol (read-only) */}
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">Symbol</label>
          <div className="font-mono text-accent bg-background border border-deck rounded px-2 py-1.5 text-sm">
            {symbol}
          </div>
        </div>

        {/* Price */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="block text-[11px] text-slate-500 mb-0.5">Price (USD)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              min="0.01" step="0.01" required
              className="w-full bg-background border border-deck rounded px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-accent"
              placeholder="0.00" />
          </div>
        )}

        {/* Quantity */}
        <div>
          <label className="block text-[11px] text-slate-500 mb-0.5">Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)}
            min="1" step="1" required
            className="w-full bg-background border border-deck rounded px-2 py-1.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-accent"
            placeholder="0" />
        </div>

        {/* Estimated cost */}
        {estimatedCost !== null && (
          <p className="text-[11px] text-slate-500">
            Est. cost <span className="font-mono text-gold">${formatCash(estimatedCost)}</span>
          </p>
        )}

        {error   && <p className="text-[11px] text-sell   bg-sell/10  border border-sell/20  rounded px-2 py-1">{error}</p>}
        {success && <p className="text-[11px] text-buy    bg-buy/10   border border-buy/20   rounded px-2 py-1">Order submitted!</p>}

        <button type="submit" disabled={loading}
          className={`py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 ${
            isBuy ? 'bg-buy hover:bg-buy/80 text-background' : 'bg-sell hover:bg-sell/80 text-white'
          }`}>
          {loading ? 'Placing…' : `${side} ${symbol}`}
        </button>
      </form>
    </div>
  );
}
