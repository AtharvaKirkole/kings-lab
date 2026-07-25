/**
 * Shooting metrics and grouped aggregation. All aggregation funnels through
 * `summarise` / `groupBy`, so "eFG%" means one thing everywhere. Metrics come
 * from raw counts (never averaged from other rates), so totals stay consistent
 * however a slice is composed.
 */

import { descending, group, sum } from 'd3-array';

import type { Shot } from '../data/types';

/** Below this many attempts a rate is noise; the UI marks it, doesn't hide it. */
export const LOW_SAMPLE_THRESHOLD = 25;

export interface ShotSummary {
  attempts: number;
  makes: number;
  points: number;
  /** Field-goal percentage, 0-1. */
  fg: number;
  /** Effective FG%, 0-1: credits a three at 1.5x a two so shapes stay comparable. */
  efg: number;
  /** Points per attempt - same info as eFG%, on a scale coaches use. */
  pps: number;
  threeAttempts: number;
  threeMakes: number;
  /** Share of attempts that were threes, 0-1. */
  threeRate: number;
  /**
   * Share of MAKES (not attempts) that were assisted, 0-1. An assist only lands
   * on a make, so a makes denominator answers "when he scores, how often set up?"
   * - an attempts denominator would just re-encode FG%.
   */
  assistedRate: number;
  contestedRate: number;
  foulRate: number;
  blockRate: number;
  /** True when `attempts` is too small to trust the rates. */
  lowSample: boolean;
}

export const EMPTY_SUMMARY: ShotSummary = {
  attempts: 0, makes: 0, points: 0, fg: 0, efg: 0, pps: 0,
  threeAttempts: 0, threeMakes: 0, threeRate: 0,
  assistedRate: 0, contestedRate: 0, foulRate: 0, blockRate: 0,
  lowSample: true,
};

const rate = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator);

/** Reduce a set of shots to the standard metric block. */
export function summarise(shots: readonly Shot[]): ShotSummary {
  const attempts = shots.length;
  if (attempts === 0) return EMPTY_SUMMARY;

  let makes = 0;
  let points = 0;
  let threeAttempts = 0;
  let threeMakes = 0;
  let assisted = 0;
  let contested = 0;
  let fouled = 0;
  let blocked = 0;

  for (const s of shots) {
    if (s.made) makes++;
    points += s.points;
    if (s.isThree) {
      threeAttempts++;
      if (s.made) threeMakes++;
    }
    if (s.assisted) assisted++;
    if (s.contested) contested++;
    if (s.fouled) fouled++;
    if (s.blocked) blocked++;
  }

  return {
    attempts,
    makes,
    points,
    fg: rate(makes, attempts),
    // eFG% = (FGM + 0.5 x 3PM) / FGA
    efg: rate(makes + 0.5 * threeMakes, attempts),
    pps: rate(points, attempts),
    threeAttempts,
    threeMakes,
    threeRate: rate(threeAttempts, attempts),
    // % of makes that were assisted (see the field doc for why makes, not FGA).
    assistedRate: rate(assisted, makes),
    contestedRate: rate(contested, attempts),
    foulRate: rate(fouled, attempts),
    blockRate: rate(blocked, attempts),
    lowSample: attempts < LOW_SAMPLE_THRESHOLD,
  };
}

export interface Group<K extends string | number = string> extends ShotSummary {
  key: K;
  /** This group's share of the parent slice's attempts, 0-1. */
  share: number;
  shots: Shot[];
}

/**
 * Group shots by a key and summarise each bucket. With `order`, listed keys come
 * first (unknowns appended, never dropped); without it, sorted by volume.
 */
export function groupBy<K extends string | number>(
  shots: readonly Shot[],
  key: (shot: Shot) => K,
  order?: readonly K[],
): Group<K>[] {
  const total = shots.length;
  const groups: Group<K>[] = Array.from(group(shots, key), ([k, bucket]) => ({
    key: k,
    share: rate(bucket.length, total),
    shots: bucket,
    ...summarise(bucket),
  }));

  if (order) {
    const rank = new Map(order.map((k, i) => [k, i]));
    groups.sort((a, b) => (rank.get(a.key) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.key) ?? Number.MAX_SAFE_INTEGER));
  } else {
    groups.sort((a, b) => descending(a.attempts, b.attempts));
  }
  return groups;
}

/**
 * A player's profile vs a baseline (normally the team). `efgDelta` = "better
 * here?"; `shareDelta` = "goes here more often?" - separating shot-making from
 * shot-selection, the distinction a staff acts on.
 */
export interface Delta {
  key: string;
  player: ShotSummary;
  baseline: ShotSummary;
  /** Player eFG% minus baseline eFG%, in percentage points (already x100). */
  efgDelta: number;
  /** Player attempt share minus baseline attempt share, in percentage points. */
  shareDelta: number;
  playerShare: number;
  baselineShare: number;
}

export function compareToBaseline<K extends string>(
  playerGroups: readonly Group<K>[],
  baselineGroups: readonly Group<K>[],
  order: readonly K[],
): Delta[] {
  const byKey = <T extends { key: K }>(groups: readonly T[]) => new Map(groups.map((g) => [g.key, g]));
  const p = byKey(playerGroups);
  const b = byKey(baselineGroups);

  return order.map((key) => {
    const pg = p.get(key);
    const bg = b.get(key);
    const player = pg ?? { ...EMPTY_SUMMARY, share: 0 };
    const baseline = bg ?? { ...EMPTY_SUMMARY, share: 0 };
    return {
      key,
      player,
      baseline,
      efgDelta: (player.efg - baseline.efg) * 100,
      shareDelta: (player.share - baseline.share) * 100,
      playerShare: player.share,
      baselineShare: baseline.share,
    };
  });
}

/**
 * Points above/below what these shots would score at baseline rates. Sums
 * per-zone (playerPPS − basePPS) × attempts - turns scattered % edges into one
 * number in points, the unit roster decisions are argued in.
 */
export function pointsAddedVsBaseline<K extends string>(
  playerGroups: readonly Group<K>[],
  baselineGroups: readonly Group<K>[],
): number {
  const baseline = new Map(baselineGroups.map((g) => [g.key, g.pps]));
  return sum(playerGroups, (g) => {
    const basePps = baseline.get(g.key);
    return basePps === undefined ? 0 : (g.pps - basePps) * g.attempts;
  });
}
