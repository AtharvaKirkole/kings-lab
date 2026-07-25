/**
 * Hex layer: the classic NBA chart. Size = attempts (area-proportional, sqrt) colour = eFG% vs baseline (diverging). 
 */

import { memo, useMemo } from 'react';
import { hexbin as createHexbin } from 'd3-hexbin';

import type { Shot } from '../../data/types';
import { efficiencyColor } from '../../lib/colorScale';
import { pct, signed } from '../../lib/format';
import { summarise, type ShotSummary } from '../../lib/metrics';
import { TooltipCard, TooltipRow, TooltipTitle, type HoverTooltip } from '../ui/Tooltip';
import styles from './HexLayer.module.css';

const HEX_RADIUS = 1.6;
const MIN_BIN_ATTEMPTS = 3;
const MIN_SCALE = 0.34;

export interface HexDatum {
  x: number;
  y: number;
  summary: ShotSummary;
  efgDelta: number;
  fill: string;
  scale: number;
}

interface HexLayerProps {
  shots: readonly Shot[];
  baselineEfg: number;
  tooltip: HoverTooltip<HexDatum>;
}

const hexGenerator = createHexbin<Shot>()
  .radius(HEX_RADIUS)
  .x((s) => s.x)
  .y((s) => s.y);

export function useHexData(shots: readonly Shot[], baselineEfg: number): HexDatum[] {
  return useMemo(() => {
    const bins = hexGenerator(shots as Shot[]).filter((b) => b.length >= MIN_BIN_ATTEMPTS);
    const maxAttempts = Math.max(1, ...bins.map((b) => b.length));

    return bins.map((bin) => {
      const summary = summarise(bin);
      const efgDelta = (summary.efg - baselineEfg) * 100;
      return {
        x: bin.x,
        y: bin.y,
        summary,
        efgDelta,
        fill: efficiencyColor(efgDelta),
        scale: MIN_SCALE + (1 - MIN_SCALE) * Math.sqrt(summary.attempts / maxAttempts),
      };
    });
  }, [shots, baselineEfg]);
}

function HexLayerBase({ shots, baselineEfg, tooltip }: HexLayerProps) {
  const data = useHexData(shots, baselineEfg);
  const path = useMemo(() => hexGenerator.hexagon(), []);

  return (
    <g className={styles.layer}>
      {data.map((d) => (
        <path
          key={`${d.x},${d.y}`}
          d={path}
          transform={`translate(${d.x},${d.y}) scale(${d.scale.toFixed(3)})`}
          fill={d.fill}
          className={styles.hex}
          onPointerMove={(e) => tooltip.show(d, e)}
          onPointerLeave={tooltip.hide}
        />
      ))}
    </g>
  );
}

export const HexLayer = memo(HexLayerBase);

export function HexTooltip({ datum, x, y }: { datum: HexDatum; x: number; y: number }) {
  return (
    <TooltipCard x={x} y={y}>
      <TooltipTitle swatch={datum.fill}>
        {datum.summary.attempts} shots from here
      </TooltipTitle>
      <TooltipRow label="FG%" value={pct(datum.summary.fg)} />
      <TooltipRow label="eFG%" value={pct(datum.summary.efg)} accent />
      <TooltipRow label="vs baseline" value={`${signed(datum.efgDelta)} pts`} />
      <TooltipRow label="Points/shot" value={datum.summary.pps.toFixed(2)} />
    </TooltipCard>
  );
}
