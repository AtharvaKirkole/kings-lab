/**
 * ETL: /data/shots.csv -> app/public/data/shots.json
 * Run: `npm run data` from app/ <<-- runs automatically before `dev`/`build`
 *
 * Derives every field once here (distance, zone, buckets…) so the browser does analytics, not data-prep. 
 * 
 * decode.ts unpacks it on load
 *
 * NOTEE:
 * 
 * The project description states the dataset is clean, and a simple
 * solution is wanted, so this pipeline does NO input validation and trusts the
 * CSV to have the right columns, well-formed numbers, and in-range coordinates.
 * (If the data could be dirty, this is where column/number/zone error checks and a
 * post-transform sanity check would happen.)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Papa from 'papaparse';

import * as court from '../src/lib/court.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '../..');
const csvPath = resolve(projectRoot, 'data/shots.csv');
const outputPath = resolve(projectRoot, 'app/public/data/shots.json');

// Parsing
function parseCsv(text) {
  const { data } = Papa.parse(text, { delimiter: ',', skipEmptyLines: 'greedy' });
  const [header = [], ...rows] = /** @type {string[][]} */ (data);
  return { header, rows };
}

// data translation markers
const toBool = (v) => v.trim().toUpperCase() === 'TRUE';
const num = (v) => Number(v);
const numOrNull = (v) => (v.trim().toUpperCase() === 'NULL' ? null : Number(v));
const round = (value, places) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};
const twoDigits = (value) => String(value).padStart(2, '0');

// Dictionary encoding
function createDictionary(seed = []) {
  const values = [];
  const index = new Map();
  const encode = (value) => {
    let code = index.get(value);
    if (code === undefined) {
      code = values.length;
      values.push(value);
      index.set(value, code);
    }
    return code;
  };
  seed.forEach(encode);
  return { encode, values };
}

// Transform
function build() {
  if (!existsSync(csvPath)) {
    throw new Error(`Source data not found`);
  }

  const { header, rows } = parseCsv(readFileSync(csvPath, 'utf8'));

  /** Column name -> position, so rows can be read by name instead of index. */
  /** @type {Record<string, number>} */
  const columnAt = {};
  header.forEach((name, i) => { columnAt[name] = i; });

  // One dictionary per categoty column.
  const dict = {
    player: createDictionary(),
    playerName: createDictionary(),
    gameDate: createDictionary(),
    shotType: createDictionary(court.SHOT_TYPE_ORDER),
    complexShotType: createDictionary(),
    contestLevel: createDictionary(court.CONTEST_ORDER),
    zone: createDictionary(court.ZONE_ORDER),
    rangeBand: createDictionary(court.RANGE_ORDER),
    clockBucket: createDictionary(court.CLOCK_ORDER),
    dribbleBucket: createDictionary(court.DRIBBLE_ORDER),
  };

  // Column arrays, in the order the decoder expects.
  const columns = {
    player: [], gameDate: [], period: [], gameClock: [], shotClock: [],
    x: [], y: [], distance: [], zone: [], rangeBand: [],
    isThree: [], made: [], points: [],
    blocked: [], fouled: [], assisted: [], astOpp: [], catchAndShoot: [],
    dribbles: [], dribbleBucket: [], contestLevel: [], contested: [],
    shotType: [], complexShotType: [], clockBucket: [], isClutch: [],
    passDistance: [],
  };

  /** Per-player game counts, derived with the row loop. */
  const gamesByPlayer = new Map();

  for (const row of rows) {
    const x = round(num(row[columnAt.x]), 2);
    const y = round(num(row[columnAt.y]), 2);
    const period = num(row[columnAt.period]);
    const startClock = num(row[columnAt.start_game_clock]);
    const shotClock = num(row[columnAt.shot_clock]);
    const gameDate = `${num(row[columnAt.year])}-${twoDigits(num(row[columnAt.month]))}-${twoDigits(num(row[columnAt.day]))}`;

    const shooterId = row[columnAt.shooter_id];
    const made = toBool(row[columnAt.outcome]);

    // These 12 players are of same team, so one date == one game.
    if (!gamesByPlayer.has(shooterId)) gamesByPlayer.set(shooterId, new Set());
    gamesByPlayer.get(shooterId).add(gameDate);

    const three = court.isThree(x, y);
    const value = three ? 3 : 2;

    const passerX = numOrNull(row[columnAt.passer_x]);
    const passerY = numOrNull(row[columnAt.passer_y]);
    const passDistance = passerX !== null && passerY !== null
      ? round(Math.hypot(x - passerX, y - passerY), 1)
      : -1; // -1 is non assisted shots

    const dribbles = num(row[columnAt.dribbles_before]);

    columns.player.push(dict.player.encode(shooterId));
    dict.playerName.encode(row[columnAt.shooter_name]);
    columns.gameDate.push(dict.gameDate.encode(gameDate));
    columns.period.push(period);
    columns.gameClock.push(round(startClock, 1));
    columns.shotClock.push(round(shotClock, 1));
    columns.x.push(x);
    columns.y.push(y);
    columns.distance.push(round(court.distanceFromHoop(x, y), 1));
    columns.zone.push(dict.zone.encode(court.zone(x, y)));
    columns.rangeBand.push(dict.rangeBand.encode(court.rangeBand(x, y)));
    columns.isThree.push(three ? 1 : 0);
    columns.made.push(made ? 1 : 0);
    columns.points.push(made ? value : 0);
    columns.blocked.push(toBool(row[columnAt.blocked]) ? 1 : 0);
    columns.fouled.push(toBool(row[columnAt.fouled]) ? 1 : 0);
    columns.assisted.push(toBool(row[columnAt.assisted]) ? 1 : 0);
    columns.astOpp.push(toBool(row[columnAt.ast_opp]) ? 1 : 0);
    columns.catchAndShoot.push(toBool(row[columnAt.catch_and_shoot]) ? 1 : 0);
    columns.dribbles.push(dribbles);
    columns.dribbleBucket.push(dict.dribbleBucket.encode(court.dribbleBucket(dribbles)));
    columns.contestLevel.push(dict.contestLevel.encode(row[columnAt.contest_level]));
    columns.contested.push(toBool(row[columnAt.contested]) ? 1 : 0);
    columns.shotType.push(dict.shotType.encode(row[columnAt.shot_type]));
    columns.complexShotType.push(dict.complexShotType.encode(row[columnAt.complex_shot_type]));
    columns.clockBucket.push(dict.clockBucket.encode(court.shotClockBucket(shotClock)));
    // CLUTCH!!!!
    columns.isClutch.push((period === 4 && startClock <= 300) || period >= 5 ? 1 : 0);
    columns.passDistance.push(passDistance);
  }

  const rowCount = columns.x.length;

  // Player roster, ordered by volume -- the order the UI presents them in.
  const players = dict.player.values
    .map((id, code) => ({
      id,
      code,
      name: dict.playerName.values[code],
      attempts: columns.player.filter((p) => p === code).length,
      games: gamesByPlayer.get(id).size,
    }))
    .sort((a, b) => b.attempts - a.attempts);

  const dates = [...dict.gameDate.values].sort();

  const payload = {
    meta: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      rowCount,
      seasonStart: dates[0],
      seasonEnd: dates[dates.length - 1],
      gameCount: dict.gameDate.values.length,
    },
    players,
    dictionaries: {
      gameDate: dict.gameDate.values,
      shotType: dict.shotType.values,
      complexShotType: dict.complexShotType.values,
      contestLevel: dict.contestLevel.values,
      zone: dict.zone.values,
      rangeBand: dict.rangeBand.values,
      clockBucket: dict.clockBucket.values,
      dribbleBucket: dict.dribbleBucket.values,
    },
    columns,
  };

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(payload));
}

build();
