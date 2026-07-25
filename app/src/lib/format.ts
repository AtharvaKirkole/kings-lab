/** cetral Display formatting. */

// % calc and roundup
export const pct = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;
export const pps = (value: number): string => value.toFixed(3);
export const signed = (value: number, digits = 1): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;
export const int = (value: number): string => Math.round(value).toLocaleString('en-US');
export const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
};

export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const humanise = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const periodLabel = (period: number): string => (period >= 5 ? `OT${period - 4}` : `Q${period}`);
