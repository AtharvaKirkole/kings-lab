/**
 * Shot layer: one mark per attempt. Made/missed are a good/bad pair, so they
 * wear STATUS tokens and differ in shape too
 */

import { memo, useCallback, useMemo, useRef } from 'react';
import { quadtree } from 'd3-quadtree';

import type { Shot } from '../../data/types';
import { clock, humanise, periodLabel } from '../../lib/format';
import { TooltipCard, TooltipRow, TooltipTitle, type HoverTooltip } from '../ui/Tooltip';
import styles from './ShotLayer.module.css';

const MARK_RADIUS = 0.52;
const HOVER_RADIUS = 2.2;

interface ShotLayerProps {
  shots: readonly Shot[];
  tooltip: HoverTooltip<Shot>;
  toCourt: (event: { clientX: number; clientY: number }) => { x: number; y: number } | null;
}

function ShotLayerBase({ shots, tooltip, toCourt }: ShotLayerProps) {
  // draws misses beneath makes so makes stay legible in dense areas.
  const { made, missed } = useMemo(() => {
    const made: Shot[] = [];
    const missed: Shot[] = [];
    for (const s of shots) (s.made ? made : missed).push(s);
    return { made, missed };
  }, [shots]);

  const index = useMemo(
    () => quadtree<Shot>().x((s) => s.x).y((s) => s.y).addAll(shots as Shot[]),
    [shots],
  );

  const frame = useRef(0);

  const handleMove = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        const point = toCourt(event);
        if (!point) return;

        const nearest = index.find(point.x, point.y, HOVER_RADIUS);

        if (nearest) tooltip.show(nearest, event);
        else tooltip.hide();
      });
    },
    [index, toCourt, tooltip],
  );

  return (
    <g onPointerMove={(e) => handleMove({ clientX: e.clientX, clientY: e.clientY })} onPointerLeave={tooltip.hide}>
      <rect x={-47} y={-25} width={94} height={50} fill="transparent" />

      <g className={styles.missed} aria-hidden="true">
        {missed.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={MARK_RADIUS} />
        ))}
      </g>
      <g className={styles.made} aria-hidden="true">
        {made.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={MARK_RADIUS} />
        ))}
      </g>
    </g>
  );
}

export const ShotLayer = memo(ShotLayerBase);

export function ShotTooltip({ datum, x, y }: { datum: Shot; x: number; y: number }) {
  return (
    <TooltipCard x={x} y={y}>
      <TooltipTitle swatch={datum.made ? 'var(--status-good)' : 'var(--status-critical)'}>
        {datum.playerName} , {datum.made ? 'Made' : 'Missed'} {datum.isThree ? '3' : '2'}
      </TooltipTitle>
      <TooltipRow label="Shot" value={humanise(datum.complexShotType)} />
      <TooltipRow label="Distance" value={`${datum.distance.toFixed(1)} ft`} />
      <TooltipRow label="Zone" value={datum.zone} />
      <TooltipRow label="Defence" value={humanise(datum.contestLevel)} />
      <TooltipRow label="Dribbles" value={datum.dribbles} />
      <TooltipRow label="Shot clock" value={`${datum.shotClock.toFixed(1)}s`} />
      <TooltipRow
        label="Game"
        value={`${datum.gameDate} , ${periodLabel(datum.period)} ${clock(datum.gameClock)}`}
      />
    </TooltipCard>
  );
}
