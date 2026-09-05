import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import CoinCard from '@/components/trade/CoinCard';
import { CoinDetailModal } from '@/components/trade/CoinDetailModal';
import { Loader2, CandlestickChart } from 'lucide-react';

export function TradePage() {
  const { charts, loading } = useWallet();
  const [selected, setSelected] = useState(null);

  return (
    <div className="px-4 py-4" data-testid="trade-page">
      <div className="mb-5">
        <p className="tk-label">Live markets · CoinGecko</p>
        <h1 className="tk-heading text-3xl text-ink mt-1 flex items-center gap-2">
          <CandlestickChart className="w-7 h-7 text-mint" /> Trade
        </h1>
        <p className="text-sm text-mutedink mt-1">Buy & sell spot with your USDT balance.</p>
      </div>

      {loading ? (
        <div className="py-20 grid place-items-center text-mutedink">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
      ) : charts.length === 0 ? (
        <div className="tk-card p-8 text-center">
          <p className="text-mutedink">No markets available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {charts.map((c, i) => (
            <CoinCard key={c.coin_id} chart={c} index={i} onOpen={setSelected} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected && <CoinDetailModal chart={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

export default TradePage;
