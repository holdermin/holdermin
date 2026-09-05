import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  initTelegram, getTelegramUser, getUid,
  initUser, getCharts, getUserTransactions,
  spotBuy, spotSell, withdrawFunds,
} from '@/services/api';

const WalletContext = createContext(null);

export function WalletProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [tgUser, setTgUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [usdtBalance, setUsdtBalance] = useState(0);
  const [trxBalance, setTrxBalance] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [totalRefs, setTotalRefs] = useState(0);
  const [trxFromRefs, setTrxFromRefs] = useState(0);

  const [charts, setCharts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const pollRef = useRef(null);

  const applyUser = (u) => {
    if (!u) return;
    setUsdtBalance(u.usdt_balance || 0);
    setTrxBalance(u.trx_balance || 0);
    setHoldings(u.holdings || []);
    setTotalRefs(u.total_refs || 0);
    setTrxFromRefs(u.trx_refs || 0);
  };

  const refreshCharts = useCallback(async () => {
    try {
      const res = await getCharts();
      if (res.ok) setCharts(res.charts || []);
    } catch (e) {
      console.error('charts error', e);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      initTelegram();
      setTgUser(getTelegramUser());
      const id = getUid();
      setUid(id);
      const res = await initUser(id);
      if (res.ok) applyUser(res.user);
      await refreshCharts();
    } catch (e) {
      console.error(e);
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [refreshCharts]);

  const loadTransactions = useCallback(async () => {
    if (!uid) return;
    setLoadingTransactions(true);
    try {
      const res = await getUserTransactions(uid);
      if (res.ok) setTransactions(res.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTransactions(false);
    }
  }, [uid]);

  const buy = useCallback(async (coinId, quoteAmount) => {
    try {
      const res = await spotBuy(uid, coinId, quoteAmount);
      if (res.ok) { applyUser(res.user); return { success: true, filled: res.filled }; }
      return { success: false, error: 'Buy failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, [uid]);

  const sell = useCallback(async (coinId, baseAmount) => {
    try {
      const res = await spotSell(uid, coinId, baseAmount);
      if (res.ok) { applyUser(res.user); return { success: true, filled: res.filled }; }
      return { success: false, error: 'Sell failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, [uid]);

  const withdraw = useCallback(async (asset, amount, toAddress) => {
    try {
      const res = await withdrawFunds(uid, asset, amount, toAddress);
      if (res.ok) {
        if (asset.toUpperCase() === 'USDT') setUsdtBalance(res.new_balance);
        else setTrxBalance(res.new_balance);
        loadTransactions();
        return { success: true };
      }
      return { success: false, error: 'Withdraw failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, [uid, loadTransactions]);

  useEffect(() => { load(); }, [load]);

  // poll charts for live prices
  useEffect(() => {
    if (loading) return;
    pollRef.current = setInterval(refreshCharts, 60000);
    return () => clearInterval(pollRef.current);
  }, [loading, refreshCharts]);

  const portfolioValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

  const value = {
    uid, tgUser, loading, error,
    usdtBalance, trxBalance, holdings, portfolioValue,
    totalRefs, trxFromRefs,
    charts, refreshCharts,
    transactions, loadingTransactions, loadTransactions,
    buy, sell, withdraw, reload: load,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export default WalletContext;
