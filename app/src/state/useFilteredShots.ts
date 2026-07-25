/**
 * Derived selectors: (dataset, criteria) → the shots on screen.
 */

import { useMemo } from 'react';

import type { Dataset, Shot } from '../data/types';
import { useFilterStore, type FilterCriteria } from './useFilters';

export function buildPredicate(f: FilterCriteria): (shot: Shot) => boolean {
  const tests: ((shot: Shot) => boolean)[] = [];

  const addSet = <T extends string | number>(values: readonly T[], get: (s: Shot) => T) => {
    if (values.length === 0) return;
    const set = new Set<T>(values);
    tests.push((s) => set.has(get(s)));
  };

  addSet(f.players, (s) => s.playerId);
  addSet(f.zones, (s) => s.zone);
  addSet(f.shotTypes, (s) => s.shotType);
  addSet(f.complexShotTypes, (s) => s.complexShotType);
  addSet(f.contestLevels, (s) => s.contestLevel);
  addSet(f.clockBuckets, (s) => s.clockBucket);
  addSet(f.rangeBands, (s) => s.rangeBand);
  addSet(f.dribbleBuckets, (s) => s.dribbleBucket);
  addSet(f.periods, (s) => String(s.period));

  if (f.dateFrom) {
    const from = f.dateFrom;
    tests.push((s) => s.gameDate >= from);
  }
  if (f.dateTo) {
    const to = f.dateTo;
    tests.push((s) => s.gameDate <= to);
  }
  if (f.catchAndShoot !== null) {
    const want = f.catchAndShoot;
    tests.push((s) => s.catchAndShoot === want);
  }
  if (f.astOpp !== null) {
    const want = f.astOpp;
    tests.push((s) => s.astOpp === want);
  }
  if (f.clutchOnly) tests.push((s) => s.isClutch);

  if (tests.length === 0) return () => true;
  return (shot) => tests.every((test) => test(shot));
}

export interface FilteredResult {
  shots: Shot[];
  teamBaseline: Shot[];
  totalShots: number;
}

export function useFilteredShots(dataset: Dataset): FilteredResult {
  const filters = useFilterStore();

  return useMemo(() => {
    const criteria: FilterCriteria = {
      players: filters.players,
      zones: filters.zones,
      shotTypes: filters.shotTypes,
      complexShotTypes: filters.complexShotTypes,
      contestLevels: filters.contestLevels,
      clockBuckets: filters.clockBuckets,
      rangeBands: filters.rangeBands,
      dribbleBuckets: filters.dribbleBuckets,
      periods: filters.periods,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      catchAndShoot: filters.catchAndShoot,
      astOpp: filters.astOpp,
      clutchOnly: filters.clutchOnly,
    };

    const matches = buildPredicate(criteria);
    const shots = dataset.shots.filter(matches);

    const baselineMatches = criteria.players.length
      ? buildPredicate({ ...criteria, players: [] })
      : null;
    const teamBaseline = baselineMatches ? dataset.shots.filter(baselineMatches) : shots;

    return { shots, teamBaseline, totalShots: dataset.shots.length };
  }, [
    dataset,
    filters.players, filters.zones, filters.shotTypes, filters.complexShotTypes,
    filters.contestLevels, filters.clockBuckets, filters.rangeBands,
    filters.dribbleBuckets, filters.periods, filters.dateFrom, filters.dateTo,
    filters.catchAndShoot, filters.astOpp, filters.clutchOnly,
  ]);
}
