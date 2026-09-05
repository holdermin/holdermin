import { Home, Wallet, Target, Users, LineChart } from 'lucide-react';

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
        <div className="relative backdrop-blur-2xl bg-app-bg/90 border-t border-white/[0.08] px-2 py-2 flex justify-between items-end safe-area-bottom">
          {/* Left two items */}
          {sideItems.slice(0, 2).map(({ id, icon: Icon, label }) => (
            <NavButton key={id} id={id} Icon={Icon} label={label} active={activeTab === id} onClick={onTabChange} />
          ))}

          {/* Center elevated Trade button */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => onTabChange('trade')}
              data-testid="nav-trade"
              className="relative -mt-8 flex flex-col items-center"
            >
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                  tradeActive
                    ? 'bg-brand-green text-black glow-green'
                    : 'bg-gradient-to-br from-brand-green to-[#00b862] text-black shadow-lg shadow-brand-green/30'
                }`}
              >
                <LineChart className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <span className={`text-[10px] mt-1 font-semibold ${tradeActive ? 'text-brand-green' : 'text-white/60'}`}>
                Trade
              </span>
            </button>
          </div>

          {/* Right two items */}
          {sideItems.slice(2).map(({ id, icon: Icon, label }) => (
            <NavButton key={id} id={id} Icon={Icon} label={label} active={activeTab === id} onClick={onTabChange} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavButton({ id, Icon, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      data-testid={`nav-${id}`}
      className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-xl transition-all ${
        active ? 'text-white' : 'text-white/40 hover:text-white/60'
      }`}
    >
      <div className={`relative p-2 rounded-xl transition-all ${active ? 'bg-white/10' : ''}`}>
        <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
        {active && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-green" />
        )}
      </div>
      <span className={`text-[10px] mt-1 font-medium ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
    </button>
  );
}

export default BottomNav;
