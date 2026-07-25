/**
 * Diverging bar chart: signed values around a zero axis
 */

import clsx from 'clsx';

import styles from './DivergingBarChart.module.css';

export interface DivergingDatum {
  key: string;
  label: string;
  value: number;
  display: string;
  detail?: string;
  lowSample?: boolean;
}

interface DivergingBarChartProps {
  data: readonly DivergingDatum[];
  max?: number;
  colorFor: (value: number) => string;
  negativeLabel: string;
  positiveLabel: string;
  onSelect?: (key: string) => void;
  selected?: readonly string[];
}

export function DivergingBarChart({
  data,
  max,
  colorFor,
  negativeLabel,
  positiveLabel,
  onSelect,
  selected = [],
}: DivergingBarChartProps) {
  if (data.length === 0) {
    return <p className={styles.empty}>No data in this selection.</p>;
  }

  // symmetric axis makes equal magnitudes as equal weight.
  const bound = max ?? Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const halfWidth = (value: number) => `${Math.min(50, (Math.abs(value) / bound) * 50)}%`;

  return (
    <div className={styles.chart}>
      <div className={styles.axisLabels} aria-hidden="true">
        <span>← {negativeLabel}</span>
        <span>{positiveLabel} →</span>
      </div>

      {data.map((datum) => {
        const positive = datum.value >= 0;
        const interactive = Boolean(onSelect);

        const content = (
          <>
            <span className={styles.label} title={datum.label}>
              {datum.label}
              {datum.lowSample && <span className={styles.lowSample}>low n</span>}
            </span>

            <span className={styles.track}>
              <span className={styles.zeroLine} aria-hidden="true" />
              <span
                className={clsx(styles.bar, positive ? styles.barPositive : styles.barNegative)}
                style={{
                  width: halfWidth(datum.value),
                  background: datum.lowSample ? 'var(--eff-neutral)' : colorFor(datum.value),
                }}
              />
            </span>

            <span className={`${styles.value} tabular`}>
              {datum.display}
              {datum.detail && <span className={styles.detail}>{datum.detail}</span>}
            </span>
          </>
        );

        return interactive ? (
          <button
            key={datum.key}
            type="button"
            className={`${styles.row} ${styles.rowInteractive}`}
            aria-pressed={selected.includes(datum.key)}
            onClick={() => onSelect?.(datum.key)}
          >
            {content}
          </button>
        ) : (
          <div key={datum.key} className={styles.row}>
            {content}
          </div>
        );
      })}
    </div>
  );
}
