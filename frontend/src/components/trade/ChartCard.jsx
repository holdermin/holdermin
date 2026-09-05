import { memo } from 'react';
import { motion } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';
import TradingViewWidget from './TradingViewWidget';

/**
 * Compact card showing a mini price chart for a single symbol.
 * The TradingView mini widget renders the name + live price + sparkline;
 * we overlay only the action controls (expand / remove).
 */
function ChartCard({ chart, index = 0, onExpand, onRemove }) {
  const miniConfig = {
    symbol: chart.symbol,
    width: '100%',
    height: '100%',
    locale: 'en',
    dateRange: '1D',
    colorTheme: 'dark',
    isTransparent: true,
    autosize: true,
    largeChartUrl: '',
    chartOnly: false,
    noTimeScale: true,
  };

  return (
    <motion.div
      className="relative glass-card rounded-2xl overflow-hidden border border-white/[0.06]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      data-testid={`chart-card-${chart.id}`}
    >
      {/* Control bar (own row so it never overlaps the widget title) */}
      <div className="flex items-center justify-end gap-1 px-2 pt-2 pb-1">
        <button
          onClick={() => onExpand(chart)}
          data-testid={`expand-chart-${chart.id}`}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
          aria-label="Expand chart"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onRemove(chart.id)}
          data-testid={`remove-chart-${chart.id}`}
          className="w-6 h-6 rounded-md bg-white/5 hover:bg-brand-red/20 flex items-center justify-center text-white/50 hover:text-brand-red transition-colors"
          aria-label="Remove chart"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mini chart (click to expand) */}
      <div
        className="h-40 w-full cursor-pointer"
        onClick={() => onExpand(chart)}
        data-testid={`chart-widget-${chart.id}`}
      >
        <TradingViewWidget
          scriptSrc="https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js"
          config={miniConfig}
        />
      </div>
    </motion.div>
  );
}

export default memo(ChartCard);
