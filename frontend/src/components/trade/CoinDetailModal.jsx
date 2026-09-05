import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis, XAxis, ReferenceLine } from 'recharts';
import { useWallet } from '@/contexts/WalletContext';
import { getCoinChart, hapticFeedback } from '@/services/api';
import { fmtPrice, fmtNum, fmtChange, changeColor } from '@/lib/format';
import { toast } from 'sonner';

const RANGES = [
  { id: '1', label: '1D' },
  { id: '7', label: '1W' },
  { id: '30', label: '1M' },
  { id: '365', label: '1Y' },
];

export function CoinDetailModal({ chart, onClose, initialSide = 'buy' }) {
  const { usdtBalance, holdings, buy, sell, updateTakeProfit } = useWallet();
  const [days, setDays] = useState('1');
  const [series, setSeries] = useState([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [side, setSide] = useState(initialSide);
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const holding = holdings.find((h) => h.coin_id === chart.coin_id);
  const [tp, setTp] = useState(holding?.tp_pct ? String(holding.tp_pct) : '');
  const [savingTp, setSavingTp] = useState(false);
  const price = chart.price;
  const up = (chart.change_24h ?? 0) >= 0;

  const saveTp = async () => {
    setSavingTp(true);
    const res = await updateTakeProfit(chart.coin_id, tp ? Number(tp) : 0);
    setSavingTp(false);
    if (res.success) toast.success(tp ? `Take Profit set at +${tp}%` : 'Take Profit cleared');
    else toast.error(res.error || 'Failed');
  };

  useEffect(() => {
    let active = true;
    setLoadingChart(true);
    getCoinChart(chart.coin_id, days)
      .then((res) => {
        if (!active) return;
        const pts = (res.prices || []).map(([t, p]) => ({ t, p }));
        setSeries(pts);
      })
      .catch(() => setSeries([]))
      .finally(() => active && setLoadingChart(false));
    return () => { active = false; };
  }, [chart.coin_id, days]);

  const estBuyQty = side === 'buy' && price && amount ? Number(amount) / price : 0;
  const estSellQuote = side === 'sell' && price && amount ? Number(amount) * price : 0;

  const setPct = (pct) => {
    if (side === 'buy') setAmount(((usdtBalance * pct) / 100).toFixed(2));
    else if (holding) setAmount((holding.amount * pct / 100).toFixed(6));
  };

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return; }
    setSubmitting(true);
    hapticFeedback('impact');
    let res;
    if (side === 'buy') res = await buy(chart.coin_id, amt);
    else res = await sell(chart.coin_id, amt);
    setSubmitting(false);
    if (res.success) {
      hapticFeedback('success');
      toast.success(side === 'buy' ? `Bought ${chart.symbol}` : `Sold ${chart.symbol}`);
      setAmount('');
      setTimeout(onClose, 400);
    } else {
      hapticFeedback('error');
      toast.error(res.error || 'Order failed');
    }
  };

  const lineColor = changeColor(chart.change_24h ?? 0);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-testid="coin-detail-modal"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="relative w-full max-w-md mx-auto tk-card rounded-t-3xl sm:rounded-3xl p-4 max-h-[92vh] overflow-y-auto"
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {chart.image && <img src={chart.image} alt={chart.symbol} className="w-9 h-9 rounded-full" />}
            <div>
              <h2 className="font-bold text-ink leading-none">{chart.symbol}</h2>
              <p className="text-[11px] text-mutedink mt-0.5">{chart.name}</p>
            </div>
          </div>
          <button onClick={onClose} data-testid="close-coin-detail"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 grid place-items-center text-mutedink">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-ink font-mono">${fmtPrice(price)}</span>
          <span className="text-sm font-semibold font-mono" style={{ color: lineColor }}>
            {fmtChange(chart.change_24h)}
          </span>
        </div>

        {/* Chart */}
        <div className="h-44 w-full mb-2" data-testid="detail-chart">
          {loadingChart ? (
            <div className="h-full grid place-items-center text-mutedink">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide domain={['dataMin', 'dataMax']} />
                {holding?.avg_price && (
                  <ReferenceLine y={holding.avg_price} stroke="#ffd166" strokeDasharray="4 3" strokeWidth={1.3}
                    label={{ value: `buy $${fmtPrice(holding.avg_price)}`, position: 'insideTopRight', fill: '#ffd166', fontSize: 10, fontFamily: 'DM Mono' }} />
                )}
                <Tooltip
                  contentStyle={{ background: '#06131a', border: '1px solid rgba(140,242,219,.25)', borderRadius: 12, fontSize: 12 }}
                  labelFormatter={(t) => new Date(t).toLocaleString()}
                  formatter={(v) => [`$${fmtPrice(v)}`, 'Price']}
                />
                <Area type="monotone" dataKey="p" stroke={lineColor} strokeWidth={2}
                  fill="url(#detailGrad)" isAnimationActive={false} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Range buttons */}
        <div className="flex gap-2 mb-4">
          {RANGES.map((r) => (
            <button key={r.id} onClick={() => setDays(r.id)}
              data-testid={`range-${r.label}`}
              className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-colors ${
                days === r.id ? 'bg-mint text-deep font-semibold' : 'bg-white/5 text-mutedink'
              }`}>
              {r.label}
            </button>
          ))}
        </div>

        {/* Buy / Sell */}
        <div className="flex p-1 rounded-2xl bg-white/[0.04] border border-line mb-3">
          <button onClick={() => { setSide('buy'); setAmount(''); }} data-testid="side-buy"
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              side === 'buy' ? 'text-deep' : 'text-mutedink'}`}
            style={side === 'buy' ? { background: '#8cf2db' } : {}}>
            <TrendingUp className="w-4 h-4" /> Buy
          </button>
          <button onClick={() => { setSide('sell'); setAmount(''); }} data-testid="side-sell"
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all ${
              side === 'sell' ? 'text-deep' : 'text-mutedink'}`}
            style={side === 'sell' ? { background: '#ff7a8a' } : {}}>
            <TrendingDown className="w-4 h-4" /> Sell
          </button>
        </div>

        {/* Balance line */}
        <div className="flex justify-between text-[11px] tk-label mb-2">
          {side === 'buy' ? (
            <><span>Available</span><span className="text-ink font-mono">${fmtNum(usdtBalance)}</span></>
          ) : (
            <><span>Holding</span><span className="text-ink font-mono">{holding ? `${fmtNum(holding.amount, 6)} ${chart.symbol}` : `0 ${chart.symbol}`}</span></>
          )}
        </div>

        {/* Amount input */}
        <div className="relative mb-2">
          <input
            type="number" inputMode="decimal" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={side === 'buy' ? 'Amount in USDT' : `Amount in ${chart.symbol}`}
            data-testid="order-amount"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-ink font-mono placeholder:text-mutedink/60 focus:outline-none focus:border-mint/50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 tk-label">
            {side === 'buy' ? 'USDT' : chart.symbol}
          </span>
        </div>

        {/* Quick % */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[25, 50, 75, 100].map((p) => (
            <button key={p} onClick={() => setPct(p)}
              className="py-1.5 rounded-lg bg-white/5 text-mutedink text-xs font-mono hover:bg-white/10">
              {p === 100 ? 'MAX' : `${p}%`}
            </button>
          ))}
        </div>

        {/* Estimate */}
        <p className="text-[11px] text-mutedink mb-3 font-mono">
          {side === 'buy'
            ? `≈ ${fmtNum(estBuyQty, 6)} ${chart.symbol}`
            : `≈ $${fmtNum(estSellQuote)} USDT`}
        </p>

        <button
          onClick={submit} disabled={submitting}
          data-testid="submit-order"
          className="w-full py-3.5 rounded-xl font-bold text-deep flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          style={{ background: side === 'buy' ? 'linear-gradient(135deg,#8cf2db,#57d6c8)' : 'linear-gradient(135deg,#ff9aa6,#ff7a8a)' }}
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {side === 'buy' ? `Buy ${chart.symbol}` : `Sell ${chart.symbol}`}
        </button>

        {holding && (
          <div className="mt-4 pt-4 border-t border-line" data-testid="take-profit-section">
            <div className="flex items-center justify-between mb-2">
              <p className="tk-label">Take Profit</p>
              {holding.tp_pct ? (
                <span className="tk-pill px-2 py-1 text-gold border-gold/40">active +{holding.tp_pct}%</span>
              ) : (
                <span className="tk-label">auto-sell at gain</span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input type="number" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value)}
                  placeholder="Target gain %" data-testid="tp-input"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-line text-ink font-mono placeholder:text-mutedink/60 focus:outline-none focus:border-gold/50" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 tk-label">%</span>
              </div>
              <button onClick={saveTp} disabled={savingTp} data-testid="save-tp"
                className="px-4 rounded-xl font-semibold text-deep glow-gold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#ffe08a,#ffd166)' }}>
                {holding.tp_pct && !tp ? 'Clear' : 'Set'}
              </button>
            </div>
            <p className="text-[10px] text-mutedink/70 mt-2 font-mono">
              We'll auto-sell {chart.symbol} to USDT once your gain reaches the target.
            </p>
          </div>
        )}

        <p className="text-center text-[10px] text-mutedink/70 mt-3 font-mono">
          Spot holdings can't be withdrawn — sell to USDT first.
        </p>
      </motion.div>
    </motion.div>
  );
}

export default CoinDetailModal;
