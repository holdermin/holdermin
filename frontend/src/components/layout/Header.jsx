import { useWallet } from '@/contexts/WalletContext';
import { fmtNum } from '@/lib/format';

const LOGO = 'https://static.prod-images.emergentagent.com/jobs/6376387f-acd3-446c-bd54-4c331bde845d/images/97f863b07ca172464df7862e9a0b8fccf3405fe500f01c490a145b70cb440db6.jpeg';

export function Header() {
  const { tgUser, usdtBalance, portfolioValue } = useWallet();
  const total = fmtNum(usdtBalance + portfolioValue);

  return (
    <header className="flex items-center justify-between px-4 py-3 safe-area-top" data-testid="header">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 grid place-items-center rounded-[8px_2px_8px_2px] border border-mint/40 glow-mint overflow-hidden">
          <img src={LOGO} alt="TronKeeper" className="w-full h-full object-cover" />
        </span>
        <span className="font-mono text-[0.72rem] tracking-[0.14em] uppercase text-ink">TronKeeper</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden xs:inline-flex items-center gap-1.5 tk-label">
          <i className="w-[7px] h-[7px] rounded-full bg-mint" style={{ boxShadow: '0 0 0 4px rgba(140,242,219,.1),0 0 12px #8cf2db', animation: 'beacon 2.2s ease-in-out infinite' }} />
          online
        </span>
        <div className="text-right">
          <p className="tk-label">Total</p>
          <p className="text-sm font-bold text-ink">${total}</p>
        </div>
        {tgUser?.photo_url && (
          <img src={tgUser.photo_url} alt="me" className="w-9 h-9 rounded-full object-cover border border-line" />
        )}
      </div>
    </header>
  );
}

export default Header;
