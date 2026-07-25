/**
 * Typed surface over the shared court geometry. The impl lives in `court.mjs`
 */

import * as geom from './court.mjs';

export const COURT_LENGTH: number = geom.COURT_LENGTH;
export const COURT_WIDTH: number = geom.COURT_WIDTH;
export const HALF_LENGTH: number = geom.HALF_LENGTH;
export const HALF_WIDTH: number = geom.HALF_WIDTH;

export const HOOP_X: number = geom.HOOP_X;
export const HOOP_Y: number = geom.HOOP_Y;

export const RESTRICTED_AREA_RADIUS: number = geom.RESTRICTED_AREA_RADIUS;
export const THREE_POINT_ARC_RADIUS: number = geom.THREE_POINT_ARC_RADIUS;
export const CORNER_THREE_DISTANCE: number = geom.CORNER_THREE_DISTANCE;
export const CORNER_THREE_Y: number = geom.CORNER_THREE_Y;

export const PAINT_HALF_WIDTH: number = geom.PAINT_HALF_WIDTH;
export const FREE_THROW_LINE_X: number = geom.FREE_THROW_LINE_X;
export const FREE_THROW_CIRCLE_RADIUS: number = geom.FREE_THROW_CIRCLE_RADIUS;
export const BACKBOARD_X: number = geom.BACKBOARD_X;
export const RIM_RADIUS: number = geom.RIM_RADIUS;

export const distanceFromHoop: (x: number, y: number) => number = geom.distanceFromHoop;
export const isThree: (x: number, y: number) => boolean = geom.isThree;
export const shotValue: (x: number, y: number) => 2 | 3 = geom.shotValue;
export const isBackcourt: (x: number) => boolean = geom.isBackcourt;
export const inPaint: (x: number, y: number) => boolean = geom.inPaint;
export const side: (y: number) => string = geom.side;
export const zone: (x: number, y: number) => string = geom.zone;
export const rangeBand: (x: number, y: number) => string = geom.rangeBand;
export const shotClockBucket: (seconds: number) => string = geom.shotClockBucket;
export const dribbleBucket: (dribbles: number) => string = geom.dribbleBucket;

export const ZONE_ORDER: readonly string[] = geom.ZONE_ORDER;
export const RANGE_ORDER: readonly string[] = geom.RANGE_ORDER;
export const CLOCK_ORDER: readonly string[] = geom.CLOCK_ORDER;
export const DRIBBLE_ORDER: readonly string[] = geom.DRIBBLE_ORDER;
export const CONTEST_ORDER: readonly string[] = geom.CONTEST_ORDER;
export const SHOT_TYPE_ORDER: readonly string[] = geom.SHOT_TYPE_ORDER;
