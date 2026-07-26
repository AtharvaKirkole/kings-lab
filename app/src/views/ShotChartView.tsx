/**
 * View 1 - Shot Chart: WHERE shots come from and HOW they convert. Three layers
 * off one slice: Zones, Hexes , Shots .
 */

import { useCallback, useMemo, useRef, useState } from 'react';

import { CourtSvg, type CourtView } from '../components/court/CourtSvg';
import { HexLayer, HexTooltip, type HexDatum } from '../components/court/HexLayer';
import { ShotLayer, ShotTooltip } from '../components/court/ShotLayer';
import { ZoneLayer, ZoneTooltip, type ZoneColorMode, type ZoneDatum } from '../components/court/ZoneLayer';
import { BarChart, type BarDatum } from '../components/charts/BarChart';
import { Card } from '../components/ui/Card';
import { Button, Legend, ScaleLegend, Segmented } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/States';
import { StatTile } from '../components/ui/StatTile';
import { useHoverTooltip } from '../components/ui/Tooltip';
import type { Shot } from '../data/types';
import { EFFICIENCY_LEGEND, VOLUME_LEGEND } from '../lib/colorScale';
import { RANGE_ORDER } from '../lib/court';
import { int, pct } from '../lib/format';
import { groupBy, summarise } from '../lib/metrics';
import { useFilterStore } from '../state/useFilters';
import styles from './ShotChartView.module.css';

type LayerId = 'zones' | 'hex' | 'shots';

const LAYERS = [
  { value: 'zones' as const, label: 'Zones', hint: 'One summary number per court region' },
  { value: 'hex' as const, label: 'Hexes', hint: 'Size = volume, colour = efficiency' },
  { value: 'shots' as const, label: 'Shots', hint: 'Every individual attempt' },
];

const COLOR_MODES = [
  { value: 'efficiency' as const, label: 'Efficiency', hint: 'eFG% relative to the comparison baseline' },
  { value: 'volume' as const, label: 'Volume', hint: 'Share of attempts' },
];

const COURT_VIEWS = [
  { value: 'half' as const, label: 'Half', hint: 'Offensive end only' },
  { value: 'full' as const, label: 'Full', hint: 'Full 94 x 50 coordinate system' },
];

interface ShotChartViewProps {
  shots: Shot[];
  /** Same filters minus the player selection; the comparison baseline. */
  teamBaseline: Shot[];
}

export function ShotChartView({ shots, teamBaseline }: ShotChartViewProps) {
  const [layer, setLayer] = useState<LayerId>('zones');
  const [colorMode, setColorMode] = useState<ZoneColorMode>('efficiency');
  const [courtView, setCourtView] = useState<CourtView>('full');
  const [showGrid, setShowGrid] = useState(true);

  const selectedZones = useFilterStore((s) => s.zones);
  const toggleZone = useFilterStore((s) => s.toggle);
  const resetFilters = useFilterStore((s) => s.reset);
  const selectedPlayers = useFilterStore((s) => s.players);

  const svgRef = useRef<SVGSVGElement>(null);
  const zoneTip = useHoverTooltip<ZoneDatum>();
  const hexTip = useHoverTooltip<HexDatum>();
  const shotTip = useHoverTooltip<Shot>();

  const summary = useMemo(() => summarise(shots), [shots]);
  const baseline = useMemo(() => summarise(teamBaseline), [teamBaseline]);
  const comparing = selectedPlayers.length > 0;

  /** Maps a pointer position to court feet, inverting the SVG transform. */
  const toCourt = useCallback((event: { clientX: number; clientY: number }) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return { x: point.x, y: point.y };
  }, []);

  const rangeBars: BarDatum[] = useMemo(() => {
    const groups = groupBy(shots, (s) => s.rangeBand, RANGE_ORDER as string[]);
    const baselineGroups = new Map(
      groupBy(teamBaseline, (s) => s.rangeBand, RANGE_ORDER as string[]).map((g) => [g.key, g]),
    );
    return groups
      .filter((g) => g.attempts > 0)
      .map((g) => ({
        key: g.key,
        label: g.key,
        value: g.share * 100,
        display: pct(g.share, 0),
        detail: `${g.pps.toFixed(2)} PPS`,
        baseline: comparing ? (baselineGroups.get(g.key)?.share ?? 0) * 100 : undefined,
        lowSample: g.lowSample,
      }));
  }, [shots, teamBaseline, comparing]);

  if (shots.length === 0) {
    return <EmptyState onClear={resetFilters} />;
  }

  const rimShare = shots.filter((s) => s.zone === 'Restricted Area').length / shots.length;
  const activeTip =
    layer === 'zones' ? zoneTip : layer === 'hex' ? hexTip : shotTip;

  return (
    <div className={styles.view}>
      <div className={styles.kpis}>
        <StatTile label="Attempts" value={int(summary.attempts)} detail={`${int(summary.makes)} made`} />
        <StatTile
          label="eFG%"
          value={pct(summary.efg)}
          delta={comparing ? (summary.efg - baseline.efg) * 100 : undefined}
          deltaLabel="vs team"
          detail={comparing ? `team ${pct(baseline.efg)}` : `${pct(summary.fg)} FG`}
        />
        <StatTile
          label="Points / shot"
          value={summary.pps.toFixed(2)}
          delta={comparing ? (summary.pps - baseline.pps) * 100 : undefined}
          deltaLabel="pts/100"
          detail={`${int(summary.points)} points`}
        />
        <StatTile
          label="3PA rate"
          value={pct(summary.threeRate, 0)}
          delta={comparing ? (summary.threeRate - baseline.threeRate) * 100 : undefined}
          deltaLabel="vs team"
          detail={`${pct(summary.threeAttempts ? summary.threeMakes / summary.threeAttempts : 0, 0)} from three`}
        />
        <StatTile
          label="Rim rate"
          value={pct(rimShare, 0)}
          detail="share at the rim"
        />
        <StatTile
          label="Contested"
          value={pct(summary.contestedRate, 0)}
          delta={comparing ? (summary.contestedRate - baseline.contestedRate) * 100 : undefined}
          deltaLabel="vs team"
          invertDelta
          detail="defender engaged"
        />
      </div>

      <div className={styles.main}>
        <Card
          title="Shot chart"
          subtitle={
            layer === 'zones'
              ? 'Click any zone to filter the whole dashboard to those shots.'
              : layer === 'hex'
                ? 'Hex size is attempts; colour is eFG% against the baseline.'
                : 'Every attempt in the current selection. Hover for shot detail.'
          }
          actions={
            <>
              <Segmented options={LAYERS} value={layer} onChange={setLayer} label="Court layer" size="sm" />
              {layer === 'zones' && (
                <Segmented options={COLOR_MODES} value={colorMode} onChange={setColorMode} label="Colour by" size="sm" />
              )}
              <Segmented options={COURT_VIEWS} value={courtView} onChange={setCourtView} label="Court extent" size="sm" />
              <Button onClick={() => setShowGrid((v) => !v)} title="Toggle the coordinate grid">
                {showGrid ? 'Grid on' : 'Grid off'}
              </Button>
            </>
          }
        >
          <div className={styles.courtWrap} ref={activeTip.containerRef}>
            <CourtSvg
              svgRef={svgRef}
              view={courtView}
              showGrid={showGrid}
              label={`Shot chart: ${int(summary.attempts)} attempts, ${pct(summary.efg)} effective field-goal percentage`}
            >
              {layer === 'zones' && (
                <ZoneLayer
                  shots={shots}
                  baseline={teamBaseline}
                  mode={colorMode}
                  comparing={comparing}
                  selected={selectedZones}
                  onSelect={(zone) => toggleZone('zones', zone)}
                  tooltip={zoneTip}
                />
              )}
              {layer === 'hex' && <HexLayer shots={shots} baselineEfg={baseline.efg} tooltip={hexTip} />}
              {layer === 'shots' && <ShotLayer shots={shots} tooltip={shotTip} toCourt={toCourt} />}
            </CourtSvg>

            {zoneTip.tooltip && layer === 'zones' && (
              <ZoneTooltip
                datum={zoneTip.tooltip.data}
                x={zoneTip.tooltip.x}
                y={zoneTip.tooltip.y}
                comparing={comparing}
              />
            )}
            {hexTip.tooltip && layer === 'hex' && (
              <HexTooltip datum={hexTip.tooltip.data} x={hexTip.tooltip.x} y={hexTip.tooltip.y} />
            )}
            {shotTip.tooltip && layer === 'shots' && (
              <ShotTooltip datum={shotTip.tooltip.data} x={shotTip.tooltip.x} y={shotTip.tooltip.y} />
            )}
          </div>

          <div className={styles.legendRow}>
            {layer === 'shots' ? (
              <Legend
                title="Outcome"
                items={[
                  { color: 'var(--status-good)', label: 'Made' },
                  { color: 'var(--status-critical)', label: 'Missed', outline: true },
                ]}
              />
            ) : layer === 'zones' && colorMode === 'volume' ? (
              <ScaleLegend items={VOLUME_LEGEND} low="Fewest shots" high="Most shots" />
            ) : (
              <ScaleLegend
                items={EFFICIENCY_LEGEND}
                low={comparing ? 'Below team' : 'Below average'}
                high={comparing ? 'Above team' : 'Above average'}
              />
            )}
            <p className={styles.legendNote}>
              {comparing ? 'Baseline: the whole roster.' : 'Baseline: the current selection.'}{' '}
              Regions under 25 attempts are hatched.
            </p>
          </div>
        </Card>

        <div className={styles.side}>
          <Card title="Distance mix" subtitle="Share of attempts by distance band, with points per shot.">
            <BarChart
              data={rangeBars}
              baselineLabel={comparing ? 'Team share' : undefined}
            />
          </Card>

          <Card title="Shot diet" subtitle="Creation and pressure breakdown.">
            <dl className={styles.facts}>
              <Fact label="Assisted (of makes)" value={pct(summary.assistedRate, 0)} />
              <Fact label="Catch & shoot" value={pct(shots.filter((s) => s.catchAndShoot).length / shots.length, 0)} />
              <Fact label="Heavily contested" value={pct(shots.filter((s) => s.contestLevel === 'heavily_contested').length / shots.length, 0)} />
              <Fact label="Shooting fouls drawn" value={pct(summary.foulRate, 0)} />
              <Fact label="Blocked" value={pct(summary.blockRate, 0)} />
              <Fact label="Games covered" value={int(new Set(shots.map((s) => s.gameDate)).size)} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
