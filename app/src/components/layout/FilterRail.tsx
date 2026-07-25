/**
 * Filters: every constraint in one place, shared by all three views (a slice
 * survives switching views). Each group shows live attempt counts from the
 * current selection, so dead ends are visible before you click.
 */

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';

import type { Dataset, Shot } from '../../data/types';
import { humanise, periodLabel, shortDate } from '../../lib/format';
import { countActiveFilters, useFilterStore, type MultiFilterKey } from '../../state/useFilters';
import { useResizable } from '../../state/useResizable';
import { Button, Chip, TriState } from '../ui/Controls';
import styles from './FilterRail.module.css';

const RAIL_MIN = 248;
const RAIL_MAX = 460;
const RAIL_DEFAULT = 292;

/** Docked (wide) vs overlay drawer. */
function useIsDocked(): boolean {
  const [docked, setDocked] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1025px)').matches,
  );
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1025px)');
    const onChange = (e: MediaQueryListEvent) => setDocked(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return docked;
}

interface FilterRailProps {
  dataset: Dataset;
  shots: readonly Shot[];
  open: boolean;
  onClose: () => void;
}

/** One collapsible group of chips. */
function ChipGroup({
  title,
  options,
  selected,
  counts,
  onToggle,
  onClear,
  format = humanise,
}: {
  title: string;
  options: readonly string[];
  selected: readonly string[];
  counts: Map<string, number>;
  onToggle: (value: string) => void;
  onClear: () => void;
  format?: (value: string) => string;
}) {
  if (options.length === 0) return null;

  return (
    <fieldset className={styles.group}>
      <legend className={styles.groupHeader}>
        <span className={styles.groupTitle}>{title}</span>
        {selected.length > 0 && (
          <button type="button" className={styles.clearLink} onClick={onClear}>
            clear
          </button>
        )}
      </legend>
      <div className={styles.chips}>
        {options.map((option) => (
          <Chip
            key={option}
            active={selected.includes(option)}
            onClick={() => onToggle(option)}
            count={counts.get(option) ?? 0}
            title={`${format(option)}: ${counts.get(option) ?? 0} shots`}
          >
            {format(option)}
          </Chip>
        ))}
      </div>
    </fieldset>
  );
}

export function FilterRail({ dataset, shots, open, onClose }: FilterRailProps) {
  const filters = useFilterStore();
  const activeCount = countActiveFilters(filters);

  const counts = useMemo(() => {
    const make = () => new Map<string, number>();
    const tally = { player: make(), shotType: make(), complex: make(), contest: make(), clock: make(), range: make(), dribble: make(), period: make() };

    const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

    for (const s of shots) {
      bump(tally.player, s.playerId);
      bump(tally.shotType, s.shotType);
      bump(tally.complex, s.complexShotType);
      bump(tally.contest, s.contestLevel);
      bump(tally.clock, s.clockBucket);
      bump(tally.range, s.rangeBand);
      bump(tally.dribble, s.dribbleBucket);
      bump(tally.period, String(s.period));
    }
    return tally;
  }, [shots]);

  const toggle = (key: MultiFilterKey) => (value: string) => filters.toggle(key, value);
  const clear = (key: MultiFilterKey) => () => filters.clear(key);

  const playerCounts = counts.player;

  const docked = useIsDocked();
  const resize = useResizable({
    storageKey: 'kings-shot-lab:rail-width',
    defaultWidth: RAIL_DEFAULT,
    min: RAIL_MIN,
    max: RAIL_MAX,
  });

  return (
    <aside
      className={clsx(styles.rail, open && styles.railOpen, resize.isResizing && styles.resizing)}
      aria-label="Filters"
      style={docked ? { width: resize.width } : undefined}
    >
      <div className={styles.railHeader}>
        <div>
          <h2 className={styles.railTitle}>Filters</h2>
          <p className={styles.railSubtitle}>
            {activeCount === 0 ? 'Showing every shot' : `${activeCount} active`}
          </p>
        </div>
        <div className={styles.railActions}>
          <Button onClick={filters.reset} disabled={activeCount === 0}>Reset</Button>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close filters">×</button>
        </div>
      </div>

      <div className={styles.railBody}>
        <fieldset className={styles.group}>
          <legend className={styles.groupHeader}>
            <span className={styles.groupTitle}>Players</span>
            {filters.players.length > 0 && (
              <button type="button" className={styles.clearLink} onClick={clear('players')}>clear</button>
            )}
          </legend>
          <div className={styles.chips}>
            {dataset.players.map((player) => (
              <Chip
                key={player.id}
                active={filters.players.includes(player.id)}
                onClick={() => filters.toggle('players', player.id)}
                count={playerCounts.get(player.id) ?? 0}
                title={`${player.name}: ${player.attempts} shots, ${player.games} games`}
              >
                {player.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <ChipGroup
          title="Defence"
          options={dataset.options.contestLevels}
          selected={filters.contestLevels}
          counts={counts.contest}
          onToggle={toggle('contestLevels')}
          onClear={clear('contestLevels')}
        />

        <ChipGroup
          title="Shot type"
          options={dataset.options.shotTypes}
          selected={filters.shotTypes}
          counts={counts.shotType}
          onToggle={toggle('shotTypes')}
          onClear={clear('shotTypes')}
        />

        <ChipGroup
          title="Distance"
          options={dataset.options.rangeBands}
          selected={filters.rangeBands}
          counts={counts.range}
          onToggle={toggle('rangeBands')}
          onClear={clear('rangeBands')}
          format={(v) => v}
        />

        <ChipGroup
          title="Shot clock"
          options={dataset.options.clockBuckets}
          selected={filters.clockBuckets}
          counts={counts.clock}
          onToggle={toggle('clockBuckets')}
          onClear={clear('clockBuckets')}
          format={(v) => v}
        />

        <ChipGroup
          title="Dribbles before"
          options={dataset.options.dribbleBuckets}
          selected={filters.dribbleBuckets}
          counts={counts.dribble}
          onToggle={toggle('dribbleBuckets')}
          onClear={clear('dribbleBuckets')}
          format={(v) => v}
        />

        <ChipGroup
          title="Period"
          options={dataset.options.periods.map(String)}
          selected={filters.periods}
          counts={counts.period}
          onToggle={toggle('periods')}
          onClear={clear('periods')}
          format={(v) => periodLabel(Number(v))}
        />

        <ChipGroup
          title="Play type"
          options={dataset.options.complexShotTypes}
          selected={filters.complexShotTypes}
          counts={counts.complex}
          onToggle={toggle('complexShotTypes')}
          onClear={clear('complexShotTypes')}
        />

        <div className={styles.group}>
          <TriState
            label="Catch and shoot"
            value={filters.catchAndShoot}
            onChange={(v) => filters.setTristate('catchAndShoot', v)}
            onLabel="C&S only"
            offLabel="Off dribble"
          />
        </div>

        <div className={styles.group}>
          <TriState
            label="Assisted"
            value={filters.astOpp}
            onChange={(v) => filters.setTristate('astOpp', v)}
            onLabel="Assisted"
            offLabel="Non-assisted"
            reverseStates
          />
        </div>

        <fieldset className={styles.group}>
          <legend className={styles.groupHeader}>
            <span className={styles.groupTitle}>Game window</span>
            {(filters.dateFrom || filters.dateTo) && (
              <button type="button" className={styles.clearLink} onClick={() => filters.setDateRange(null, null)}>
                clear
              </button>
            )}
          </legend>
          <div className={styles.dateRow}>
            <label className={styles.dateField}>
              <span>From</span>
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                min={dataset.meta.seasonStart}
                max={filters.dateTo ?? dataset.meta.seasonEnd}
                onChange={(e) => filters.setDateRange(e.target.value || null, filters.dateTo)}
              />
            </label>
            <label className={styles.dateField}>
              <span>To</span>
              <input
                type="date"
                value={filters.dateTo ?? ''}
                min={filters.dateFrom ?? dataset.meta.seasonStart}
                max={dataset.meta.seasonEnd}
                onChange={(e) => filters.setDateRange(filters.dateFrom, e.target.value || null)}
              />
            </label>
          </div>
          <p className={styles.hint}>
            Season runs {shortDate(dataset.meta.seasonStart)} – {shortDate(dataset.meta.seasonEnd)}
          </p>
        </fieldset>

        <div className={styles.group}>
          <Chip active={filters.clutchOnly} onClick={() => filters.setClutchOnly(!filters.clutchOnly)}>
            Clutch only (last 5 min of Q4 / OT)
          </Chip>
        </div>
      </div>

      {/* Drag-to-resize handle. A focusable separator so it also responds to arrow keys; double-click restores the default. */}
      {docked && (
        <div
          className={styles.resizer}
          {...resize.handleProps}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize filters panel"
          aria-valuenow={Math.round(resize.width)}
          aria-valuemin={RAIL_MIN}
          aria-valuemax={RAIL_MAX}
          tabIndex={0}
          title="Drag to resize, double-click to reset"
        >
          <span className={styles.resizerGrip} aria-hidden="true" />
        </div>
      )}
    </aside>
  );
}
