# TronKeeper Mini App — PRD

## Original Problem Statement
User imported a TON/TRON crypto Telegram mini-app (TronKeeper, React + Vite, frontend-only, mocked data) from their GitHub and wanted aesthetic/visual + functional improvements.

## Requested Changes (this session)
1. Integrate the standalone **History** page INTO the **Wallet** page.
2. Add a new **Trade** page in the CENTER of the bottom navigation.
3. Trade page shows 10 main crypto charts; user can add their own charts anytime.

## Tech Stack
- React 19 + Vite (frontend only, no backend). Data mocked in `services/api.js` dev mode.
- TailwindCSS, framer-motion, lucide-react, shadcn/ui, TonConnect.
- Live charts via TradingView embed widgets (external CDN, no API key).

## Implemented (2026-09-05)
- **Bottom nav** redesigned to 5 items with an elevated green center **Trade** button; old History tab removed. (`components/layout/BottomNav.jsx`)
- **Trade page** (`pages/Trade.jsx`): grid of TradingView mini charts (BTC, ETH, BNB, SOL, XRP, TON, TRX, DOGE, ADA, AVAX). Add chart (ticker or EXCHANGE:PAIR) + popular suggestion chips, remove chart, reset to defaults. Persists to localStorage (`tk_trade_charts_v1`). Tap a card / expand button opens full advanced-chart modal.
  - `components/trade/`: TradingViewWidget, ChartCard, AddChartModal, ChartDetailModal
  - `constants/cryptoSymbols.js`: defaults, suggestions, load/save, buildChartEntry
- **Wallet page** (`pages/Wallet.jsx`): segmented Assets / History tabs; History renders the transaction list inline. Added sample transactions to `services/api.js` mock.
- Fixed Vite `allowedHosts` to allow preview subdomains.
- StrictMode-safe TradingView embed (no console errors); controls moved to own row (no title overlap).

## Status
- Frontend tested via testing agent: 13/13 functional scenarios passed. 0 console errors after fixes.

## Backlog / Next
- P1: Validate typed tickers against a symbol list (unknown ticker renders empty card).
- P2: Optional drag-to-reorder charts; watchlist grouping.
- P2: Wire real backend endpoints (currently mocked): transactions, auth, hold, referrals.
