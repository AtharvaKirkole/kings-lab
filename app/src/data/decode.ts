/**
 * Decodes the columnar wire format into plain `Shot` row objects. 
 *
 * NOTE: The project description states the dataset is clean and asks for a
 * simple solution, so this does NO payload validation 
 */

import { CLOCK_ORDER, CONTEST_ORDER, DRIBBLE_ORDER, RANGE_ORDER, SHOT_TYPE_ORDER, ZONE_ORDER } from '../lib/court';
import type { Dataset, EncodedDataset, Shot } from './types';

function ordered(values: string[], canonical: readonly string[]): string[] {
  const known = canonical.filter((v) => values.includes(v));
  const extra = values.filter((v) => !canonical.includes(v)).sort();
  return [...known, ...extra];
}

export function decodeDataset(raw: unknown): Dataset {
  const { columns: c, dictionaries: dict, players, meta } = raw as EncodedDataset;
  const playerById = new Map(players.map((p) => [p.code, p]));
  const n = c.player.length;

  const shots: Shot[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const player = playerById.get(c.player[i]!)!;
    const passDistance = c.passDistance[i]!;

    shots[i] = {
      playerCode: c.player[i]!,
      playerId: player.id,
      playerName: player.name,

      gameDate: dict.gameDate[c.gameDate[i]!]!,
      period: c.period[i]!,
      gameClock: c.gameClock[i]!,
      shotClock: c.shotClock[i]!,

      x: c.x[i]!,
      y: c.y[i]!,
      distance: c.distance[i]!,
      zone: dict.zone[c.zone[i]!]!,
      rangeBand: dict.rangeBand[c.rangeBand[i]!]!,
      isThree: c.isThree[i] === 1,

      made: c.made[i] === 1,
      points: c.points[i]!,
      blocked: c.blocked[i] === 1,
      fouled: c.fouled[i] === 1,

      assisted: c.assisted[i] === 1,
      astOpp: c.astOpp[i] === 1,
      catchAndShoot: c.catchAndShoot[i] === 1,
      dribbles: c.dribbles[i]!,
      dribbleBucket: dict.dribbleBucket[c.dribbleBucket[i]!]!,
      passDistance: passDistance < 0 ? null : passDistance,

      contested: c.contested[i] === 1,
      contestLevel: dict.contestLevel[c.contestLevel[i]!]!,
      shotType: dict.shotType[c.shotType[i]!]!,
      complexShotType: dict.complexShotType[c.complexShotType[i]!]!,
      clockBucket: dict.clockBucket[c.clockBucket[i]!]!,
      isClutch: c.isClutch[i] === 1,
    };
  }

  return {
    meta,
    players,
    shots,
    options: {
      shotTypes: ordered(dict.shotType, SHOT_TYPE_ORDER),
      complexShotTypes: rankByFrequency(shots, (s) => s.complexShotType),
      contestLevels: ordered(dict.contestLevel, CONTEST_ORDER),
      zones: ordered(dict.zone, ZONE_ORDER),
      rangeBands: ordered(dict.rangeBand, RANGE_ORDER),
      clockBuckets: ordered(dict.clockBucket, CLOCK_ORDER),
      dribbleBuckets: ordered(dict.dribbleBucket, DRIBBLE_ORDER),
      gameDates: [...dict.gameDate].sort(),
      periods: [...new Set(shots.map((s) => s.period))].sort((a, b) => a - b),
    },
  };
}

function rankByFrequency(shots: Shot[], key: (s: Shot) => string): string[] {
  const counts = new Map<string, number>();
  for (const s of shots) counts.set(key(s), (counts.get(key(s)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([v]) => v);
}
