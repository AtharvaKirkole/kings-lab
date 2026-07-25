/**
 * View 2 - Efficiency: WHICH shots pay, and how CONTEXT changes them. The matrix
 * is the centrepiece because shot quality is two-variable
 */

import { useMemo } from 'react';

import { BarChart, type BarDatum } from '../components/charts/BarChart';
import { MatrixChart, type MatrixCell } from '../components/charts/MatrixChart';
import { Card } from '../components/ui/Card';
import { Legend, ScaleLegend } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/States';
import { StatTile } from '../components/ui/StatTile';
import type { Shot } from '../data/types';
import { EFFICIENCY_LEGEND, efficiencyColor, volumeColor } from '../lib/colorScale';
import { CLOCK_ORDER, CONTEST_ORDER, DRIBBLE_ORDER, SHOT_TYPE_ORDER } from '../lib/court';
import { humanise, int, pct, signed } from '../lib/format';
import { groupBy, LOW_SAMPLE_THRESHOLD, summarise } from '../lib/metrics';
import { useFilterStore } from '../state/useFilters';
import styles from './EfficiencyView.module.css';

const MIN_PLAY_TYPE_ATTEMPTS = 40;

interface EfficiencyViewProps {
  shots: Shot[];
}

export function EfficiencyView({ shots }: EfficiencyViewProps) {
  const resetFilters = useFilterStore((s) => s.reset);
  const toggleFilter = useFilterStore((s) => s.toggle);
  const selectedComplex = useFilterStore((s) => s.complexShotTypes);
  const selectedContest = useFilterStore((s) => s.contestLevels);

  const overall = useMemo(() => summarise(shots), [shots]);

  const matrix = useMemo(() => {
    const rows = SHOT_TYPE_ORDER.filter((t) => shots.some((s) => s.shotType === t));
    const columns = CONTEST_ORDER.filter((c) => shots.some((s) => s.contestLevel === c));

    const cells: (MatrixCell | null)[][] = rows.map((row) =>
      columns.map((column) => {
        const bucket = shots.filter((s) => s.shotType === row && s.contestLevel === column);
        if (bucket.length === 0) return null;
        const stats = summarise(bucket);
        return {
          value: stats.pps,
          display: stats.pps.toFixed(2),
          count: bucket.length,
          fill: stats.lowSample ? 'var(--eff-neutral)' : efficiencyColor((stats.efg - overall.efg) * 100),
          lowSample: stats.lowSample,
        };
      }),
    );

    return { rows, columns, cells };
  }, [shots, overall.efg]);

  // Play-type ranking 
  const playTypes: BarDatum[] = useMemo(() => {
    return groupBy(shots, (s) => s.complexShotType)
      .filter((g) => g.attempts >= MIN_PLAY_TYPE_ATTEMPTS)
      .sort((a, b) => b.pps - a.pps)
      .map((g) => ({
        key: g.key,
        label: humanise(g.key),
        value: g.pps,
        display: g.pps.toFixed(2),
        detail: `${int(g.attempts)} FGA`,
        baseline: overall.pps,
        lowSample: g.lowSample,
      }));
  }, [shots, overall.pps]);

  const clockBars = useContextBars(shots, (s) => s.clockBucket, CLOCK_ORDER, overall.pps);
  const dribbleBars = useContextBars(shots, (s) => s.dribbleBucket, DRIBBLE_ORDER, overall.pps);
  const contestBars = useContextBars(shots, (s) => s.contestLevel, CONTEST_ORDER, overall.pps, humanise);

  const insights = useMemo(() => buildInsights(shots, overall.pps), [shots, overall.pps]);

  if (shots.length === 0) return <EmptyState onClear={resetFilters} />;

  const uncontested = summarise(shots.filter((s) => s.contestLevel === 'uncontested'));
  const heavy = summarise(shots.filter((s) => s.contestLevel === 'heavily_contested'));

  return (
    <div className={styles.view}>
      <div className={styles.kpis}>
        <StatTile label="Points / shot" value={overall.pps.toFixed(3)} detail={`${int(overall.attempts)} attempts`} />
        <StatTile
          label="Contest tax"
          value={`${(uncontested.pps - heavy.pps).toFixed(2)}`}
          detail={`${uncontested.pps.toFixed(2)} open vs ${heavy.pps.toFixed(2)} heavy`}
        />
        <StatTile
          label="Heavily contested"
          value={pct(heavy.attempts / overall.attempts, 0)}
          detail="share of all attempts"
        />
      </div>

      <Card
        title="Shot quality matrix"
        subtitle="Points per shot by shot type and defensive pressure. Colour is eFG% against this selection's average."
        actions={<ScaleLegend items={EFFICIENCY_LEGEND} low="Below average" high="Above average" />}
      >
        <MatrixChart
          rows={matrix.rows}
          columns={matrix.columns}
          cells={matrix.cells}
          rowLabel="Shot type"
          columnLabel="Defence"
          formatRow={humanise}
          formatColumn={humanise}
          caption="Points per shot by shot type and contest level"
        />
        <p className={styles.note}>
          Cells under {LOW_SAMPLE_THRESHOLD} attempts are hatched and left uncoloured.
        </p>
      </Card>

      <div className={styles.grid}>
        <Card
          title="Play types by value"
          subtitle={`Ranked by points per shot. Under ${MIN_PLAY_TYPE_ATTEMPTS} attempts are excluded. Click to filter.`}
        >
          <BarChart
            data={playTypes}
            max={Math.max(...playTypes.map((p) => p.value), overall.pps) * 1.08}
            colorFor={(d) => efficiencyColor(((d.value - overall.pps) / 2) * 100)}
            baselineLabel="Selection average"
            onSelect={(key) => toggleFilter('complexShotTypes', key)}
            selected={selectedComplex}
          />
          <div className={styles.legendRow}>
            <Legend
              compact
              items={[
                { color: 'var(--eff-hot-2)', label: 'Above average' },
                { color: 'var(--eff-neutral)', label: 'At average' },
                { color: 'var(--eff-cold-2)', label: 'Below average' },
              ]}
            />
          </div>
        </Card>

        <div className={styles.stack}>
          <Card title="Defensive pressure" subtitle="Points per shot as the contest tightens. Click to filter.">
            <BarChart
              data={contestBars}
              colorFor={(_, index) => volumeColor(contestBars.length - index, contestBars.length)}
              baselineLabel="Selection average"
              onSelect={(key) => toggleFilter('contestLevels', key)}
              selected={selectedContest}
            />
          </Card>

          <Card title="Possession stage" subtitle="Points per shot by time left on the shot clock.">
            <BarChart
              data={clockBars}
              colorFor={(_, index) => volumeColor(clockBars.length - index, clockBars.length)}
              baselineLabel="Selection average"
            />
          </Card>

          <Card title="Ball-handling load" subtitle="Points per shot by dribbles taken before the release.">
            <BarChart
              data={dribbleBars}
              colorFor={(_, index) => volumeColor(index + 1, dribbleBars.length)}
              baselineLabel="Selection average"
            />
          </Card>
        </div>
      </div>

      <Card title="What the numbers say" subtitle="Updates as you filter.">
        <ul className={styles.insights}>
          {insights.map((insight) => (
            <li key={insight.headline}>
              <strong>{insight.headline}</strong>
              <span>{insight.detail}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Shared shape for the three context bar charts. */
function useContextBars(
  shots: readonly Shot[],
  key: (shot: Shot) => string,
  order: readonly string[],
  baselinePps: number,
  format: (value: string) => string = (v) => v,
): BarDatum[] {
  return useMemo(
    () =>
      groupBy(shots, key, order as string[])
        .filter((g) => g.attempts > 0)
        .map((g) => ({
          key: g.key,
          label: format(g.key),
          value: g.pps,
          display: g.pps.toFixed(2),
          detail: `${pct(g.share, 0)} , ${int(g.attempts)}`,
          baseline: baselinePps,
          lowSample: g.lowSample,
        })),
    [shots, key, order, baselinePps, format],
  );
}

interface Insight {
  headline: string;
  detail: string;
}

function buildInsights(shots: readonly Shot[], overallPps: number): Insight[] {
  const insights: Insight[] = [];

  const open = summarise(shots.filter((s) => s.contestLevel === 'uncontested'));
  const heavy = summarise(shots.filter((s) => s.contestLevel === 'heavily_contested'));
  if (!open.lowSample && !heavy.lowSample) {
    insights.push({
      headline: `Contesting is worth ${(open.pps - heavy.pps).toFixed(2)} points per shot.`,
      detail: `Uncontested attempts return ${open.pps.toFixed(2)} PPS against ${heavy.pps.toFixed(2)} when heavily contested, and ${pct(heavy.attempts / shots.length, 0)} of this selection's shots come under heavy pressure.`,
    });
  }

  const zones = groupBy(shots, (s) => s.zone).filter((g) => !g.lowSample);
  const best = [...zones].sort((a, b) => b.pps - a.pps)[0];
  const worst = [...zones].sort((a, b) => a.pps - b.pps)[0];
  if (best && worst && best.key !== worst.key) {
    insights.push({
      headline: `${best.key} is the most productive zone at ${best.pps.toFixed(2)} PPS.`,
      detail: `${worst.key} returns ${worst.pps.toFixed(2)} on ${int(worst.attempts)} attempts (${pct(worst.share, 0)} of the selection), the clearest candidate for redistribution.`,
    });
  }

  const midRange = shots.filter((s) => s.rangeBand === 'Long Two' || s.rangeBand === 'Floater Range');
  if (midRange.length >= LOW_SAMPLE_THRESHOLD) {
    const stats = summarise(midRange);
    insights.push({
      headline: `Long twos and floaters make up ${pct(midRange.length / shots.length, 0)} of attempts at ${stats.pps.toFixed(2)} PPS.`,
      detail: `That is ${signed((stats.pps - overallPps) * 100 / 2)} eFG points against the selection average, the shots most worth converting into threes or rim attempts.`,
    });
  }

  const early = summarise(shots.filter((s) => s.clockBucket === 'Early (24-18)'));
  const late = summarise(shots.filter((s) => s.clockBucket === 'Very Late (<4)'));
  if (!early.lowSample && !late.lowSample) {
    insights.push({
      headline: `Early-clock looks return ${early.pps.toFixed(2)} PPS; broken possessions return ${late.pps.toFixed(2)}.`,
      detail: `${pct(late.attempts / shots.length, 0)} of attempts come with under four seconds on the shot clock, where efficiency drops by ${((early.pps - late.pps)).toFixed(2)} points per shot.`,
    });
  }

  return insights;
}
