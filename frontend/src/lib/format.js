export const fmtPrice = (p) => {
  if (p == null || isNaN(p)) return '—';
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  if (p >= 0.01) return p.toFixed(4);
  return Number(p).toPrecision(4);
};

export const fmtNum = (n, d = 2) =>
  (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d });

export const fmtChange = (c) => {
  if (c == null || isNaN(c)) return '0.00%';
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`;
};

export const changeColor = (c) => (c >= 0 ? '#8cf2db' : '#ff7a8a');
