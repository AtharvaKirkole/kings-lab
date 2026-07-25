/**
 * SVG paths for the 11 shot zones, in court-feet, tiling the offensive half
 * exactly once. Derived from the same `lib/court.mjs` constants that classify
 * shots, so the region you click is exactly the set of shots it selects.
 */

import {
  CORNER_THREE_Y, FREE_THROW_LINE_X, HALF_LENGTH, HALF_WIDTH,
  HOOP_X, PAINT_HALF_WIDTH, RESTRICTED_AREA_RADIUS, THREE_POINT_ARC_RADIUS,
} from '../../lib/court';

const R = THREE_POINT_ARC_RADIUS;
const BASE = -HALF_LENGTH; // -47, the baseline
const MID = 0; // half-court line

const ARC_AT_22 = HOOP_X + Math.sqrt(R ** 2 - CORNER_THREE_Y ** 2); 
const ARC_AT_8 = HOOP_X + Math.sqrt(R ** 2 - PAINT_HALF_WIDTH ** 2); 

export interface ZoneShape {
  zone: string;
  d: string;
  label: { x: number; y: number };
  fillRule?: 'evenodd';
}

export const ZONE_SHAPES: ZoneShape[] = [
  {
    zone: 'Restricted Area',
    // A full circle: within 4 ft of the rim in any direction.
    d: `M ${HOOP_X - RESTRICTED_AREA_RADIUS},0
        a ${RESTRICTED_AREA_RADIUS} ${RESTRICTED_AREA_RADIUS} 0 1 0 ${RESTRICTED_AREA_RADIUS * 2},0
        a ${RESTRICTED_AREA_RADIUS} ${RESTRICTED_AREA_RADIUS} 0 1 0 ${-RESTRICTED_AREA_RADIUS * 2},0 Z`,
    label: { x: HOOP_X, y: 0 },
  },
  {
    zone: 'Paint (Non-RA)',
    // The lane with the restricted-area circle punched out.
    d: `M ${BASE},${-PAINT_HALF_WIDTH}
        L ${FREE_THROW_LINE_X},${-PAINT_HALF_WIDTH}
        L ${FREE_THROW_LINE_X},${PAINT_HALF_WIDTH}
        L ${BASE},${PAINT_HALF_WIDTH} Z
        M ${HOOP_X - RESTRICTED_AREA_RADIUS},0
        a ${RESTRICTED_AREA_RADIUS} ${RESTRICTED_AREA_RADIUS} 0 1 0 ${RESTRICTED_AREA_RADIUS * 2},0
        a ${RESTRICTED_AREA_RADIUS} ${RESTRICTED_AREA_RADIUS} 0 1 0 ${-RESTRICTED_AREA_RADIUS * 2},0 Z`,
    fillRule: 'evenodd',
    label: { x: -34.5, y: 0 },
  },
  {
    zone: 'Mid-Range Left',
    d: `M ${BASE},${-CORNER_THREE_Y}
        L ${ARC_AT_22},${-CORNER_THREE_Y}
        A ${R} ${R} 0 0 1 ${ARC_AT_8},${-PAINT_HALF_WIDTH}
        L ${BASE},${-PAINT_HALF_WIDTH} Z`,
    label: { x: -37, y: -14.5 },
  },
  {
    zone: 'Mid-Range Center',
    d: `M ${FREE_THROW_LINE_X},${-PAINT_HALF_WIDTH}
        L ${ARC_AT_8},${-PAINT_HALF_WIDTH}
        A ${R} ${R} 0 0 1 ${ARC_AT_8},${PAINT_HALF_WIDTH}
        L ${FREE_THROW_LINE_X},${PAINT_HALF_WIDTH} Z`,
    label: { x: -23.4, y: 0 },
  },
  {
    zone: 'Mid-Range Right',
    d: `M ${BASE},${CORNER_THREE_Y}
        L ${ARC_AT_22},${CORNER_THREE_Y}
        A ${R} ${R} 0 0 0 ${ARC_AT_8},${PAINT_HALF_WIDTH}
        L ${BASE},${PAINT_HALF_WIDTH} Z`,
    label: { x: -37, y: 14.5 },
  },
  {
    zone: 'Corner 3 Left',
    d: `M ${BASE},${-HALF_WIDTH} L ${MID},${-HALF_WIDTH} L ${MID},${-CORNER_THREE_Y} L ${BASE},${-CORNER_THREE_Y} Z`,
    label: { x: -40, y: -23.5 },
  },
  {
    zone: 'Wing 3 Left',
    d: `M ${ARC_AT_8},${-PAINT_HALF_WIDTH}
        L ${MID},${-PAINT_HALF_WIDTH}
        L ${MID},${-CORNER_THREE_Y}
        L ${ARC_AT_22},${-CORNER_THREE_Y}
        A ${R} ${R} 0 0 1 ${ARC_AT_8},${-PAINT_HALF_WIDTH} Z`,
    label: { x: -21, y: -16 },
  },
  {
    zone: 'Above the Break 3',
    d: `M ${ARC_AT_8},${-PAINT_HALF_WIDTH}
        L ${MID},${-PAINT_HALF_WIDTH}
        L ${MID},${PAINT_HALF_WIDTH}
        L ${ARC_AT_8},${PAINT_HALF_WIDTH}
        A ${R} ${R} 0 0 0 ${ARC_AT_8},${-PAINT_HALF_WIDTH} Z`,
    label: { x: -12, y: 0 },
  },
  {
    zone: 'Wing 3 Right',
    d: `M ${ARC_AT_8},${PAINT_HALF_WIDTH}
        L ${MID},${PAINT_HALF_WIDTH}
        L ${MID},${CORNER_THREE_Y}
        L ${ARC_AT_22},${CORNER_THREE_Y}
        A ${R} ${R} 0 0 0 ${ARC_AT_8},${PAINT_HALF_WIDTH} Z`,
    label: { x: -21, y: 16 },
  },
  {
    zone: 'Corner 3 Right',
    d: `M ${BASE},${HALF_WIDTH} L ${MID},${HALF_WIDTH} L ${MID},${CORNER_THREE_Y} L ${BASE},${CORNER_THREE_Y} Z`,
    label: { x: -40, y: 23.5 },
  },
];
