import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { hapticFeedback } from '@/services/api';
import { fmtNum } from '@/lib/format';
import { toast } from 'sonner';

export function WithdrawModal({ asset = 'USDT', onClose }) {
  const { usdtBalance, trxBalance, withdraw } = useWallet();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const balance = asset === 'USDT' ? usdtBalance : trxBalance;

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');
    if (amt > balance) return toast.error('Insufficient balance');
    if (!address || address.length < 20) return toast.error('Enter a valid TRON address');
    setSubmitting(true);
    hapticFeedback('impact');
    const res = await withdraw(asset, amt, address);
    setSubmitting(false);
    if (res.success) {
      hapticFeedback('success');
      toast.success(`Withdrawal of ${amt} ${asset} submitted`);
      onClose();
    } else {
      hapticFeedback('error');
      toast.error(res.error || 'Withdrawal failed');
    }
  };

  return (
    <motion.div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="withdraw-modal">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative w-full max-w-md mx-auto tk-card rounded-t-3xl sm:rounded-3xl p-5"
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-ink">Withdraw {asset}</h2>
          <button onClick={onClose} data-testid="close-withdraw" className="w-9 h-9 rounded-full bg-white/5 grid place-items-center text-mutedink"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex justify-between tk-label mb-2">
          <span>Available</span><span className="text-ink font-mono">{fmtNum(balance, asset === 'TRX' ? 4 : 2)} {asset}</span>
        </div>

        <div className="relative mb-3">
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount" data-testid="withdraw-amount"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-ink font-mono placeholder:text-mutedink/60 focus:outline-none focus:border-mint/50" />
          <button onClick={() => setAmount(String(balance))} className="absolute right-3 top-1/2 -translate-y-1/2 tk-label text-mint">MAX</button>
        </div>

        <input value={address} onChange={(e) => setAddress(e.target.value)}
          placeholder="TRON (TRC-20) address" data-testid="withdraw-address"
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-ink font-mono text-sm placeholder:text-mutedink/60 focus:outline-none focus:border-mint/50 mb-4" />

        <button onClick={submit} disabled={submitting} data-testid="confirm-withdraw"
          className="w-full py-3.5 rounded-xl font-bold text-deep flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#8cf2db,#57d6c8)' }}>
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Withdraw
        </button>
      </motion.div>
    </motion.div>
  );
}

export default WithdrawModal;
