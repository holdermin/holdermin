import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { WithdrawModal } from '@/components/wallet/WithdrawModal';
import { CoinDetailModal } from '@/components/trade/CoinDetailModal';
import { TransactionList } from '@/components/transactions/TransactionList';
import { fmtNum, fmtPrice, fmtChange, changeColor } from '@/lib/format';
import { ArrowUpRight, Lock } from 'lucide-react';

const TETHER = 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png';
const TRXIMG = 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png';

export function WalletPage() {
  const { usdtBalance, trxBalance, holdings, portfolioValue } = useWallet();
  const [tab, setTab] = useState('assets');
  const [withdraw, setWithdraw] = useState({ open: false, asset: 'USDT' });
  const [sellCoin, setSellCoin] = useState(null);
  const total = fmtNum(usdtBalance + portfolioValue);

  return (
    <div className="px-4 py-4" data-testid="wallet-page">
      <div className="mb-4">
        <p className="tk-label">Balances & activity</p>
        <h1 className="tk-heading text-3xl text-ink mt-1">Wallet</h1>
      </div>

      {/* Tabs */}
      <div className="flex p-1 rounded-2xl bg-white/[0.04] border border-line mb-5" data-testid="wallet-tabs">
        {[{ id: 'assets', label: 'Assets' }, { id: 'history', label: 'History' }].map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} data-testid={`wallet-tab-${id}`}
            className={`relative flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${tab === id ? 'text-deep' : 'text-mutedink'}`}>
            {tab === id && <motion.div layoutId="wtab" className="absolute inset-0 rounded-xl bg-mint" transition={{ type: 'spring', damping: 26, stiffness: 300 }} />}
            <span className="relative z-10">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'assets' ? (
          <motion.div key="assets" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}>
            {/* Total hero */}
            <div className="tk-card p-6 text-center mb-5">
              <p className="tk-label">Total balance</p>
              <p className="text-4xl font-bold text-ink font-mono mt-1">${total}</p>
              <p className="text-xs text-mutedink mt-2">${fmtNum(usdtBalance)} cash · ${fmtNum(portfolioValue)} spot</p>
            </div>

            {/* Withdrawable wallet */}
            <p className="tk-label mb-2">Withdrawable</p>
            <div className="space-y-3 mb-6">
              <BalanceRow img={TETHER} symbol="USDT" name="Tether USD" amount={usdtBalance} onWithdraw={() => setWithdraw({ open: true, asset: 'USDT' })} />
              <BalanceRow img={TRXIMG} symbol="TRX" name="TRON" amount={trxBalance} onWithdraw={() => setWithdraw({ open: true, asset: 'TRX' })} />
            </div>

            {/* Spot holdings (locked) */}
            <div className="flex items-center justify-between mb-2">
              <p className="tk-label">Spot holdings</p>
              <span className="tk-label flex items-center gap-1"><Lock className="w-3 h-3" /> not withdrawable</span>
            </div>
            {holdings.length === 0 ? (
              <div className="tk-card p-6 text-center text-mutedink text-sm">
                No spot positions yet. Buy from the Trade tab.
              </div>
            ) : (
              <div className="space-y-3" data-testid="holdings-list">
                {holdings.map((h) => (
                  <button key={h.coin_id} onClick={() => setSellCoin(h)} data-testid={`holding-${h.coin_id}`}
                    className="tk-card tk-row w-full p-3 flex items-center gap-3 text-left">
                    {h.image && <img src={h.image} alt={h.symbol} className="w-9 h-9 rounded-full" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink">{h.symbol}</p>
                      <p className="text-[11px] text-mutedink font-mono">{fmtNum(h.amount, 6)} @ ${fmtPrice(h.avg_price)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ink font-mono">${fmtNum(h.value)}</p>
                      <p className="text-[11px] font-mono" style={{ color: changeColor(h.pnl ?? 0) }}>
                        {h.pnl != null ? `${h.pnl >= 0 ? '+' : ''}$${fmtNum(Math.abs(h.pnl))} (${fmtChange(h.pnl_pct)})` : '—'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.15 }}>
            <TransactionList />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {withdraw.open && <WithdrawModal asset={withdraw.asset} onClose={() => setWithdraw({ ...withdraw, open: false })} />}
      </AnimatePresence>
      <AnimatePresence>
        {sellCoin && <CoinDetailModal chart={{ ...sellCoin }} initialSide="sell" onClose={() => setSellCoin(null)} />}
      </AnimatePresence>
    </div>
  );
}

function BalanceRow({ img, symbol, name, amount, onWithdraw }) {
  return (
    <div className="tk-card p-4 flex items-center gap-3" data-testid={`balance-${symbol}`}>
      <img src={img} alt={symbol} className="w-10 h-10 rounded-full" />
      <div className="flex-1">
        <p className="text-sm font-bold text-ink">{symbol}</p>
        <p className="text-[11px] text-mutedink">{name}</p>
      </div>
      <div className="text-right mr-1">
        <p className="text-base font-bold text-ink font-mono">{fmtNum(amount, symbol === 'TRX' ? 4 : 2)}</p>
      </div>
      <button onClick={onWithdraw} data-testid={`withdraw-${symbol}`}
        className="px-3 py-2 rounded-xl bg-white/5 border border-line text-mint text-xs font-semibold flex items-center gap-1 hover:bg-mint/10">
        <ArrowUpRight className="w-3.5 h-3.5" /> Send
      </button>
    </div>
  );
}

export default WalletPage;
