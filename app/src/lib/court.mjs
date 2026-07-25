/**
 * Court geometry and shot classification this is the source of truth for every
 * spatial derivation. Authored as .mjs so the ETL script and the app can share one copy; `court.ts` re-exports it typed.
 */

export const COURT_LENGTH = 94;
export const COURT_WIDTH = 50;
export const HALF_LENGTH = COURT_LENGTH / 2; 
export const HALF_WIDTH = COURT_WIDTH / 2; 

export const HOOP_X = -(HALF_LENGTH - 5.25); 
export const HOOP_Y = 0;

export const RESTRICTED_AREA_RADIUS = 4;
export const THREE_POINT_ARC_RADIUS = 23.75;
export const CORNER_THREE_DISTANCE = 22;
export const CORNER_THREE_Y = 22;

export const PAINT_HALF_WIDTH = 8;
export const FREE_THROW_LINE_X = -(HALF_LENGTH - 19); 
export const FREE_THROW_CIRCLE_RADIUS = 6;
export const BACKBOARD_X = -(HALF_LENGTH - 4);
export const RIM_RADIUS = 0.75;

export const SIDE_SIGN = -1;

export function distanceFromHoop(x, y) {
  return Math.hypot(x - HOOP_X, y - HOOP_Y);
}

export function isThree(x, y) {
  if (Math.abs(y) >= CORNER_THREE_Y) {
    return distanceFromHoop(x, y) >= CORNER_THREE_DISTANCE;
  }
  return distanceFromHoop(x, y) >= THREE_POINT_ARC_RADIUS;
}

export function isBackcourt(x) {
  return x > 0;
}

export function inPaint(x, y) {
  return Math.abs(y) <= PAINT_HALF_WIDTH && x <= FREE_THROW_LINE_X;
}

export function side(y) {
  if (Math.abs(y) < PAINT_HALF_WIDTH) return 'Center';
  return y * SIDE_SIGN > 0 ? 'Left' : 'Right';
}

export function zone(x, y) {
  if (isBackcourt(x)) return 'Backcourt';

  const dist = distanceFromHoop(x, y);

  if (!isThree(x, y)) {
    if (dist <= RESTRICTED_AREA_RADIUS) return 'Restricted Area';
    if (inPaint(x, y)) return 'Paint (Non-RA)';
    return `Mid-Range ${side(y)}`;
  }

  if (Math.abs(y) >= CORNER_THREE_Y) return `Corner 3 ${side(y)}`;
  if (Math.abs(y) >= PAINT_HALF_WIDTH) return `Wing 3 ${side(y)}`;
  return 'Above the Break 3';
}

export const RANGE_BANDS = /** @type {const} */ ([
  ['At Rim', 0, 4],
  ['Short Paint', 4, 10],
  ['Floater Range', 10, 16],
  ['Long Two', 16, 23.75],
]);

export function rangeBand(x, y) {
  if (isBackcourt(x) || isThree(x, y)) return 'Three';
  const dist = distanceFromHoop(x, y);
  for (const [name, lo, hi] of RANGE_BANDS) {
    if (dist >= lo && dist < hi) return name;
  }
  return 'Three';
}

export const ZONE_ORDER = [
  'Restricted Area',
  'Paint (Non-RA)',
  'Mid-Range Left',
  'Mid-Range Center',
  'Mid-Range Right',
  'Corner 3 Left',
  'Wing 3 Left',
  'Above the Break 3',
  'Wing 3 Right',
  'Corner 3 Right',
  'Backcourt',
];

export const RANGE_ORDER = ['At Rim', 'Short Paint', 'Floater Range', 'Long Two', 'Three'];

/** Possession stage - faster to read than raw seconds. */
export function shotClockBucket(seconds) {
  if (seconds >= 18) return 'Early (24-18)';
  if (seconds >= 7) return 'Middle (18-7)';
  if (seconds >= 4) return 'Late (7-4)';
  return 'Very Late (<4)';
}

export const CLOCK_ORDER = ['Early (24-18)', 'Middle (18-7)', 'Late (7-4)', 'Very Late (<4)'];

export function dribbleBucket(dribbles) {
  if (dribbles === 0) return '0 (Catch & Shoot)';
  if (dribbles <= 2) return '1-2';
  if (dribbles <= 6) return '3-6';
  return '7+';
}

export const DRIBBLE_ORDER = ['0 (Catch & Shoot)', '1-2', '3-6', '7+'];

export const CONTEST_ORDER = ['uncontested', 'lightly_contested', 'heavily_contested'];

export const SHOT_TYPE_ORDER = ['layup', 'post', 'floater', 'jumper', 'heave'];
