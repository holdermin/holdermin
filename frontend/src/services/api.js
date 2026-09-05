/**
 * TronKeeper API — talks to the FastAPI backend (CoinGecko-powered market data,
 * admin-managed charts, spot trading, wallet).
 */
const BASE = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BASE}/api`;

// ----------------------------------------------------------------------------
// Telegram helpers
// ----------------------------------------------------------------------------
const getTelegram = () =>
  (typeof window !== 'undefined' && window.Telegram?.WebApp) ? window.Telegram.WebApp : null;

export const getTelegramUser = () => getTelegram()?.initDataUnsafe?.user || null;

export const initTelegram = () => {
  const tg = getTelegram();
  if (tg) {
    tg.ready();
    tg.expand();
    if (tg.setHeaderColor) tg.setHeaderColor('#06131a');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#06131a');
  }
};

export const hapticFeedback = (type = 'impact') => {
  const tg = getTelegram();
  if (tg?.HapticFeedback) {
    switch (type) {
      case 'impact': tg.HapticFeedback.impactOccurred('medium'); break;
      case 'success': tg.HapticFeedback.notificationOccurred('success'); break;
      case 'error': tg.HapticFeedback.notificationOccurred('error'); break;
      case 'warning': tg.HapticFeedback.notificationOccurred('warning'); break;
      default: tg.HapticFeedback.impactOccurred('light');
    }
  }
};

// stable per-device uid
export const getUid = () => {
  const tgUser = getTelegramUser();
  if (tgUser?.id) return `TG_${tgUser.id}`;
  let uid = localStorage.getItem('tk_uid');
  if (!uid) {
    uid = 'TK_' + Math.random().toString(36).slice(2, 10).toUpperCase();
    localStorage.setItem('tk_uid', uid);
  }
  return uid;
};

// ----------------------------------------------------------------------------
// HTTP helper
// ----------------------------------------------------------------------------
async function req(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || data.error || `Request failed (${res.status})`);
  }
  return data;
}

// ----------------------------------------------------------------------------
// Public / user endpoints
// ----------------------------------------------------------------------------
export const getCharts = () => req('/charts');
export const initUser = (uid) => req('/user/init', { method: 'POST', body: { uid } });
export const getUser = (uid) => req(`/user/${uid}`);
export const getUserTransactions = (uid) => req(`/user/${uid}/transactions`);
export const getCoinChart = (coinId, days = '1') =>
  req(`/market/coin/${coinId}/chart?days=${days}`);
export const searchCoins = (q) => req(`/market/search?q=${encodeURIComponent(q)}`);

export const spotBuy = (uid, coinId, quoteAmount) =>
  req('/spot/buy', { method: 'POST', body: { uid, coin_id: coinId, quote_amount: quoteAmount } });
export const spotSell = (uid, coinId, baseAmount) =>
  req('/spot/sell', { method: 'POST', body: { uid, coin_id: coinId, base_amount: baseAmount } });
export const withdrawFunds = (uid, asset, amount, toAddress) =>
  req('/wallet/withdraw', { method: 'POST', body: { uid, asset, amount, to_address: toAddress } });
export const getPool = () => req('/pool');
export const setTakeProfit = (uid, coinId, pct) =>
  req('/spot/take-profit', { method: 'POST', body: { uid, coin_id: coinId, pct } });
export const checkTakeProfit = (uid) =>
  req('/spot/check-tp', { method: 'POST', body: { uid } });

// ----------------------------------------------------------------------------
// Admin endpoints
// ----------------------------------------------------------------------------
export const adminLogin = (email, password) =>
  req('/admin/login', { method: 'POST', body: { email, password } });
export const adminMe = (token) => req('/admin/me', { token });
export const adminAddChart = (coinId, token) =>
  req('/admin/charts', { method: 'POST', body: { coin_id: coinId }, token });
export const adminDeleteChart = (chartId, token) =>
  req(`/admin/charts/${chartId}`, { method: 'DELETE', token });

export default {
  getCharts, initUser, getUser, getUserTransactions, getCoinChart, searchCoins,
  spotBuy, spotSell, withdrawFunds, getPool, setTakeProfit, checkTakeProfit,
  adminLogin, adminMe, adminAddChart, adminDeleteChart,
  getUid, hapticFeedback, getTelegramUser, initTelegram,
};
