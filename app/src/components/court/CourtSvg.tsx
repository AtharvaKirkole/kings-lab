/**
 * The court, drawn in real court-feet. The viewBox IS the dictionary's
 * coordinate system (origin centre, x [-47,47], y [-25,25]), so a shot plots at
 * Dimensions come from `lib/court.mjs`, the same module the ETL classified with
 */

import { memo, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';

import {
  BACKBOARD_X, CORNER_THREE_Y, FREE_THROW_CIRCLE_RADIUS, FREE_THROW_LINE_X,
  HALF_LENGTH, HALF_WIDTH, HOOP_X, HOOP_Y, PAINT_HALF_WIDTH,
  RESTRICTED_AREA_RADIUS, RIM_RADIUS, THREE_POINT_ARC_RADIUS,
} from '../../lib/court';
import styles from './CourtSvg.module.css';

const ARC_CORNER_X = HOOP_X + Math.sqrt(THREE_POINT_ARC_RADIUS ** 2 - CORNER_THREE_Y ** 2);

const PAD = 2.5;

export type CourtView = 'half' | 'full';

interface CourtSvgProps {
  view?: CourtView;
  showGrid?: boolean;
  children?: ReactNode;
  overlay?: ReactNode;
  className?: string;
  label: string;
  svgRef?: Ref<SVGSVGElement>;
}

const BasketEnd = memo(function BasketEnd() {
  return (
    <g>
      {/* Paint / lane */}
      <rect
        x={-HALF_LENGTH}
        y={-PAINT_HALF_WIDTH}
        width={HALF_LENGTH + FREE_THROW_LINE_X}
        height={PAINT_HALF_WIDTH * 2}
        className={styles.paint}
      />

      {/* Free-throw circle: solid away from the basket, dashed toward it. */}
      <path
        d={`M ${FREE_THROW_LINE_X},${-FREE_THROW_CIRCLE_RADIUS}
            A ${FREE_THROW_CIRCLE_RADIUS} ${FREE_THROW_CIRCLE_RADIUS} 0 0 1 ${FREE_THROW_LINE_X},${FREE_THROW_CIRCLE_RADIUS}`}
        className={styles.line}
      />
      <path
        d={`M ${FREE_THROW_LINE_X},${-FREE_THROW_CIRCLE_RADIUS}
            A ${FREE_THROW_CIRCLE_RADIUS} ${FREE_THROW_CIRCLE_RADIUS} 0 0 0 ${FREE_THROW_LINE_X},${FREE_THROW_CIRCLE_RADIUS}`}
        className={styles.lineDashed}
      />

      {/* Three-point line: 22 ft straight corners, then the 23.75 ft arc. */}
      <path
        d={`M ${-HALF_LENGTH},${-CORNER_THREE_Y}
            L ${ARC_CORNER_X},${-CORNER_THREE_Y}
            A ${THREE_POINT_ARC_RADIUS} ${THREE_POINT_ARC_RADIUS} 0 0 1 ${ARC_CORNER_X},${CORNER_THREE_Y}
            L ${-HALF_LENGTH},${CORNER_THREE_Y}`}
        className={styles.line}
      />

      {/* Restricted area */}
      <path
        d={`M ${BACKBOARD_X},${-RESTRICTED_AREA_RADIUS}
            L ${HOOP_X},${-RESTRICTED_AREA_RADIUS}
            A ${RESTRICTED_AREA_RADIUS} ${RESTRICTED_AREA_RADIUS} 0 0 1 ${HOOP_X},${RESTRICTED_AREA_RADIUS}
            L ${BACKBOARD_X},${RESTRICTED_AREA_RADIUS}`}
        className={styles.line}
      />

      {/* Backboard and rim */}
      <line x1={BACKBOARD_X} y1={-3} x2={BACKBOARD_X} y2={3} className={styles.backboard} />
      <line x1={BACKBOARD_X} y1={HOOP_Y} x2={HOOP_X - RIM_RADIUS} y2={HOOP_Y} className={styles.line} />
      <circle cx={HOOP_X} cy={HOOP_Y} r={RIM_RADIUS} className={styles.rim} />
    </g>
  );
});

/** 5 ft reference grid with labelled axes at the origin. */
const Grid = memo(function Grid({ view }: { view: CourtView }) {
  const minX = -HALF_LENGTH;
  const maxX = view === 'full' ? HALF_LENGTH : 0;

  const verticals: number[] = [];
  for (let x = minX; x <= maxX; x += 5) verticals.push(x);

  const horizontals: number[] = [];
  for (let y = -HALF_WIDTH; y <= HALF_WIDTH; y += 5) horizontals.push(y);

  return (
    <g aria-hidden="true">
      <g className={styles.grid}>
        {verticals.map((x) => <line key={`v${x}`} x1={x} y1={-HALF_WIDTH} x2={x} y2={HALF_WIDTH} />)}
        {horizontals.map((y) => <line key={`h${y}`} x1={minX} y1={y} x2={maxX} y2={y} />)}
      </g>

      <g className={styles.axis}>
        <line x1={minX} y1={0} x2={maxX} y2={0} />
        <line x1={0} y1={-HALF_WIDTH} x2={0} y2={HALF_WIDTH} />
      </g>

      <g className={styles.tick}>
        {verticals.filter((x) => x % 10 === 0).map((x) => (
          <text key={`tx${x}`} x={x} y={HALF_WIDTH - 1.2} textAnchor="middle">{x}</text>
        ))}
        {horizontals.filter((y) => y !== 0 && Math.abs(y) % 10 === 0).map((y) => (
          <text key={`ty${y}`} x={minX + 1.2} y={y + 0.9} textAnchor="start">{y}</text>
        ))}
      </g>
    </g>
  );
});

function CourtSvgBase({
  view = 'half',
  showGrid = false,
  children,
  overlay,
  className,
  label,
  svgRef,
}: CourtSvgProps) {
  const minX = -HALF_LENGTH - PAD;
  const width = (view === 'full' ? HALF_LENGTH * 2 : HALF_LENGTH) + PAD * 2;

  return (
    <svg
      ref={svgRef}
      className={clsx(styles.court, className)}
      viewBox={`${minX} ${-HALF_WIDTH - PAD} ${width} ${HALF_WIDTH * 2 + PAD * 2}`}
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        x={-HALF_LENGTH}
        y={-HALF_WIDTH}
        width={view === 'full' ? HALF_LENGTH * 2 : HALF_LENGTH}
        height={HALF_WIDTH * 2}
        className={styles.floor}
      />

      {showGrid && <Grid view={view} />}

      <BasketEnd />
      {view === 'full' && (
        <g transform="scale(-1, 1)">
          <BasketEnd />
        </g>
      )}

      <line x1={0} y1={-HALF_WIDTH} x2={0} y2={HALF_WIDTH} className={styles.line} />
      <circle cx={0} cy={0} r={6} className={styles.line} />
      <circle cx={0} cy={0} r={2} className={styles.line} />

      <rect
        x={-HALF_LENGTH}
        y={-HALF_WIDTH}
        width={view === 'full' ? HALF_LENGTH * 2 : HALF_LENGTH}
        height={HALF_WIDTH * 2}
        className={styles.boundary}
      />

      {children}
      {overlay}
    </svg>
  );
}

export const CourtSvg = memo(CourtSvgBase);
