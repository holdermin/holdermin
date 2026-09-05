// Default top-10 crypto charts shown on the Trade page.
// Each entry: { id, name, symbol (TradingView), pair }
export const DEFAULT_SYMBOLS = [
  { id: 'BTCUSDT', name: 'Bitcoin', ticker: 'BTC', symbol: 'BINANCE:BTCUSDT' },
  { id: 'ETHUSDT', name: 'Ethereum', ticker: 'ETH', symbol: 'BINANCE:ETHUSDT' },
  { id: 'BNBUSDT', name: 'BNB', ticker: 'BNB', symbol: 'BINANCE:BNBUSDT' },
  { id: 'SOLUSDT', name: 'Solana', ticker: 'SOL', symbol: 'BINANCE:SOLUSDT' },
  { id: 'XRPUSDT', name: 'XRP', ticker: 'XRP', symbol: 'BINANCE:XRPUSDT' },
  { id: 'TONUSDT', name: 'Toncoin', ticker: 'TON', symbol: 'KRAKEN:TONUSDT' },
  { id: 'TRXUSDT', name: 'TRON', ticker: 'TRX', symbol: 'BINANCE:TRXUSDT' },
  { id: 'DOGEUSDT', name: 'Dogecoin', ticker: 'DOGE', symbol: 'BINANCE:DOGEUSDT' },
  { id: 'ADAUSDT', name: 'Cardano', ticker: 'ADA', symbol: 'BINANCE:ADAUSDT' },
  { id: 'AVAXUSDT', name: 'Avalanche', ticker: 'AVAX', symbol: 'BINANCE:AVAXUSDT' },
];

// Quick-add suggestions for the "Add chart" modal
export const POPULAR_SUGGESTIONS = [
  { ticker: 'LINK', name: 'Chainlink' },
  { ticker: 'MATIC', name: 'Polygon' },
  { ticker: 'DOT', name: 'Polkadot' },
  { ticker: 'LTC', name: 'Litecoin' },
  { ticker: 'SHIB', name: 'Shiba Inu' },
  { ticker: 'NEAR', name: 'NEAR' },
  { ticker: 'ATOM', name: 'Cosmos' },
  { ticker: 'UNI', name: 'Uniswap' },
  { ticker: 'APT', name: 'Aptos' },
  { ticker: 'ARB', name: 'Arbitrum' },
  { ticker: 'OP', name: 'Optimism' },
  { ticker: 'INJ', name: 'Injective' },
];

const STORAGE_KEY = 'tk_trade_charts_v1';

export function loadCharts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SYMBOLS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return DEFAULT_SYMBOLS;
  } catch {
    return DEFAULT_SYMBOLS;
  }
}

export function saveCharts(charts) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  } catch {
    /* ignore */
  }
}

// Build a chart entry from a free-text ticker or full TradingView symbol.
export function buildChartEntry(input) {
  const raw = input.trim().toUpperCase();
  if (!raw) return null;

  // Full symbol like "BINANCE:BTCUSDT" or "COINBASE:ETHUSD"
  if (raw.includes(':')) {
    const pair = raw.split(':')[1] || '';
    const ticker = pair.replace(/(USDT|USDC|USD)$/, '') || pair;
    if (!ticker) return null;
    return { id: raw, name: ticker, ticker, symbol: raw };
  }

  // Plain ticker like "LINK" -> BINANCE:LINKUSDT (only strip a trailing quote)
  const ticker = raw.replace(/(USDT|USDC|USD)$/, '') || raw;
  if (!ticker) return null;
  return {
    id: `${ticker}USDT`,
    name: ticker,
    ticker,
    symbol: `BINANCE:${ticker}USDT`,
  };
}
