import { useState, useEffect } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { WalletProvider, useWallet } from '@/contexts/WalletContext';
import { PageContainer } from '@/components/layout/PageContainer';
import { BottomNav } from '@/components/layout/BottomNav';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'sonner';

import { HomePage } from '@/pages/Home';
import { WalletPage } from '@/pages/Wallet';
import { MissionsPage } from '@/pages/Missions';
import { ReferralsPage } from '@/pages/Referrals';
import { TradePage } from '@/pages/Trade';
import { AdminPanel } from '@/pages/Admin';

import '@/App.css';

const manifestUrl = 'https://raw.githubusercontent.com/AntipressTeam/TonConnectManifest/main/tonkeeper.json';

function AppContent() {
  const { loading, error } = useWallet();
  const [activeTab, setActiveTab] = useState('home');

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto mb-5 relative">
              <div className="absolute inset-0 rounded-full border-2 border-mint/15" />
              <div className="absolute inset-0 rounded-full border-2 border-t-mint border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
            <h1 className="tk-heading text-xl text-ink mb-1">TronKeeper</h1>
            <p className="tk-label">Connecting…</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-screen px-6">
          <div className="text-center">
            <h1 className="tk-heading text-xl text-ink mb-2">Connection Error</h1>
            <p className="text-sm text-mutedink mb-6">{error}</p>
            <button onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl font-bold text-deep" style={{ background: 'linear-gradient(135deg,#8cf2db,#57d6c8)' }}>
              Try Again
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.15 }}>
          {activeTab === 'home' && <HomePage onNavigate={setActiveTab} />}
          {activeTab === 'trade' && <TradePage />}
          {activeTab === 'wallet' && <WalletPage />}
          {activeTab === 'missions' && <MissionsPage />}
          {activeTab === 'referrals' && <ReferralsPage />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </PageContainer>
  );
}

function App() {
  const [isAdmin, setIsAdmin] = useState(
    typeof window !== 'undefined' && window.location.hash.toLowerCase().includes('admin')
  );

  useEffect(() => {
    const onHash = () => setIsAdmin(window.location.hash.toLowerCase().includes('admin'));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <Toaster position="top-center" theme="dark" toastOptions={{
        style: { background: '#06131a', border: '1px solid rgba(140,242,219,.25)', color: '#e9fffb' },
      }} />
      {isAdmin ? (
        <AdminPanel />
      ) : (
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          <WalletProvider>
            <AppContent />
          </WalletProvider>
        </TonConnectUIProvider>
      )}
    </>
  );
}

export default App;
