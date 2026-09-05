import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Search } from 'lucide-react';
import { POPULAR_SUGGESTIONS, buildChartEntry } from '@/constants/cryptoSymbols';

/**
 * Modal to add a new crypto chart by ticker / TradingView symbol.
 */
export function AddChartModal({ onClose, onAdd, existingIds = [] }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = (input) => {
    const entry = buildChartEntry(input);
    if (!entry) {
      setError('Enter a ticker, e.g. BTC or LINK');
      return;
    }
    if (existingIds.includes(entry.id)) {
      setError(`${entry.ticker} is already on your list`);
      return;
    }
    onAdd(entry);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="add-chart-modal"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md mx-auto bg-app-surface rounded-t-3xl sm:rounded-3xl border border-white/10 p-5"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-white">Add chart</h2>
          <button
            onClick={onClose}
            data-testid="close-add-chart"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd(value)}
            placeholder="Ticker (BTC) or symbol (BINANCE:BTCUSDT)"
            data-testid="add-chart-input"
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-brand-green/50"
          />
        </div>
        {error && <p className="text-xs text-brand-red mb-2" data-testid="add-chart-error">{error}</p>}

        <button
          onClick={() => handleAdd(value)}
          data-testid="confirm-add-chart"
          className="w-full py-3 rounded-xl bg-brand-green text-black font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mb-5"
        >
          <Plus className="w-4 h-4" /> Add chart
        </button>

        {/* Popular suggestions */}
        <p className="text-xs text-white/40 uppercase tracking-wider mb-2">Popular</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SUGGESTIONS.map((s) => (
            <button
              key={s.ticker}
              onClick={() => handleAdd(s.ticker)}
              data-testid={`suggestion-${s.ticker}`}
              className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-white/70 hover:bg-brand-green/10 hover:text-brand-green hover:border-brand-green/30 transition-colors"
            >
              {s.ticker}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AddChartModal;
