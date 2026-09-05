import { memo } from 'react';
import { motion } from 'framer-motion';
import Sparkline from './Sparkline';
import { fmtPrice, fmtChange, changeColor } from '@/lib/format';

function CoinCard({ chart, index = 0, onOpen }) {
  const up = (chart.change_24h ?? 0) >= 0;
  return (
    <motion.button
      onClick={() => onOpen(chart)}
      data-testid={`coin-card-${chart.coin_id}`}
      className="tk-card tk-row text-left p-3 overflow-hidden"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        {chart.image ? (
          <img src={chart.image} alt={chart.symbol} className="w-8 h-8 rounded-full" />
        ) : (
          <span className="w-8 h-8 rounded-full tk-icon-tile grid place-items-center text-[10px] font-mono">
            {chart.symbol?.slice(0, 3)}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink leading-none">{chart.symbol}</p>
          <p className="text-[10px] text-mutedink truncate max-w-[90px] mt-0.5">{chart.name}</p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-base font-bold text-ink font-mono">
            {chart.price != null ? `$${fmtPrice(chart.price)}` : '—'}
          </p>
          <p className="text-[11px] font-semibold font-mono" style={{ color: changeColor(chart.change_24h ?? 0) }}>
            {fmtChange(chart.change_24h)}
          </p>
        </div>
        <div className="w-20">
          <Sparkline data={chart.sparkline} up={up} height={40} />
        </div>
      </div>
    </motion.button>
  );
}

export default memo(CoinCard);
