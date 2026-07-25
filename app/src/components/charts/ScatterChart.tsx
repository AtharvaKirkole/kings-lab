/**
 * Volume vs efficiency scatter, the key roster frame: high-volume/low-efficiency
 *    marks are shots to redistribute, the opposite are looks to manufacture more of.
 * Quadrant guides sit at the team means relative to this team, not a league
 */

import { useMemo } from 'react';
import { extent, max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import clsx from 'clsx';

import { radiusForVolume } from '../../lib/colorScale';
import styles from './ScatterChart.module.css';

export interface ScatterDatum {
  key: string;
  label: string;
  x: number;
  y: number;
  weight: number;
  lowSample?: boolean;
}

interface ScatterChartProps {
  data: readonly ScatterDatum[];
  xLabel: string;
  yLabel: string;
  xReference: number;
  yReference: number;
  formatX: (value: number) => string;
  formatY: (value: number) => string;
  onSelect?: (key: string) => void;
  selected?: readonly string[];
  quadrantLabels?: [string, string, string, string];
}

/** Inner plot box in viewBox units; margins leave room for axis labels. */
const WIDTH = 560;
const HEIGHT = 380;
const MARGIN = { top: 26, right: 26, bottom: 46, left: 58 };

export function ScatterChart({
  data,
  xLabel,
  yLabel,
  xReference,
  yReference,
  formatX,
  formatY,
  onSelect,
  selected = [],
  quadrantLabels,
}: ScatterChartProps) {
  const layout = useMemo(() => {
    if (data.length === 0) return null;

    const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
    const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;

    const axis = (values: number[], range: [number, number]) => {
      const [lowest = 0, highest = 1] = extent(values) as [number, number];
      const padding = (highest - lowest) * 0.12 || 1;
      const allPositive = values.every((value) => value >= 0);
      const start = lowest - padding;
      return scaleLinear()
        .domain([allPositive ? Math.max(0, start) : start, highest + padding])
        .range(range)
        .nice();
    };

    const xScale = axis(data.map((datum) => datum.x).concat(xReference), [MARGIN.left, MARGIN.left + plotWidth]);
    const yScale = axis(data.map((datum) => datum.y).concat(yReference), [MARGIN.top + plotHeight, MARGIN.top]);

    return {
      xScale,
      yScale,
      xTicks: xScale.ticks(3),
      yTicks: yScale.ticks(3),
      maxWeight: max(data, (datum) => datum.weight) || 1,
      plotWidth,
      plotHeight,
    };
  }, [data, xReference, yReference]);

  if (!layout) return <p className={styles.empty}>No data in this selection.</p>;

  const { xScale, yScale, xTicks, yTicks, maxWeight, plotWidth, plotHeight } = layout;
  const refX = xScale(xReference);
  const refY = yScale(yReference);

  return (
    <svg className={styles.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${yLabel} against ${xLabel}`}>
      {/* Quadrant wash: recessive, purely orienting. */}
      <rect x={MARGIN.left} y={MARGIN.top} width={plotWidth} height={plotHeight} className={styles.plotArea} />

      <g className={styles.grid}>
        {xTicks.map((tick) => <line key={`gx${tick}`} x1={xScale(tick)} y1={MARGIN.top} x2={xScale(tick)} y2={MARGIN.top + plotHeight} />)}
        {yTicks.map((tick) => <line key={`gy${tick}`} x1={MARGIN.left} y1={yScale(tick)} x2={MARGIN.left + plotWidth} y2={yScale(tick)} />)}
      </g>

      {/* Reference crosshair at the team means. */}
      <g className={styles.reference}>
        <line x1={refX} y1={MARGIN.top} x2={refX} y2={MARGIN.top + plotHeight} />
        <line x1={MARGIN.left} y1={refY} x2={MARGIN.left + plotWidth} y2={refY} />
      </g>

      {quadrantLabels && (
        <g className={styles.quadrant} aria-hidden="true">
          <text x={MARGIN.left + 8} y={MARGIN.top + 15} textAnchor="start">{quadrantLabels[0]}</text>
          <text x={MARGIN.left + plotWidth - 8} y={MARGIN.top + 15} textAnchor="end">{quadrantLabels[1]}</text>
          <text x={MARGIN.left + plotWidth - 8} y={MARGIN.top + plotHeight - 8} textAnchor="end">{quadrantLabels[2]}</text>
          <text x={MARGIN.left + 8} y={MARGIN.top + plotHeight - 8} textAnchor="start">{quadrantLabels[3]}</text>
        </g>
      )}

      <g className={styles.axis}>
        {xTicks.map((tick) => (
          <text key={`tx${tick}`} x={xScale(tick)} y={MARGIN.top + plotHeight + 18} textAnchor="middle">{formatX(tick)}</text>
        ))}
        {yTicks.map((tick) => (
          <text key={`ty${tick}`} x={MARGIN.left - 10} y={yScale(tick) + 4} textAnchor="end">{formatY(tick)}</text>
        ))}
        <text x={MARGIN.left + plotWidth / 2} y={HEIGHT - 8} textAnchor="middle" className={styles.axisTitle}>{xLabel}</text>
        <text
          x={-(MARGIN.top + plotHeight / 2)}
          y={14}
          transform="rotate(-90)"
          textAnchor="middle"
          className={styles.axisTitle}
        >
          {yLabel}
        </text>
      </g>

      <g>
        {data.map((datum) => {
          const isSelected = selected.includes(datum.key);
          const radius = radiusForVolume(datum.weight, maxWeight, 15, 5);
          return (
            <g
              key={datum.key}
              className={clsx(styles.mark, isSelected && styles.markSelected)}
              onClick={() => onSelect?.(datum.key)}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              aria-label={`${datum.label}: ${formatX(datum.x)}, ${formatY(datum.y)}`}
              onKeyDown={(e) => {
                if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onSelect(datum.key);
                }
              }}
            >
              <circle cx={xScale(datum.x)} cy={yScale(datum.y)} r={radius} className={styles.bubble} />
              {/* Direct labels: with 12 entities a legend would be a lookup table. */}
              <text x={xScale(datum.x)} y={yScale(datum.y) - radius - 5} textAnchor="middle" className={styles.markLabel}>
                {datum.label}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
