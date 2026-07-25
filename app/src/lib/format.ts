/** Display formatting. Centralised so a number looks the same everywhere. */

/** 0.4462 -> "44.6%" */
export const pct = (value: number, digits = 1): string => `${(value * 100).toFixed(digits)}%`;

/** 1.0412 -> "1.041" */
export const pps = (value: number): string => value.toFixed(3);

/** Signed percentage-point delta: 3.21 -> "+3.2" */
export const signed = (value: number, digits = 1): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(digits)}`;

export const int = (value: number): string => Math.round(value).toLocaleString('en-US');

/** "2025-04-13" -> "Apr 13, 2025" */
export const shortDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
};

/** 264.51 -> "4:25" */
export const clock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** "catchAndShootOnMoveLeft" -> "Catch And Shoot On Move Left" */
export const humanise = (value: string): string =>
  value
    .replace(/_/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const periodLabel = (period: number): string => (period >= 5 ? `OT${period - 4}` : `Q${period}`);
