# TronKeeper — PRD

## Problem Statement
Admin imported a TON/TRON crypto Telegram mini-app and wanted it upgraded into a real product:
1. Admin-managed crypto charts (users only view; admin adds/removes).
2. Real market data (Binance is geo-blocked → **CoinGecko** used).
3. Spot trading: users BUY with USDT balance and SELL back to USDT. Spot holdings are **NOT withdrawable**; only wallet balance (USDT/TRX) is withdrawable.
4. Remove Deposit & Withdraw from Home.
5. Full visual redesign to a teal/mint + gold dark theme (Manrope + DM Mono) per provided HTML.

## Architecture
- Frontend: React + Vite (Telegram mini-app). Theme in `index.css` + `tailwind.config.js`. Charts via Recharts (SVG) fed by backend.
- Backend: FastAPI + MongoDB (`/app/backend/server.py`). CoinGecko proxy with in-memory TTL cache.
- User identity: localStorage `tk_uid` (or `TG_<id>` in Telegram). New users seeded 1000 USDT + 50 TRX (virtual).
- Admin: hidden route `#admin`, JWT auth (bcrypt), brute-force lockout, protects chart CRUD.

## Key Endpoints
- GET /api/charts · POST /api/user/init · GET /api/user/{uid} · GET /api/user/{uid}/transactions
- POST /api/spot/buy · POST /api/spot/sell · POST /api/wallet/withdraw
- GET /api/market/search · GET /api/market/coin/{id}/chart
- POST /api/admin/login · GET /api/admin/me · POST/DELETE /api/admin/charts

## Implemented (2026-09-05)
- Full teal/mint redesign across Home, Trade, Wallet, Missions, Invite, BottomNav (elevated center Trade), Header, loading/error.
- Home: mascot "charge the agent" hero (generated image), portfolio summary, Start Trading; NO deposit/withdraw.
- Trade: grid of admin charts with real price, 24h %, sparkline; detail modal with real line chart (1D/1W/1M/1Y) + Buy/Sell panel.
- Wallet: Assets (total, withdrawable USDT/TRX with Send→WithdrawModal, locked Spot holdings) + History tabs.
- Admin panel (#admin): login, live chart list, search-to-add (CoinGecko), remove.
- Backend spot buy/sell/withdraw, transactions, admin+chart seeding.
- Tested: backend 91% (fixed the 2 failures), frontend 95%. Post-fix verified: correct holding symbols, invalid-id→400, admin auth 401, missing user→404, modal auto-close, Sell-from-holding, consistent currency formatting, spinner hidden.

## Credentials
See `/app/memory/test_credentials.md` (admin: admin@tronkeeper.app / TronKeeper#Admin2026).

## Notes / Backlog
- CoinGecko free tier rate-limits; backend caches + serves stale on 429. A CoinGecko demo API key would harden this. P1.
- Spot buy/sell use read-modify-write on holdings (no atomic lock) — fine for single-user usage; P2 to make atomic.
- Missions are static (not wired to backend progress). P2.
- Supabase was requested for admin; used platform MongoDB + JWT instead (Supabase needs external keys).
