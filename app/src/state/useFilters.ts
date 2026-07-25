/**
 * Filter state. One Zustand store; components subscribe to just their slice, so
 * moving a control doesn't re-render the court's thousands of marks
 */

import { create } from 'zustand';

import { readFiltersFromUrl } from './urlState';

export type MultiFilterKey =
  | 'players' | 'zones' | 'shotTypes' | 'complexShotTypes'
  | 'contestLevels' | 'clockBuckets' | 'rangeBands' | 'dribbleBuckets' | 'periods';

export interface FilterCriteria {
  players: string[];
  zones: string[];
  shotTypes: string[];
  complexShotTypes: string[];
  contestLevels: string[];
  clockBuckets: string[];
  rangeBands: string[];
  dribbleBuckets: string[];
  periods: string[];
  dateFrom: string | null;
  dateTo: string | null;
  catchAndShoot: boolean | null;
  astOpp: boolean | null;
  clutchOnly: boolean;
}

export const EMPTY_FILTERS: FilterCriteria = {
  players: [],
  zones: [],
  shotTypes: [],
  complexShotTypes: [],
  contestLevels: [],
  clockBuckets: [],
  rangeBands: [],
  dribbleBuckets: [],
  periods: [],
  dateFrom: null,
  dateTo: null,
  catchAndShoot: null,
  astOpp: null,
  clutchOnly: false,
};

interface FilterStore extends FilterCriteria {
  toggle: (key: MultiFilterKey, value: string) => void;
  setMany: (key: MultiFilterKey, values: string[]) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setTristate: (key: 'catchAndShoot' | 'astOpp', value: boolean | null) => void;
  setClutchOnly: (value: boolean) => void;
  clear: (key?: MultiFilterKey) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({

  ...EMPTY_FILTERS,
  ...readFiltersFromUrl(),

  toggle: (key, value) =>
    set((state) => {
      const current = state[key];
      return {
        [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      } as Pick<FilterStore, MultiFilterKey>;
    }),

  setMany: (key, values) => set({ [key]: values } as Pick<FilterStore, MultiFilterKey>),

  setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),

  setTristate: (key, value) => set({ [key]: value } as Pick<FilterStore, 'catchAndShoot' | 'astOpp'>),

  setClutchOnly: (clutchOnly) => set({ clutchOnly }),

  clear: (key) => set(key ? ({ [key]: [] } as unknown as Partial<FilterCriteria>) : EMPTY_FILTERS),

  reset: () => set(EMPTY_FILTERS),
}));

/** Number of active constraints - drives the "clear filters" affordance. */
export function countActiveFilters(f: FilterCriteria): number {
  let n = 0;
  const multi: MultiFilterKey[] = [
    'players', 'zones', 'shotTypes', 'complexShotTypes',
    'contestLevels', 'clockBuckets', 'rangeBands', 'dribbleBuckets', 'periods',
  ];
  for (const key of multi) n += f[key].length > 0 ? 1 : 0;
  if (f.dateFrom || f.dateTo) n++;
  if (f.catchAndShoot !== null) n++;
  if (f.astOpp !== null) n++;
  if (f.clutchOnly) n++;
  return n;
}
