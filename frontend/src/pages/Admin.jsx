import { useState, useEffect, useCallback } from 'react';
import { Loader2, Trash2, Plus, Search, LogOut, ShieldCheck } from 'lucide-react';
import { adminLogin, adminMe, adminAddChart, adminDeleteChart, getCharts, searchCoins } from '@/services/api';
import { fmtPrice } from '@/lib/format';
import { toast } from 'sonner';

const TOKEN_KEY = 'tk_admin_token';

export function AdminPanel() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [charts, setCharts] = useState([]);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const loadCharts = useCallback(async () => {
    const res = await getCharts();
    if (res.ok) setCharts(res.charts || []);
  }, []);

  useEffect(() => {
    (async () => {
      if (token) {
        try { await adminMe(token); setAuthed(true); await loadCharts(); }
        catch { localStorage.removeItem(TOKEN_KEY); setToken(''); }
      }
      setChecking(false);
    })();
  }, [token, loadCharts]);

  const doLogin = async () => {
    setLoggingIn(true);
    try {
      const res = await adminLogin(email.trim(), password);
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setAuthed(true);
      await loadCharts();
      toast.success('Welcome, admin');
    } catch (e) { toast.error(e.message || 'Login failed'); }
    finally { setLoggingIn(false); }
  };

  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(''); setAuthed(false); };

  const doSearch = async (val) => {
    setQ(val);
    if (val.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { const res = await searchCoins(val.trim()); setResults(res.results || []); }
    catch { setResults([]); }
    finally { setSearching(false); }
  };

  const addChart = async (coinId) => {
    try { await adminAddChart(coinId, token); toast.success('Chart added'); setQ(''); setResults([]); await loadCharts(); }
    catch (e) { toast.error(e.message || 'Failed to add'); }
  };

  const removeChart = async (id) => {
    try { await adminDeleteChart(id, token); toast.success('Chart removed'); await loadCharts(); }
    catch (e) { toast.error(e.message || 'Failed to remove'); }
  };

  if (checking) {
    return <div className="min-h-screen grid place-items-center text-mint"><Loader2 className="w-7 h-7 animate-spin" /></div>;
  }

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center px-6">
        <div className="tk-card p-6 w-full max-w-sm" data-testid="admin-login">
          <div className="flex items-center gap-2 mb-1"><ShieldCheck className="w-5 h-5 text-mint" /><h1 className="tk-heading text-xl text-ink">Admin Access</h1></div>
          <p className="tk-label mb-5">Manage TronKeeper charts</p>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" data-testid="admin-email"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-ink mb-3 focus:outline-none focus:border-mint/50" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" data-testid="admin-password"
            onKeyDown={(e) => e.key === 'Enter' && doLogin()}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-line text-ink mb-4 focus:outline-none focus:border-mint/50" />
          <button onClick={doLogin} disabled={loggingIn} data-testid="admin-login-btn"
            className="w-full py-3 rounded-xl font-bold text-deep flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#8cf2db,#57d6c8)' }}>
            {loggingIn && <Loader2 className="w-4 h-4 animate-spin" />} Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto px-4 py-5" data-testid="admin-panel">
      <div className="flex items-center justify-between mb-5">
        <div><p className="tk-label">Admin</p><h1 className="tk-heading text-2xl text-ink">Manage Charts</h1></div>
        <button onClick={logout} data-testid="admin-logout" className="px-3 py-2 rounded-xl bg-white/5 border border-line text-mutedink text-sm flex items-center gap-1.5"><LogOut className="w-4 h-4" /> Exit</button>
      </div>

      {/* Add */}
      <div className="tk-card p-4 mb-5">
        <p className="tk-label mb-2">Add a coin</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-mutedink" />
          <input value={q} onChange={(e) => doSearch(e.target.value)} placeholder="Search e.g. bitcoin, sui, pepe" data-testid="admin-search"
            className="w-full pl-9 pr-3 py-3 rounded-xl bg-white/5 border border-line text-ink focus:outline-none focus:border-mint/50" />
        </div>
        {searching && <p className="text-xs text-mutedink mt-2">Searching…</p>}
        {results.length > 0 && (
          <div className="mt-3 space-y-2 max-h-64 overflow-y-auto" data-testid="admin-search-results">
            {results.map((r) => (
              <div key={r.coin_id} className="flex items-center gap-3 p-2 rounded-xl bg-white/[0.03] border border-line">
                {r.image && <img src={r.image} alt="" className="w-7 h-7 rounded-full" />}
                <div className="flex-1 min-w-0"><p className="text-sm text-ink font-semibold">{r.symbol}</p><p className="text-[11px] text-mutedink truncate">{r.name}</p></div>
                <button onClick={() => addChart(r.coin_id)} data-testid={`add-${r.coin_id}`}
                  className="px-3 py-1.5 rounded-lg bg-mint/15 text-mint text-xs font-semibold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current charts */}
      <p className="tk-label mb-2">Current charts · {charts.length}</p>
      <div className="space-y-2" data-testid="admin-charts">
        {charts.map((c) => (
          <div key={c.id} className="tk-card p-3 flex items-center gap-3" data-testid={`admin-chart-${c.coin_id}`}>
            {c.image && <img src={c.image} alt="" className="w-8 h-8 rounded-full" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-ink">{c.symbol}</p>
              <p className="text-[11px] text-mutedink truncate">{c.name} · ${fmtPrice(c.price)}</p>
            </div>
            <button onClick={() => removeChart(c.id)} data-testid={`remove-${c.coin_id}`}
              className="w-9 h-9 rounded-lg bg-white/5 hover:bg-coral/20 grid place-items-center text-mutedink hover:text-coral"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AdminPanel;
