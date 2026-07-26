/**
 * View 3 - Player vs Team: how each player DEVIATES from the roster, measured
 * under the same filters. 
 */

import { useMemo } from 'react';

import { DivergingBarChart, type DivergingDatum } from '../components/charts/DivergingBarChart';
import { ScatterChart, type ScatterDatum } from '../components/charts/ScatterChart';
import { Card } from '../components/ui/Card';
import { Button, ScaleLegend } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/States';
import { StatTile } from '../components/ui/StatTile';
import type { Shot } from '../data/types';
import { EFFICIENCY_LEGEND, efficiencyColor } from '../lib/colorScale';
import { ZONE_ORDER } from '../lib/court';
import { int, pct, signed } from '../lib/format';
import {
  compareToBaseline, groupBy,
  pointsAddedVsBaseline, summarise, type ShotSummary,
} from '../lib/metrics';
import { useFilterStore } from '../state/useFilters';
import styles from './PlayerCompareView.module.css';

interface PlayerCompareViewProps {
  teamBaseline: Shot[];
}

interface PlayerRow extends ShotSummary {
  id: string;
  name: string;
  pointsAdded: number;
  rimRate: number;
}

export function PlayerCompareView({ teamBaseline }: PlayerCompareViewProps) {
  const selectedPlayers = useFilterStore((s) => s.players);
  const setPlayers = useFilterStore((s) => s.setMany);
  const resetFilters = useFilterStore((s) => s.reset);

  const team = useMemo(() => summarise(teamBaseline), [teamBaseline]);

  // Rows come from the TEAM baseline, not the filtered slice selecting one
  // player must not empty the table it's meant to be read against.
  const rows: PlayerRow[] = useMemo(() => {
    const zones = ZONE_ORDER as string[];
    const teamZones = groupBy(teamBaseline, (s) => s.zone, zones);

    return groupBy(teamBaseline, (s) => s.playerId)
      .filter((g) => g.attempts > 0)
      .map((g) => {
        const playerZones = groupBy(g.shots, (s) => s.zone, zones);
        const first = g.shots[0]!;
        return {
          id: g.key,
          name: first.playerName,
          pointsAdded: pointsAddedVsBaseline(playerZones, teamZones),
          rimRate: g.shots.filter((s) => s.zone === 'Restricted Area').length / g.attempts,
          ...summarise(g.shots),
        };
      });
  }, [teamBaseline]);

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

  if (teamBaseline.length === 0) return <EmptyState onClear={resetFilters} />;

  return (
    <div className={styles.view}>
      <div className={styles.quadrants}>
        <Card
          title={focus ? focus.name : selectedPlayers.length > 1 ? `${selectedPlayers.length} players` : 'Whole team'}
          actions={
            focus ? <Button onClick={() => setPlayers('players', [])}>Clear focus</Button> : undefined
          }
        >
          <div className={styles.playerCard}>
            <PlayerPortrait />

            {focus ? (
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
            ) : (
              <EmptyState
                title="No player selected"
                detail="Pick a player to profile them against the rest of the roster."
              />
            )}
          </div>
        </Card>

        <Card title="Volume against efficiency">
          <ScatterChart
            data={scatter}
            xLabel="Field-goal attempts"
            yLabel="eFG%"
            xReference={rows.length ? team.attempts / rows.length : 0}
            yReference={team.efg * 100}
            formatX={(v) => int(v)}
            formatY={(v) => `${v.toFixed(0)}%`}
            onSelect={(key) => setPlayers('players', selectedPlayers.includes(key) ? [] : [key])}
            selected={selectedPlayers}
            quadrantLabels={['Efficient, low usage', 'Efficient, high usage', 'Inefficient, high usage', 'Low usage']}
          />
        </Card>

        <Card
          title="Shot-making: eFG% vs team"
          subtitle={focus ? 'Is he better here?' : undefined}
        >
          {focus && zoneDeltas ? (
            <div className={styles.deltaBlock}>
              <DivergingBarChart
                data={efgBars}
                colorFor={(v) => efficiencyColor(v)}
                negativeLabel="Worse"
                positiveLabel="Better"
              />
              <ScaleLegend items={EFFICIENCY_LEGEND} low="Below team" high="Above team" />
            </div>
          ) : (
            <EmptyState
              title="No player selected"
              detail="Pick a player to see their zone-by-zone shot-making."
            />
          )}
        </Card>

        <Card
          title="Shot-selection: share of attempts vs team"
          subtitle={focus ? 'Does he go here more often?' : undefined}
        >
          {focus && zoneDeltas ? (
            <div className={styles.deltaBlock}>
              <DivergingBarChart
                data={shareBars}
                colorFor={(v) => (v >= 0 ? 'var(--vol-4)' : 'var(--vol-2)')}
                negativeLabel="Goes there less"
                positiveLabel="Goes there more"
              />
              <p className={styles.deltaNote}>Colour here is volume, not quality.</p>
            </div>
          ) : (
            <EmptyState
              title="No player selected"
              detail="Pick a player to see where their attempts come from."
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function PlayerPortrait() {
  return (
    <figure className={styles.portrait}>
      <div className={styles.portraitFrame} aria-hidden="true">
        <svg viewBox="0 0 64 64" width="100%" height="100%">
          <circle cx="32" cy="23" r="11" fill="currentColor" opacity="0.35" />
          <path
            d="M12 58c0-11 9-19 20-19s20 8 20 19"
            fill="currentColor"
            opacity="0.35"
          />
        </svg>
      </div>
      <figcaption className={styles.portraitCaption}>Player image placeholder</figcaption>
    </figure>
  );
}

const rimRateOf = (shots: readonly Shot[]) =>
  shots.length === 0 ? 0 : shots.filter((s) => s.zone === 'Restricted Area').length / shots.length;
