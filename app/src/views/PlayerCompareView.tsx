/**
 * View 3 - Player vs Team: how each player DEVIATES from the roster, measured
 * under the same filters. Two questions, side by side: SELECTION (share delta -
 * goes there more/less?) and MAKING (eFG delta - better when he does?). +8 eFG in
 * the corners on a below-team share is a play-design finding, not a shooting one.
 */

import { useMemo } from 'react';

import { DataTable, type Column } from '../components/charts/DataTable';
import { DivergingBarChart, type DivergingDatum } from '../components/charts/DivergingBarChart';
import { ScatterChart, type ScatterDatum } from '../components/charts/ScatterChart';
import { Card } from '../components/ui/Card';
import { Button, ScaleLegend } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/States';
import { StatTile } from '../components/ui/StatTile';
import type { Dataset, Shot } from '../data/types';
import { EFFICIENCY_LEGEND, efficiencyColor } from '../lib/colorScale';
import { ZONE_ORDER } from '../lib/court';
import { int, pct, signed } from '../lib/format';
import {
  compareToBaseline, groupBy, LOW_SAMPLE_THRESHOLD,
  pointsAddedVsBaseline, summarise, type ShotSummary,
} from '../lib/metrics';
import { useFilterStore } from '../state/useFilters';
import styles from './PlayerCompareView.module.css';

interface PlayerCompareViewProps {
  dataset: Dataset;
  /** Shots under the full filter set, including any player selection. */
  shots: Shot[];
  /** Same filters minus the player selection -- the team baseline. */
  teamBaseline: Shot[];
}

interface PlayerRow extends ShotSummary {
  id: string;
  name: string;
  games: number;
  /** Points above/below the team's rates on the same shot distribution. */
  pointsAdded: number;
  rimRate: number;
}

export function PlayerCompareView({ dataset, shots, teamBaseline }: PlayerCompareViewProps) {
  const selectedPlayers = useFilterStore((s) => s.players);
  const togglePlayer = useFilterStore((s) => s.toggle);
  const setPlayers = useFilterStore((s) => s.setMany);
  const resetFilters = useFilterStore((s) => s.reset);

  const team = useMemo(() => summarise(teamBaseline), [teamBaseline]);

  // Rows come from the TEAM baseline, not the filtered slice - selecting one
  // player must not empty the table it's meant to be read against.
  const rows: PlayerRow[] = useMemo(() => {
    const zones = ZONE_ORDER as string[];
    const teamZones = groupBy(teamBaseline, (s) => s.zone, zones);
    const gamesById = new Map(dataset.players.map((p) => [p.id, p.games]));

    return groupBy(teamBaseline, (s) => s.playerId)
      .filter((g) => g.attempts > 0)
      .map((g) => {
        const playerZones = groupBy(g.shots, (s) => s.zone, zones);
        const first = g.shots[0]!;
        return {
          id: g.key,
          name: first.playerName,
          games: gamesById.get(g.key) ?? new Set(g.shots.map((s) => s.gameDate)).size,
          pointsAdded: pointsAddedVsBaseline(playerZones, teamZones),
          rimRate: g.shots.filter((s) => s.zone === 'Restricted Area').length / g.attempts,
          ...summarise(g.shots),
        };
      });
  }, [teamBaseline, dataset.players]);

  const scatter: ScatterDatum[] = useMemo(
    () =>
      rows.map((row) => ({
        key: row.id,
        label: row.name.replace(/^Player /, ''),
        x: row.attempts,
        y: row.efg * 100,
        weight: row.attempts,
        lowSample: row.lowSample,
      })),
    [rows],
  );

  /** The single player being profiled, when exactly one is selected. */
  const focus = selectedPlayers.length === 1 ? rows.find((r) => r.id === selectedPlayers[0]) : undefined;

  const zoneDeltas = useMemo(() => {
    if (!focus) return null;
    const zones = ZONE_ORDER as string[];
    const playerShots = teamBaseline.filter((s) => s.playerId === focus.id);
    return compareToBaseline(
      groupBy(playerShots, (s) => s.zone, zones),
      groupBy(teamBaseline, (s) => s.zone, zones),
      zones,
    ).filter((d) => d.player.attempts > 0 || d.baseline.attempts > 0);
  }, [focus, teamBaseline]);

  const efgBars: DivergingDatum[] = useMemo(
    () =>
      (zoneDeltas ?? [])
        .filter((d) => d.player.attempts > 0)
        .map((d) => ({
          key: d.key,
          label: d.key,
          value: d.efgDelta,
          display: signed(d.efgDelta),
          detail: `${int(d.player.attempts)} FGA`,
          lowSample: d.player.lowSample,
        })),
    [zoneDeltas],
  );

  const shareBars: DivergingDatum[] = useMemo(
    () =>
      (zoneDeltas ?? [])
        .filter((d) => d.player.attempts > 0 || d.baseline.attempts > 0)
        .map((d) => ({
          key: d.key,
          label: d.key,
          value: d.shareDelta,
          display: signed(d.shareDelta),
          detail: `${pct(d.playerShare, 0)} vs ${pct(d.baselineShare, 0)}`,
        })),
    [zoneDeltas],
  );

  const columns: Column<PlayerRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Player',
        render: (r) => <span className={styles.playerName}>{r.name}</span>,
        sortValue: (r) => r.name,
      },
      { key: 'games', header: 'G', align: 'right', render: (r) => r.games, sortValue: (r) => r.games },
      { key: 'fga', header: 'FGA', align: 'right', render: (r) => int(r.attempts), sortValue: (r) => r.attempts },
      {
        key: 'fg', header: 'FG%', align: 'right', title: 'Field-goal percentage',
        render: (r) => pct(r.fg), sortValue: (r) => r.fg,
      },
      {
        key: 'efg', header: 'eFG%', align: 'right',
        title: 'Effective field-goal percentage, credits a three at 1.5x a two',
        render: (r) => (
          <span className={styles.efgCell}>
            {pct(r.efg)}
            <span className={styles.deltaChip} style={{ color: deltaInk(r.efg - team.efg) }}>
              {signed((r.efg - team.efg) * 100)}
            </span>
          </span>
        ),
        sortValue: (r) => r.efg,
      },
      {
        key: 'pps', header: 'PPS', align: 'right', title: 'Points per shot attempt',
        render: (r) => r.pps.toFixed(2), sortValue: (r) => r.pps,
      },
      {
        key: 'threeRate', header: '3PA%', align: 'right', title: 'Share of attempts taken from three',
        render: (r) => pct(r.threeRate, 0), sortValue: (r) => r.threeRate,
      },
      {
        key: 'rimRate', header: 'Rim%', align: 'right', title: 'Share of attempts in the restricted area',
        render: (r) => pct(r.rimRate, 0), sortValue: (r) => r.rimRate,
      },
      {
        key: 'assisted', header: 'AST%', align: 'right', title: 'Share of makes that were assisted',
        render: (r) => pct(r.assistedRate, 0), sortValue: (r) => r.assistedRate,
      },
      {
        key: 'pointsAdded', header: 'Pts added', align: 'right',
        title: 'Points above/below what the team would score on the same shot distribution',
        render: (r) => (
          <span style={{ color: deltaInk(r.pointsAdded) }}>{signed(r.pointsAdded, 0)}</span>
        ),
        sortValue: (r) => r.pointsAdded,
      },
    ],
    [team.efg],
  );

  if (teamBaseline.length === 0) return <EmptyState onClear={resetFilters} />;

  return (
    <div className={styles.view}>
      <div className={styles.kpis}>
        <StatTile label="Roster" value={int(rows.length)} detail="players in this slice" />
        <StatTile label="Team eFG%" value={pct(team.efg)} detail={`${int(team.attempts)} attempts`} />
        <StatTile label="Team PPS" value={team.pps.toFixed(3)} detail={`${int(team.points)} points`} />
        <StatTile
          label="Focus"
          value={focus ? focus.name : selectedPlayers.length > 1 ? `${selectedPlayers.length} players` : 'Whole team'}
          detail={focus ? `${int(focus.attempts)} attempts` : 'Select one player to profile'}
        />
      </div>

      <div className={styles.grid}>
        <Card
          title="Volume against efficiency"
          subtitle="Bubble area is attempts. Dashed lines mark the team average. Click a player to profile them."
        >
          <ScatterChart
            data={scatter}
            xLabel="Field-goal attempts"
            yLabel="eFG%"
            xReference={rows.length ? team.attempts / rows.length : 0}
            yReference={team.efg * 100}
            formatX={(v) => int(v)}
            formatY={(v) => `${v.toFixed(0)}%`}
            onSelect={(key) => togglePlayer('players', key)}
            selected={selectedPlayers}
            quadrantLabels={['Efficient, low usage', 'Efficient, high usage', 'Inefficient, high usage', 'Low usage']}
          />
        </Card>

        <Card
          title={focus ? `${focus.name} vs team` : 'Zone profile'}
          subtitle={
            focus
              ? 'Left: is he better here? Right: does he go here more often?'
              : 'Select one player to see their deviation from the team profile.'
          }
          actions={
            focus ? (
              <Button onClick={() => setPlayers('players', [])}>Clear focus</Button>
            ) : undefined
          }
        >
          {focus && zoneDeltas ? (
            <div className={styles.deltaPair}>
              <div className={styles.deltaBlock}>
                <h3 className={styles.deltaTitle}>Shot-making: eFG% vs team</h3>
                <DivergingBarChart
                  data={efgBars}
                  colorFor={(v) => efficiencyColor(v)}
                  negativeLabel="Worse"
                  positiveLabel="Better"
                />
                <ScaleLegend items={EFFICIENCY_LEGEND} low="Below team" high="Above team" />
              </div>

              <div className={styles.deltaBlock}>
                <h3 className={styles.deltaTitle}>Shot-selection: share of attempts vs team</h3>
                <DivergingBarChart
                  data={shareBars}
                  colorFor={(v) => (v >= 0 ? 'var(--vol-4)' : 'var(--vol-2)')}
                  negativeLabel="Goes there less"
                  positiveLabel="Goes there more"
                />
                <p className={styles.deltaNote}>Colour here is volume, not quality.</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No player selected"
              detail="Pick a player to compare their zone profile against the rest of the roster."
            />
          )}
        </Card>
      </div>

      {focus && (
        <div className={styles.focusStrip}>
          <StatTile
            label="Points added"
            value={signed(focus.pointsAdded, 0)}
            detail="vs team rates on the same shot mix"
          />
          <StatTile
            label="eFG% vs team"
            value={signed((focus.efg - team.efg) * 100)}
            detail={`${pct(focus.efg)} against ${pct(team.efg)}`}
          />
          <StatTile
            label="3PA rate vs team"
            value={signed((focus.threeRate - team.threeRate) * 100)}
            detail={`${pct(focus.threeRate, 0)} against ${pct(team.threeRate, 0)}`}
          />
          <StatTile
            label="Rim rate vs team"
            value={signed((focus.rimRate - rimRateOf(teamBaseline)) * 100)}
            detail={`${pct(focus.rimRate, 0)} of his attempts at the rim`}
          />
          <StatTile
            label="Assisted rate"
            value={pct(focus.assistedRate, 0)}
            delta={(focus.assistedRate - team.assistedRate) * 100}
            deltaLabel="vs team"
            detail="how much he is set up"
          />
          <StatTile
            label="Contested rate"
            value={pct(focus.contestedRate, 0)}
            delta={(focus.contestedRate - team.contestedRate) * 100}
            deltaLabel="vs team"
            invertDelta
            detail="difficulty of his diet"
          />
        </div>
      )}

      <Card
        title="Roster shooting table"
        subtitle={`Click a row to focus that player. Rates under ${LOW_SAMPLE_THRESHOLD} attempts are unreliable.`}
        flush
      >
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.id}
          defaultSort={{ key: 'fga', direction: 'desc' }}
          onRowClick={(r) => togglePlayer('players', r.id)}
          isRowSelected={(r) => selectedPlayers.includes(r.id)}
          caption="Shooting profile for every player in the current selection"
        />
      </Card>

      <p className={styles.footnote}>
        Showing {int(shots.length)} of {int(teamBaseline.length)} shots under the active filters.
        A player is always measured against the roster under the <em>same</em> filters.
      </p>
    </div>
  );
}

const rimRateOf = (shots: readonly Shot[]) =>
  shots.length === 0 ? 0 : shots.filter((s) => s.zone === 'Restricted Area').length / shots.length;

/** Ink colour for a signed value. Sign and arrow carry the meaning; colour reinforces. */
const deltaInk = (value: number) =>
  Math.abs(value) < 0.0005 ? 'var(--ink-secondary)' : value > 0 ? 'var(--delta-up)' : 'var(--delta-down)';
