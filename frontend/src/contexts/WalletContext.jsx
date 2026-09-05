import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  initTelegram, getTelegramUser, getUid,
  initUser, getCharts, getUserTransactions,
  spotBuy, spotSell, withdrawFunds,
  getPool, setTakeProfit, checkTakeProfit,
} from '@/services/api';

const WalletContext = createContext(null);
const POLL_MS = 15000;

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
  const [pool, setPool] = useState({ total: 30000, remaining: 30000, distributed: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const pollRef = useRef(null);
  const uidRef = useRef(null);

  const applyUser = (u) => {
    if (!u) return;
    setUsdtBalance(u.usdt_balance || 0);
    setTrxBalance(u.trx_balance || 0);
    setHoldings(u.holdings || []);
    setTotalRefs(u.total_refs || 0);
    setTrxFromRefs(u.trx_refs || 0);
  };

  const refreshCharts = useCallback(async () => {
    try { const res = await getCharts(); if (res.ok) setCharts(res.charts || []); }
    catch (e) { console.error('charts error', e); }
  }, []);

  const refreshPool = useCallback(async () => {
    try { const res = await getPool(); if (res.ok) setPool(res.pool); } catch (e) {}
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      initTelegram();
      setTgUser(getTelegramUser());
      const id = getUid();
      setUid(id); uidRef.current = id;
      const res = await initUser(id);
      if (res.ok) applyUser(res.user);
      await Promise.all([refreshCharts(), refreshPool()]);
    } catch (e) {
      console.error(e);
      setError('Failed to connect. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [refreshCharts, refreshPool]);

  const loadTransactions = useCallback(async () => {
    if (!uidRef.current) return;
    setLoadingTransactions(true);
    try { const res = await getUserTransactions(uidRef.current); if (res.ok) setTransactions(res.transactions || []); }
    catch (e) { console.error(e); }
    finally { setLoadingTransactions(false); }
  }, []);

  const buy = useCallback(async (coinId, quoteAmount) => {
    try {
      const res = await spotBuy(uidRef.current, coinId, quoteAmount);
      if (res.ok) { applyUser(res.user); return { success: true, filled: res.filled }; }
      return { success: false, error: 'Buy failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, []);

  const sell = useCallback(async (coinId, baseAmount) => {
    try {
      const res = await spotSell(uidRef.current, coinId, baseAmount);
      if (res.ok) { applyUser(res.user); return { success: true, filled: res.filled }; }
      return { success: false, error: 'Sell failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, []);

  const withdraw = useCallback(async (asset, amount, toAddress) => {
    try {
      const res = await withdrawFunds(uidRef.current, asset, amount, toAddress);
      if (res.ok) {
        if (asset.toUpperCase() === 'USDT') setUsdtBalance(res.new_balance);
        else setTrxBalance(res.new_balance);
        loadTransactions();
        return { success: true };
      }
      return { success: false, error: 'Withdraw failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, [loadTransactions]);

  const updateTakeProfit = useCallback(async (coinId, pct) => {
    try {
      const res = await setTakeProfit(uidRef.current, coinId, pct);
      if (res.ok) {
        applyUser(res.user);
        if (res.executed?.length) {
          res.executed.forEach((e) => toast.success(`Take Profit hit: sold ${e.symbol} at +${e.pnl_pct}% ($${e.quote})`));
        }
        return { success: true };
      }
      return { success: false, error: 'Failed' };
    } catch (e) { return { success: false, error: e.message }; }
  }, []);

  useEffect(() => { load(); }, [load]);

  // live poll: prices + take-profit checks
  useEffect(() => {
    if (loading) return;
    const tick = async () => {
      await refreshCharts();
      try {
        const res = await checkTakeProfit(uidRef.current);
        if (res.ok && res.user) applyUser(res.user);
        if (res.executed?.length) {
          res.executed.forEach((e) => toast.success(`Take Profit hit: sold ${e.symbol} at +${e.pnl_pct}% ($${e.quote})`));
          loadTransactions();
          refreshPool();
        }
      } catch (e) {}
    };
    pollRef.current = setInterval(tick, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [loading, refreshCharts, loadTransactions, refreshPool]);

  const portfolioValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);

  const value = {
    uid, tgUser, loading, error,
    usdtBalance, trxBalance, holdings, portfolioValue,
    totalRefs, trxFromRefs, pool,
    charts, refreshCharts,
    transactions, loadingTransactions, loadTransactions,
    buy, sell, withdraw, updateTakeProfit, reload: load,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export default WalletContext;
