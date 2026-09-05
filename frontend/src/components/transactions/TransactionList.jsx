import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { fmtNum } from '@/lib/format';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'buy', label: 'Buys' },
  { id: 'sell', label: 'Sells' },
  { id: 'withdraw', label: 'Withdrawals' },
];

const cfg = {
  buy: { icon: TrendingUp, color: '#8cf2db', label: 'Buy', sign: '' },
  sell: { icon: TrendingDown, color: '#ff7a8a', label: 'Sell', sign: '' },
  withdraw: { icon: ArrowUpRight, color: '#ff7a8a', label: 'Withdraw', sign: '-' },
  deposit: { icon: ArrowDownLeft, color: '#8cf2db', label: 'Deposit', sign: '+' },
};

export function TransactionList() {
  const { transactions, loadingTransactions, loadTransactions } = useWallet();
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const list = filter === 'all' ? transactions : transactions.filter((t) => t.type === filter);

  return (
    <div data-testid="transaction-list">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
        {FILTERS.map(({ id, label }) => (
          <button key={id} onClick={() => setFilter(id)} data-testid={`filter-${id}`}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${filter === id ? 'bg-mint text-deep' : 'bg-white/5 text-mutedink hover:bg-white/10'}`}>
            {label}
          </button>
        ))}
      </div>

      {loadingTransactions ? (
        <div className="py-10 text-center text-mutedink text-sm">Loading…</div>
      ) : list.length === 0 ? (
        <div className="tk-card p-8 text-center">
          <Clock className="w-8 h-8 text-mutedink mx-auto mb-2" />
          <p className="text-mutedink text-sm">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((tx, i) => {
            const c = cfg[tx.type] || cfg.buy;
            const Icon = c.icon;
            const isQuote = tx.type === 'buy' || tx.type === 'sell';
            const shown = isQuote ? tx.quote : tx.amount;
            return (
              <motion.div key={tx.id || i} className="tk-card p-3.5 flex items-center gap-3"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                data-testid={`tx-${tx.id || i}`}>
                <span className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0" style={{ background: `${c.color}1a` }}>
                  <Icon className="w-4.5 h-4.5" style={{ color: c.color }} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{c.label} {tx.asset}</span>
                    {tx.status === 'pending' && <span className="tk-label text-gold">pending</span>}
                  </div>
                  <p className="text-[11px] text-mutedink mt-0.5 font-mono">
                    {new Date(tx.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono" style={{ color: c.color }}>
                    {c.sign}{isQuote ? '$' : ''}{fmtNum(shown, isQuote ? 2 : 4)}{!isQuote ? ` ${tx.asset}` : ''}
                  </p>
                  {isQuote && <p className="text-[10px] text-mutedink font-mono">{fmtNum(tx.amount, 6)} {tx.asset}</p>}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TransactionList;
