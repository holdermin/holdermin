import { Home, Wallet, Target, Users, CandlestickChart } from 'lucide-react';

const sideItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'missions', icon: Target, label: 'Missions' },
  { id: 'referrals', icon: Users, label: 'Invite' },
  { id: 'wallet', icon: Wallet, label: 'Wallet' },
];

export function BottomNav({ activeTab, onTabChange }) {
  const tradeActive = activeTab === 'trade';
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" data-testid="bottom-nav">
      <div className="max-w-md mx-auto">
        <div
          className="relative flex justify-between items-end px-2 py-2 safe-area-bottom border-t border-line"
          style={{ background: 'rgba(6,19,26,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {sideItems.slice(0, 2).map((it) => (
            <NavButton key={it.id} {...it} active={activeTab === it.id} onClick={onTabChange} />
          ))}

          <div className="flex-1 flex justify-center">
            <button
              onClick={() => onTabChange('trade')}
              data-testid="nav-trade"
              className="relative -mt-8 flex flex-col items-center no-select"
            >
              <div
                className={`w-14 h-14 grid place-items-center rounded-[18px_6px_18px_6px] transition-all active:scale-95 ${
                  tradeActive ? 'glow-mint' : ''
                }`}
                style={{ background: 'linear-gradient(140deg,#8cf2db,#57d6c8 55%,#83a7e9)', color: '#06131a' }}
              >
                <CandlestickChart className="w-7 h-7" strokeWidth={2.4} />
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${tradeActive ? 'text-mint' : 'text-mutedink'}`}>
                Trade
              </span>
            </button>
          </div>

          {sideItems.slice(2).map((it) => (
            <NavButton key={it.id} {...it} active={activeTab === it.id} onClick={onTabChange} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ id, icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      data-testid={`nav-${id}`}
      className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all ${
        active ? 'text-ink' : 'text-mutedink hover:text-ink/80'
      }`}
    >
      <div className={`relative p-2 rounded-xl transition-all ${active ? 'bg-mint/10' : ''}`}>
        <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
        {active && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-mint" />}
      </div>
      <span className={`text-[10px] mt-1 font-medium ${active ? 'text-ink' : 'text-mutedink'}`}>{label}</span>
    </button>
  );
}

export default BottomNav;
