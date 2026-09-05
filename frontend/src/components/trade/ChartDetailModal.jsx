import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';

/**
 * Fullscreen modal with the advanced real-time chart for a symbol.
 */
export function ChartDetailModal({ chart, onClose }) {
  if (!chart) return null;

  const advancedConfig = {
    symbol: chart.symbol,
    interval: 'D',
    timezone: 'Etc/UTC',
    theme: 'dark',
    style: '1',
    locale: 'en',
    hide_top_toolbar: false,
    hide_legend: false,
    allow_symbol_change: true,
    save_image: false,
    calendar: false,
    backgroundColor: 'rgba(5, 5, 5, 1)',
    gridColor: 'rgba(255, 255, 255, 0.06)',
    autosize: true,
  };

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="chart-detail-modal"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md mx-auto bg-app-surface rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div>
            <h2 className="font-display text-lg font-bold text-white">{chart.ticker}</h2>
            <p className="text-xs text-white/40">{chart.name}</p>
          </div>
          <button
            onClick={onClose}
            data-testid="close-chart-detail"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-[70vh] w-full">
          <TradingViewWidget
            scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
            config={advancedConfig}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

export default ChartDetailModal;
