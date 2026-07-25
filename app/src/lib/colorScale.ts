/**
 * Value → colour. Scales return `var(--…)` refs, not hex, so a theme switch
 * repaints every mark with zero React re-renders and the validated palette lives
 * only in `tokens.css`. Two scales: EFFICIENCY (diverging) and VOLUME (ordinal).
 */

import { scaleQuantize, scaleSqrt, scaleThreshold } from 'd3-scale';

/** Diverging steps, cold -> neutral -> hot. */
const EFFICIENCY_STEPS = [
  'var(--eff-cold-3)', 'var(--eff-cold-2)', 'var(--eff-cold-1)',
  'var(--eff-neutral)',
  'var(--eff-hot-1)', 'var(--eff-hot-2)', 'var(--eff-hot-3)',
] as const;

/** eFG% cut points vs baseline. Neutral ±2 covers ordinary variation; symmetric. */
const EFFICIENCY_CUTS = [-12, -7, -2, 2, 7, 12];

/**
 * Map an eFG% delta (in percentage points) to a diverging step.
 * Hot = above baseline, cold = below.
 */
export const efficiencyColor: (deltaPoints: number) => string = scaleThreshold<number, string>()
  .domain(EFFICIENCY_CUTS)
  .range([...EFFICIENCY_STEPS]);

/** Legend rows for the efficiency scale, ordered cold -> hot. */
export const EFFICIENCY_LEGEND = [
  { color: EFFICIENCY_STEPS[0], label: '−12 or worse' },
  { color: EFFICIENCY_STEPS[1], label: '−12 to −7' },
  { color: EFFICIENCY_STEPS[2], label: '−7 to −2' },
  { color: EFFICIENCY_STEPS[3], label: '±2 (at baseline)' },
  { color: EFFICIENCY_STEPS[4], label: '+2 to +7' },
  { color: EFFICIENCY_STEPS[5], label: '+7 to +12' },
  { color: EFFICIENCY_STEPS[6], label: '+12 or better' },
] as const;

/** Ordinal volume ramp, fewest -> most. */
const VOLUME_STEPS = [
  'var(--vol-1)', 'var(--vol-2)', 'var(--vol-3)', 'var(--vol-4)', 'var(--vol-5)',
] as const;

/** Buckets a 0-1 fraction into the five ramp steps. */
const volumeStep = scaleQuantize<string>().domain([0, 1]).range([...VOLUME_STEPS]);

/** Value → volume ramp. sqrt transform so the busiest zone doesn't flatten the rest. */
export function volumeColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return VOLUME_STEPS[0];
  return volumeStep(Math.sqrt(value / max));
}

export const VOLUME_LEGEND = VOLUME_STEPS.map((color, i) => ({
  color,
  label: ['lowest', 'low', 'medium', 'high', 'highest'][i]!,
}));

/** Mark radius from attempts. sqrt keeps AREA proportional (radius-proportional over-weights big values). */
export function radiusForVolume(value: number, max: number, maxRadius: number, minRadius = 3): number {
  if (max <= 0 || value <= 0) return minRadius;
  return scaleSqrt().domain([0, max]).range([minRadius, maxRadius])(value);
}
