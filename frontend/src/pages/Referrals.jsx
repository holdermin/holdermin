import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Users, Copy, Check, Share2 } from 'lucide-react';
import { fmtNum } from '@/lib/format';

const BOT = 'https://t.me/TKcex_bot';

export function ReferralsPage() {
  const { uid, totalRefs, trxFromRefs, pool } = useWallet();
  const [copied, setCopied] = useState(false);
  const link = `${BOT}?start=${uid || ''}`;
  const pct = pool && pool.total ? Math.min(100, (pool.distributed / pool.total) * 100) : 0;

  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {}
  };
  const share = () => {
    const text = 'Join TronKeeper — trade spot & earn rewards!';
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="px-4 py-4" data-testid="referrals-page">
      <div className="mb-5">
        <p className="tk-label">Grow the network</p>
        <h1 className="tk-heading text-3xl text-ink mt-1 flex items-center gap-2"><Users className="w-7 h-7 text-mint" /> Invite</h1>
        <p className="text-sm text-mutedink mt-1">Earn TRX for every friend who joins.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="tk-card p-4"><p className="tk-label">Invited</p><p className="text-2xl font-bold text-ink font-mono mt-1">{totalRefs}</p></div>
        <div className="tk-card p-4"><p className="tk-label">TRX earned</p><p className="text-2xl font-bold text-mint font-mono mt-1">{fmtNum(trxFromRefs, 2)}</p></div>
      </div>

      {/* Reward pool */}
      <div className="tk-card p-5 mb-5" data-testid="reward-pool">
        <div className="flex items-center justify-between mb-1">
          <p className="tk-label">Reward pool</p>
          <span className="tk-pill px-2.5 py-1 text-gold border-gold/40">30,000 TRX</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-2xl font-bold text-ink font-mono">{fmtNum(pool?.remaining ?? 30000, 0)}</span>
          <span className="text-sm text-mutedink">TRX remaining</span>
        </div>
        <div className="h-2.5 rounded-full bg-white/8 overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#ffd166,#8cf2db)' }} />
        </div>
        <p className="tk-label mt-2">{fmtNum(pool?.distributed ?? 0, 0)} TRX distributed · shared with every keeper</p>
      </div>

      <div className="tk-card p-5">
        <p className="tk-label mb-2">Your referral link</p>
        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-line mb-3">
          <span className="flex-1 text-sm text-ink font-mono truncate" data-testid="referral-link">{link}</span>
          <button onClick={copy} data-testid="copy-referral" className="w-9 h-9 rounded-lg bg-mint/15 grid place-items-center text-mint">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <button onClick={share} data-testid="share-referral"
          className="w-full py-3 rounded-xl font-bold text-deep flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg,#8cf2db,#57d6c8)' }}>
          <Share2 className="w-4 h-4" /> Share on Telegram
        </button>
      </div>
    </div>
  );
}

export default ReferralsPage;
