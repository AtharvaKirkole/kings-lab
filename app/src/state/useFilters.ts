/**
 * Filter state. One Zustand store; components subscribe to just their slice, so
 * moving a control doesn't re-render the court's thousands of marks (Context
 * would). Holds *criteria only* - derived shots live in `useFilteredShots`, so
 * there's one copy of the truth and nothing goes stale.
 */

import { create } from 'zustand';

import { readFiltersFromUrl } from './urlState';

/** Fields that hold a set of selected values. */
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
  /** `null` = no constraint, `true` = catch-and-shoot only, `false` = off-the-dribble only. */
  catchAndShoot: boolean | null;
  /**
   * Assist-opportunity filter (`ast_opp`: ≤1 dribble, held <2.5s) - NOT the
   * `assisted` flag, which is true only on makes and would force FG% to 100%.
   * `ast_opp` describes the look and covers makes and misses alike.
   */
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
  /** Add or remove one value from a multi-select field. */
  toggle: (key: MultiFilterKey, value: string) => void;
  /** Replace a multi-select field wholesale. */
  setMany: (key: MultiFilterKey, values: string[]) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setTristate: (key: 'catchAndShoot' | 'astOpp', value: boolean | null) => void;
  setClutchOnly: (value: boolean) => void;
  /** Clear one field, or every field when called with no argument. */
  clear: (key?: MultiFilterKey) => void;
  reset: () => void;
}

export const useFilterStore = create<FilterStore>((set) => ({
  // Defaults first, then anything the URL carried in, so a shared link opens
  // on the same slice the sender was looking at.
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

/** Number of active constraints -- drives the "clear filters" affordance. */
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
