# Kings Shot Lab
Live website link: https://atharvakirkole.github.io/kings-lab

A shot-profile dashboard. It answers four questions a staff actually asks:

- Which players take which shots, and from where?
- Which shots are efficient, and which aren't?
- How does shot-making change with context: defense, shot clock, dribbles?
- How does each player deviate from the team profile?
---

walkthrough video: https://youtu.be/3x3U73fLoXQ
## Run it

Needs **Node 18+**. Everything lives in the `app/` folder.

```bash
cd app
npm install
npm run dev
```

Open **http://localhost:5173**.

`npm run dev` runs the ETL first automatically, it reads `data/shots.csv` and
writes `app/public/data/shots.json`. No server, no database, no API keys.

Other commands:

```bash
npm run build     
npm run data       # regenerate the dataset from the CSV
npm run typecheck  
```

---

## The three views

### 1. Shot Chart: where shots come from and how they convert

The court is drawn in real court length, with three switchable layers:

- **Zones**: 11 standard zones, colored by efficiency or volume. Clicking a zone
  filters the entire dashboard to those shots.
- **Hexes**: size = attempts, color = eFG% vs baseline.
- **Shots**: every attempt; made = filled dot, missed = open ring.

![Zones by efficiency](docs/screenshots/01-zones-efficiency.png)

*Zones on efficiency colouring, blue below average and red above.*

![Hex layer](docs/screenshots/02-hexes.png)

*Hexes, size is attempts and colour is eFG% against the baseline.*

![Shot layer](docs/screenshots/03-shots.png)

*Every one of the 8,816 attempts, green made and red missed.*

### 2. Efficiency: which shots pay, and how context changes them

The centrepiece is a **shot type × defensive pressure** matrix, because shot
quality is two-variable: the same floater is a good shot open and a bad one
contested. A single ranked list hides that. play types by value, context
breakdowns (pressure, shot clock, dribbles).

![Shot quality matrix](docs/screenshots/04-shot-quality-matrix.png)

*The matrix for one player, where a layup goes from 1.85 open to 0.92 heavily contested.*

![Play types and context](docs/screenshots/05-play-types-and-context.png)

*Play types ranked by points per shot, with the pressure, shot clock and dribble breakdowns beside them.*

### 3. Player vs Team: how each player deviates

Four quadrants:

- **Player card** with a points-added figure (points above or below what the team
  would score on the same shot distribution).
- **Volume vs efficiency scatter**, bubble area = attempts, crosshair at team means.
- **Two bars side by side**: shot-*making* (eFG% vs team, per zone) and
  shot-*selection* (attempt share vs team). A player can be +8 eFG% in the corners
  while taking fewer of them... that's a play design finding, not a shooting one.

![Player card and scatter](docs/screenshots/06-player-card-and-scatter.png)

*Top two quadrants: the player card on the left, the roster scatter on the right with the selected player in red.*

![Zone deltas in light mode](docs/screenshots/07-zone-deltas-light.png)

*Bottom two quadrants, here in light mode: shot-making and shot-selection deltas side by side.*

### Filters and theming

One filter base shared by all three views, so a it survives switching views.
Every option shows a live attempt count, and only one player can be selected at a time.
The filter section is drag resizable and light and dark themes are both supported.

---

## Problems hit, and how they were solved

### eFG% showing 100–150%

The most interesting bug. Filtering to "Assisted" pushed eFG% to exactly show 100% for 2 pointers and 150 for 3 pointers which is teh ideal %age indicating every assisted attempt was converted. This seems unlikely, so on further investigation:

**Cause:** not a math error, a data-semantics one. In the source, `assisted` is
`TRUE` on **2,586 makes and 0 misses** an assist is only credited on a made
basket. So filtering to assisted shots selects makes *only*, forcing FG% to 100%,
and since eFG% adds 0.5 per made three it lands at a PERFECT %. The number was
correct; the filter was meaningless.

**Fix:** filter on **`ast_opp`** instead ehich is assist opportunity. That describes the *look* and exists on makes and misses alike so efficiency stays honest.

### The scatter chart showed negative attempts

Axis padding (12% of range) was applied to a count axis, pushing the minimum below
zero: "-131 attempts." handled by d3-scale's `.nice()`, which rounds the domain to clean brackets of attempts.

---

## Choices, and why

| Choice | Reasoning |
|---|---|
| **Static SPA, no backend** | I started a FastAPI + SQLite backend and deleted it. The brief calls for a lightweight solution; for 8,816 immutable rows a server adds a process to run and buys nothing. The data rigor moved into a build-time ETL instead. |
| **Build-time ETL** | Distance, zone, buckets and flags are derived once at build time, so the browser does analytics, not data-prep. Filtering stays in single-digit milliseconds. |
| **Columnar + dictionary-encoded JSON** | `decode.ts` unpacks it once at load, so exactly one file knows the compact format and everything else reads |
| **Zustand for state** | The store holds filter *criteria* only; filtered shots come from a memoized selector |
| **No input validation** | The brief states the data is clean and asks for a simple solution, so the ETL trusts the CSV. A comment in `build-dataset.mjs` marks where column/number/zone guards would go if it couldn't. |
| **Low sample marked, not hidden** | Under 25 attempts, cells are hatched and labelled "low n" rather than dropped. hiding it loses information but shouldnet be "shown" |

**Stack:** React 18 + TypeScript + Vite 6 + Zustand + CSS Modules + papaparse + d3 libraries + clsx.

---

## Scaling up

The current design whole dataset in memory, linear filter scans, one SVG node per shot. 
For millions of shots or many seasons:

- **Data:** move the ETL to Parquet + DuckDB or a warehouse
- **Serving:** add a thin aggregation API taht send raw shots only for the current filter.
- **Client:** render the shot layer on canvas/WebGL instead of thousands of DOM
  nodes; I have experiance with WebGL: https://atharvakirkole.github.io
  
One direction I'd love to explore at scale: a graph neural network over lineup
data, paired with a transformer over possession sequences, applied to
substitution and trade decisions. EA's World Cup simulations have called
several recent winners, and NBA data is richer with cleaner metrics.

---

## Known gaps

- **No test suite.** The geometry and metrics are pure functions and the data is pure so the obvious
  next step.
- **Insights are rule-based arithmetic**, not statistical verifiable by eye, but a
  larger sample would justify confidence intervals.

// LATEST ADDED: URL CAN BE COPIED WITH THE FILTERS!

**NOTE**: Codex and prior Sports Analytics Club(Michighan State University) ideas were used for styling (.css), color/theme configuration files, and compiling files like package-lock.json and help with documentation. All application logic, architecture, and core functionality were implemented independently. 
I did not see any project guidelines prohibiting the use of AI assistance for these auxiliary tasks so was executed so.
If such usage is not permitted, I can regenerate or recompile these files without AI styles CSS.
