import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/contexts/WalletContext';
import { Header } from '@/components/layout/Header';
import { hapticFeedback } from '@/services/api';
import { fmtNum } from '@/lib/format';
import { ArrowUpRight, TrendingUp, Wallet as WalletIcon, Users } from 'lucide-react';

const AGENT = 'https://static.prod-images.emergentagent.com/jobs/6376387f-acd3-446c-bd54-4c331bde845d/images/97f863b07ca172464df7862e9a0b8fccf3405fe500f01c490a145b70cb440db6.jpeg';
const CHARGE_MS = 2500;
const R = 92;
const CIRC = 2 * Math.PI * R;

export function HomePage({ onNavigate }) {
  const { usdtBalance, portfolioValue, holdings, totalRefs } = useWallet();
  const [progress, setProgress] = useState(0);
  const [state, setState] = useState('idle'); // idle | charging | done
  const [burst, setBurst] = useState([]);
  const raf = useRef(null);

  const startCharge = () => {
    if (state === 'charging') return;
    setState('charging');
    hapticFeedback('impact');
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / CHARGE_MS);
      setProgress(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        setState('done');
        hapticFeedback('success');
        setBurst(Array.from({ length: 14 }, (_, i) => i));
        setTimeout(() => { setBurst([]); setState('idle'); setProgress(0); }, 2600);
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const total = fmtNum(usdtBalance + portfolioValue);

  return (
    <div data-testid="home-page">
      <Header />

      {/* Hero — agent tap */}
      <section className="px-4 pt-2 pb-4 text-center">
        <button
          onClick={startCharge}
          disabled={state === 'charging'}
          data-testid="agent-tap"
          className="relative w-[210px] h-[210px] mx-auto grid place-items-center no-select"
          style={{ background: 'transparent', border: 0 }}
        >
          <svg className="absolute inset-0 -rotate-90" width="210" height="210" viewBox="0 0 210 210">
            <circle cx="105" cy="105" r={R} fill="none" stroke="rgba(140,242,219,.15)" strokeWidth="6" />
            <circle
              cx="105" cy="105" r={R} fill="none"
              stroke={state === 'done' ? '#ffd166' : '#8cf2db'} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              style={{ filter: 'drop-shadow(0 0 7px rgba(140,242,219,.7))', transition: 'stroke .2s' }}
            />
          </svg>
          <motion.div
            className="w-[168px] h-[168px] rounded-full overflow-hidden glow-mint"
            style={{ padding: 4, background: 'linear-gradient(140deg,rgba(152,255,232,.85),rgba(111,152,240,.76) 48%,rgba(73,221,198,.56))' }}
            animate={state === 'charging' ? { scale: [1, 0.98, 1] } : { scale: 1 }}
            transition={{ repeat: state === 'charging' ? Infinity : 0, duration: 0.8 }}
          >
            <img src={AGENT} alt="TronKeeper Agent" className="w-full h-full object-cover rounded-full" />
          </motion.div>

          {/* coin burst */}
          <AnimatePresence>
            {burst.map((i) => {
              const angle = (Math.PI * 2 * i) / 14;
              return (
                <motion.span
                  key={i}
                  className="absolute w-5 h-5 rounded-full grid place-items-center text-[8px] font-bold font-mono"
                  style={{ background: 'radial-gradient(circle at 30% 27%,#fffbd0,#ffe88b 40%,#d59c2c)', color: '#7a5416', boxShadow: '0 0 10px rgba(255,209,102,.8)' }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                  animate={{ x: Math.cos(angle) * 120, y: Math.sin(angle) * 120 - 30, opacity: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.1, ease: 'easeOut' }}
                >TK</motion.span>
              );
            })}
          </AnimatePresence>
        </button>

        <p className="tk-label mt-3">
          {state === 'charging' ? 'CHARGING · KEEP THE ENERGY' : state === 'done' ? 'REWARD CHARGED · COMING SOON' : 'TAP THE AGENT · CHARGE 2.5S'}
        </p>

        <h1 className="tk-heading text-4xl text-ink mt-3">TronKeeper</h1>
        <p className="text-sm text-mutedink max-w-[320px] mx-auto mt-2 leading-relaxed">
          A playful gateway to the TRON ecosystem. Charge, trade spot, invite — and keep building.
        </p>
        <div className="flex justify-center flex-wrap gap-2 mt-4">
          {['TRON REWARDS', 'SPOT TRADING', 'WEB3 UTILITY'].map((t) => (
            <span key={t} className="tk-pill px-2.5 py-1.5">{t}</span>
          ))}
        </div>
      </section>

      {/* Portfolio summary */}
      <section className="px-4">
        <div className="tk-card p-5">
          <p className="tk-label">Total portfolio</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl font-bold text-ink font-mono">${total}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl bg-white/[0.03] border border-line p-3">
              <div className="flex items-center gap-1.5 tk-label"><WalletIcon className="w-3.5 h-3.5" /> USDT</div>
              <p className="text-lg font-bold text-ink font-mono mt-1">${fmtNum(usdtBalance)}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-line p-3">
              <div className="flex items-center gap-1.5 tk-label"><TrendingUp className="w-3.5 h-3.5" /> Spot value</div>
              <p className="text-lg font-bold text-ink font-mono mt-1">${fmtNum(portfolioValue)}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('trade')}
            data-testid="home-go-trade"
            className="w-full mt-4 py-3 rounded-xl font-bold text-deep flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg,#8cf2db,#57d6c8)' }}
          >
            Start Trading <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="px-4 mt-4">
        <div className="tk-card p-4 flex items-center justify-around">
          <div className="text-center">
            <p className="tk-label">Assets</p>
            <p className="text-lg font-bold text-ink font-mono mt-1">{holdings.length}</p>
          </div>
          <div className="w-px h-8 bg-line" />
          <div className="text-center">
            <div className="tk-label flex items-center gap-1 justify-center"><Users className="w-3.5 h-3.5" /> Invites</div>
            <p className="text-lg font-bold text-ink font-mono mt-1">{totalRefs}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
