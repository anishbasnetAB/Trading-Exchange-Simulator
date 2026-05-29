const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN'] as const;
export type Symbol = typeof SYMBOLS[number];

interface Props {
  selectedSymbol: string;
  onSymbolChange: (s: string) => void;
}

export function Header({ selectedSymbol, onSymbolChange }: Props) {
  return (
    <header
      style={{ gridArea: 'header' }}
      className="flex items-center gap-1 px-4 h-11 border-b border-deck bg-surface"
    >
      <span className="text-accent font-mono font-bold text-base mr-5">⬡ ExchangeOS</span>

      {SYMBOLS.map(s => (
        <button
          key={s}
          onClick={() => onSymbolChange(s)}
          className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
            selectedSymbol === s
              ? 'bg-accent/20 text-accent border border-accent/40'
              : 'text-slate-500 hover:text-slate-300 border border-transparent'
          }`}
        >
          {s}
        </button>
      ))}
    </header>
  );
}
