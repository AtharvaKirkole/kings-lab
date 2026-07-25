/**
 * Filter state <-> query string, so any slice can be shared as a link.
 */

import type { ViewId } from '../components/layout/Header';
import type { FilterCriteria, MultiFilterKey } from './useFilters';

const VIEWS: ViewId[] = ['court', 'efficiency', 'players'];
const DEFAULT_VIEW: ViewId = 'court';

const MULTI_PARAMS: Record<MultiFilterKey, string> = {
  players: 'player',
  zones: 'zone',
  shotTypes: 'shot',
  complexShotTypes: 'play',
  contestLevels: 'contest',
  clockBuckets: 'clock',
  rangeBands: 'range',
  dribbleBuckets: 'dribble',
  periods: 'period',
};

const MULTI_KEYS = Object.keys(MULTI_PARAMS) as MultiFilterKey[];

const readTristate = (raw: string | null): boolean | null =>
  raw === '1' ? true : raw === '0' ? false : null;

export function readFiltersFromUrl(): Partial<FilterCriteria> {
  const params = new URLSearchParams(window.location.search);
  const criteria: Partial<FilterCriteria> = {};

  for (const key of MULTI_KEYS) {
    const raw = params.get(MULTI_PARAMS[key]);
    if (raw) criteria[key] = raw.split(',').filter(Boolean);
  }

  const from = params.get('from');
  const to = params.get('to');
  if (from) criteria.dateFrom = from;
  if (to) criteria.dateTo = to;

  const catchAndShoot = readTristate(params.get('cs'));
  const astOpp = readTristate(params.get('ast'));
  if (catchAndShoot !== null) criteria.catchAndShoot = catchAndShoot;
  if (astOpp !== null) criteria.astOpp = astOpp;
  if (params.get('clutch') === '1') criteria.clutchOnly = true;

  return criteria;
}

export function readViewFromUrl(): ViewId {
  const view = new URLSearchParams(window.location.search).get('view');
  return VIEWS.includes(view as ViewId) ? (view as ViewId) : DEFAULT_VIEW;
}

export function writeUrl(criteria: FilterCriteria, view: ViewId): void {
  const params = new URLSearchParams();

  for (const key of MULTI_KEYS) {
    const values = criteria[key];
    if (values.length > 0) params.set(MULTI_PARAMS[key], values.join(','));
  }

  if (criteria.dateFrom) params.set('from', criteria.dateFrom);
  if (criteria.dateTo) params.set('to', criteria.dateTo);
  if (criteria.catchAndShoot !== null) params.set('cs', criteria.catchAndShoot ? '1' : '0');
  if (criteria.astOpp !== null) params.set('ast', criteria.astOpp ? '1' : '0');
  if (criteria.clutchOnly) params.set('clutch', '1');
  if (view !== DEFAULT_VIEW) params.set('view', view);

  const query = params.toString();
  const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
  if (next !== window.location.pathname + window.location.search) {
    window.history.replaceState(null, '', next);
  }
}
