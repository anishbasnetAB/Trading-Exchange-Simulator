import { useAuth } from '../context/AuthContext';
import { Account, ConnectionStatus } from '../types';
import { formatCash } from '../utils/format';

interface Props {
  account: Account | null;
  connectionStatus: ConnectionStatus;
}

const STATUS_DOT: Record<ConnectionStatus, string> = {
  connected:    'bg-buy',
  connecting:   'bg-gold animate-pulse',
  disconnected: 'bg-slate-600',
  error:        'bg-sell',
};

export function AccountBar({ account, connectionStatus }: Props) {
  const { logout } = useAuth();

  return (
    <div style={{ gridArea: 'account' }} className="p-3 flex flex-col gap-3 bg-surface border-l border-deck">
      <p className="text-[10px] text-slate-500 uppercase tracking-widest">Account</p>

      <div>
        <p className="text-[10px] text-slate-500 mb-0.5">Cash Balance</p>
        <p className="font-mono text-base text-buy">
          {account ? `$${formatCash(account.cashBalance)}` : '—'}
        </p>
      </div>

      <div>
        <p className="text-[10px] text-slate-500 mb-1">Status</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[connectionStatus]}`} />
          <span className="text-xs text-slate-400 capitalize">{connectionStatus}</span>
        </div>
      </div>

      <button
        onClick={logout}
        className="mt-auto text-xs text-slate-500 hover:text-sell transition-colors text-left"
      >
        Sign out
      </button>
    </div>
  );
}
