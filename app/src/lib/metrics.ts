/**
 * Shooting metrics and grouped aggregation.
 */

import { descending, group, sum } from 'd3-array';

import type { Shot } from '../data/types';

/** Below this many attempts a rate is noise; the UI marks it, doesn't hide it. */
export const LOW_SAMPLE_THRESHOLD = 25;

export interface ShotSummary {
  attempts: number;
  makes: number;
  points: number;
  fg: number;
  efg: number;
  pps: number;
  threeAttempts: number;
  threeMakes: number;
  threeRate: number;
  assistedRate: number;
  contestedRate: number;
  foulRate: number;
  blockRate: number;
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
    efg: rate(makes + 0.5 * threeMakes, attempts),
    pps: rate(points, attempts),
    threeAttempts,
    threeMakes,
    threeRate: rate(threeAttempts, attempts),
    assistedRate: rate(assisted, makes),
    contestedRate: rate(contested, attempts),
    foulRate: rate(fouled, attempts),
    blockRate: rate(blocked, attempts),
    lowSample: attempts < LOW_SAMPLE_THRESHOLD,
  };
}

export interface Group<K extends string | number = string> extends ShotSummary {
  key: K;
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
 * A player's profile vs a baseline
 */
export interface Delta {
  key: string;
  player: ShotSummary;
  baseline: ShotSummary;
  efgDelta: number;
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
 * Points above/below what these shots would score at baseline rates. 
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
