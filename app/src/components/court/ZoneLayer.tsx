/**
 * Zone layer: the 11 zones filled by performance. Two colour modes:
 * `efficiency` (diverging eFG% vs baseline, the default) and `volume` (ordinal
 * attempt share). Low-sample zones get a hatch instead of colour, so a 4-for-6 never reads as a strength
 */

import { memo, useMemo } from 'react';
import clsx from 'clsx';

import { efficiencyColor, volumeColor } from '../../lib/colorScale';
import { int, pct, signed } from '../../lib/format';
import { groupBy, LOW_SAMPLE_THRESHOLD, summarise, type Group } from '../../lib/metrics';
import type { Shot } from '../../data/types';
import { TooltipCard, TooltipRow, TooltipTitle, type HoverTooltip } from '../ui/Tooltip';
import { ZONE_SHAPES } from './zoneShapes';
import styles from './ZoneLayer.module.css';

export type ZoneColorMode = 'efficiency' | 'volume';

export interface ZoneDatum {
  zone: string;
  group: Group<string> | undefined;
  baselineEfg: number;
  efgDelta: number;
  fill: string;
  lowSample: boolean;
}

interface ZoneLayerProps {
  shots: readonly Shot[];
  /** Shots the zone is measured against; equals `shots` when nothing to compare. */
  baseline: readonly Shot[];
  mode: ZoneColorMode;
  /**
   * True when a player selection is active, so each zone is measured against
   * the ROSTER's rate in that same zone. When false there is no second entity
   * to compare with, and zones are measured against the selection's overall average instead 
   */
  comparing: boolean;
  selected: readonly string[];
  onSelect: (zone: string) => void;
  tooltip: HoverTooltip<ZoneDatum>;
}

/** Builds the per-zone datum the layer renders and the tooltip reads. */
export function useZoneData(
  shots: readonly Shot[],
  baseline: readonly Shot[],
  mode: ZoneColorMode,
  comparing: boolean,
): ZoneDatum[] {
  return useMemo(() => {
    const zones = ZONE_SHAPES.map((s) => s.zone);
    const groups = new Map(groupBy(shots, (s) => s.zone, zones).map((g) => [g.key, g]));
    const baselineGroups = new Map(groupBy(baseline, (s) => s.zone, zones).map((g) => [g.key, g]));
    const maxAttempts = Math.max(1, ...[...groups.values()].map((g) => g.attempts));
    const overallEfg = summarise(baseline).efg;

    return ZONE_SHAPES.map(({ zone }) => {
      const group = groups.get(zone);
      const attempts = group?.attempts ?? 0;
      const lowSample = attempts < LOW_SAMPLE_THRESHOLD;

      const baselineEfg = comparing ? (baselineGroups.get(zone)?.efg ?? overallEfg) : overallEfg;
      const efgDelta = ((group?.efg ?? 0) - baselineEfg) * 100;

      const fill = lowSample
        ? 'var(--eff-neutral)'
        : mode === 'efficiency'
          ? efficiencyColor(efgDelta)
          : volumeColor(attempts, maxAttempts);

      return { zone, group, baselineEfg, efgDelta, fill, lowSample };
    });
  }, [shots, baseline, mode, comparing]);
}

function ZoneLayerBase({ shots, baseline, mode, comparing, selected, onSelect, tooltip }: ZoneLayerProps) {
  const data = useZoneData(shots, baseline, mode, comparing);
  const byZone = useMemo(() => new Map(data.map((d) => [d.zone, d])), [data]);

  return (
    <g>
      <defs>
        {/* Texture for low-sample zones: the non-colour channel. */}
        <pattern id="lowSampleHatch" width={2} height={2} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={2} height={2} fill="var(--eff-neutral)" />
          <line x1={0} y1={0} x2={0} y2={2} stroke="var(--ink-muted)" strokeWidth={0.35} opacity={0.55} />
        </pattern>
      </defs>

      {ZONE_SHAPES.map(({ zone, d, label, fillRule }) => {
        const datum = byZone.get(zone);
        if (!datum) return null;
        const isSelected = selected.includes(zone);
        const attempts = datum.group?.attempts ?? 0;

        return (
          <g
            key={zone}
            className={clsx(styles.zone, isSelected && styles.selected)}
            onPointerMove={(e) => tooltip.show(datum, e)}
            onPointerLeave={tooltip.hide}
            onClick={() => onSelect(zone)}
            role="button"
            tabIndex={0}
            aria-label={`${zone}: ${attempts} attempts, ${pct(datum.group?.efg ?? 0)} eFG`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(zone);
              }
            }}
          >
            <path
              d={d}
              fillRule={fillRule}
              fill={datum.lowSample && attempts > 0 ? 'url(#lowSampleHatch)' : datum.fill}
              className={styles.shape}
              // A 2px surface gap between adjacent fills, per the mark spec.
              stroke="var(--surface)"
              strokeWidth={0.28}
            />

            {attempts > 0 && (
              <g className={styles.labels} aria-hidden="true">
                {/* eFG% headline + attempt count only. The efficiency delta is
                    already carried by the fill colour and the tooltip, so it is
                    left off the face to keep the tight rim/paint labels from
                    colliding. */}
                <text x={label.x} y={label.y - 0.5} className={styles.primaryLabel}>
                  {pct(datum.group?.efg ?? 0, 0)}
                </text>
                <text x={label.x} y={label.y + 2.1} className={styles.secondaryLabel}>
                  {int(attempts)}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export const ZoneLayer = memo(ZoneLayerBase);

/** Tooltip body for a zone. Exported so the view owns tooltip placement. */
export function ZoneTooltip({ datum, x, y, comparing }: { datum: ZoneDatum; x: number; y: number; comparing: boolean }) {
  const g = datum.group;
  return (
    <TooltipCard x={x} y={y}>
      <TooltipTitle swatch={datum.fill}>{datum.zone}</TooltipTitle>
      {g && g.attempts > 0 ? (
        <>
          <TooltipRow label="Attempts" value={g.attempts} />
          <TooltipRow label="FG%" value={pct(g.fg)} />
          <TooltipRow label="eFG%" value={pct(g.efg)} accent />
          <TooltipRow label="Points/shot" value={g.pps.toFixed(2)} />
          <TooltipRow label="Share of shots" value={pct(g.share)} />
          <TooltipRow
            label={comparing ? 'vs team here' : 'vs selection avg'}
            value={`${signed(datum.efgDelta)} eFG pts`}
          />
          {comparing && <TooltipRow label="Team eFG% here" value={pct(datum.baselineEfg)} />}
          {datum.lowSample && (
            <TooltipRow label="⚠ Sample" value={`under ${LOW_SAMPLE_THRESHOLD}`} />
          )}
        </>
      ) : (
        <TooltipRow label="Attempts" value="0" />
      )}
    </TooltipCard>
  );
}
