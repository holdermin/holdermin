import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, LineChart, RotateCcw } from 'lucide-react';
import { loadCharts, saveCharts, DEFAULT_SYMBOLS } from '@/constants/cryptoSymbols';
import ChartCard from '@/components/trade/ChartCard';
import { AddChartModal } from '@/components/trade/AddChartModal';
import { ChartDetailModal } from '@/components/trade/ChartDetailModal';
import { hapticFeedback } from '@/services/api';

export function TradePage() {
  const [charts, setCharts] = useState(() => loadCharts());
  const [addOpen, setAddOpen] = useState(false);
  const [detailChart, setDetailChart] = useState(null);

  useEffect(() => {
    saveCharts(charts);
  }, [charts]);

  const handleAdd = (entry) => {
    setCharts((prev) => [entry, ...prev]);
    hapticFeedback('success');
  };

  const handleRemove = (id) => {
    setCharts((prev) => prev.filter((c) => c.id !== id));
    hapticFeedback('light');
  };

  const handleReset = () => {
    setCharts(DEFAULT_SYMBOLS);
    hapticFeedback('warning');
  };

  return (
    <div className="px-4 py-4 pb-8" data-testid="trade-page">
      {/* Header */}
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <LineChart className="w-6 h-6 text-brand-green" />
            Trade
          </h1>
          <p className="text-sm text-white/50 mt-1">Live crypto charts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            data-testid="reset-charts"
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white active:scale-95 transition-all"
            aria-label="Reset to default charts"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAddOpen(true)}
            data-testid="open-add-chart"
            className="h-10 px-4 rounded-xl bg-brand-green text-black font-semibold flex items-center gap-2 active:scale-95 transition-transform glow-green"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </div>

      {/* Chart grid */}
      {charts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <LineChart className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/50 mb-4">No charts yet</p>
          <button
            onClick={() => setAddOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-brand-green text-black font-semibold"
          >
            Add your first chart
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {charts.map((chart, i) => (
            <ChartCard
              key={chart.id}
              chart={chart}
              index={i}
              onExpand={setDetailChart}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {addOpen && (
          <AddChartModal
            onClose={() => setAddOpen(false)}
            onAdd={handleAdd}
            existingIds={charts.map((c) => c.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detailChart && (
          <ChartDetailModal chart={detailChart} onClose={() => setDetailChart(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default TradePage;
