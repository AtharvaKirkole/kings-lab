/** Domain types for the decoded shot dataset. */

/** A single shot attempt, fully denormalised for direct use by the UI. */
export interface Shot {
  /** Index into `Dataset.players`. Kept numeric so filtering stays cheap. */
  playerCode: number;
  playerId: string;
  playerName: string;

  gameDate: string;
  period: number;
  /** Seconds remaining in the period at release. */
  gameClock: number;
  shotClock: number;

  x: number;
  y: number;
  distance: number;
  zone: string;
  rangeBand: string;
  isThree: boolean;

  made: boolean;
  points: number;
  blocked: boolean;
  fouled: boolean;

  assisted: boolean;
  astOpp: boolean;
  catchAndShoot: boolean;
  dribbles: number;
  dribbleBucket: string;
  /** Distance travelled by the preceding pass, or `null` when there was none. */
  passDistance: number | null;

  contested: boolean;
  contestLevel: string;
  shotType: string;
  complexShotType: string;
  clockBucket: string;
  isClutch: boolean;
}

export interface Player {
  id: string;
  /** Position in the encoded player dictionary; matches `Shot.playerCode`. */
  code: number;
  name: string;
  attempts: number;
  games: number;
}

export interface DatasetMeta {
  schemaVersion: number;
  generatedAt: string;
  rowCount: number;
  seasonStart: string;
  seasonEnd: string;
  gameCount: number;
}

/** The decoded dataset held in memory for the life of the session. */
export interface Dataset {
  meta: DatasetMeta;
  players: Player[];
  shots: Shot[];
  /** Distinct values per categorical field, in canonical display order. */
  options: {
    shotTypes: string[];
    complexShotTypes: string[];
    contestLevels: string[];
    zones: string[];
    rangeBands: string[];
    clockBuckets: string[];
    dribbleBuckets: string[];
    gameDates: string[];
    periods: number[];
  };
}

/** Wire format written by `scripts/build-dataset.mjs`. */
export interface EncodedDataset {
  meta: DatasetMeta;
  players: Player[];
  dictionaries: {
    gameDate: string[];
    shotType: string[];
    complexShotType: string[];
    contestLevel: string[];
    zone: string[];
    rangeBand: string[];
    clockBucket: string[];
    dribbleBucket: string[];
  };
  columns: Record<EncodedColumn, number[]>;
}

export type EncodedColumn =
  | 'player' | 'gameDate' | 'period' | 'gameClock' | 'shotClock'
  | 'x' | 'y' | 'distance' | 'zone' | 'rangeBand'
  | 'isThree' | 'made' | 'points'
  | 'blocked' | 'fouled' | 'assisted' | 'astOpp' | 'catchAndShoot'
  | 'dribbles' | 'dribbleBucket' | 'contestLevel' | 'contested'
  | 'shotType' | 'complexShotType' | 'clockBucket' | 'isClutch'
  | 'passDistance';
