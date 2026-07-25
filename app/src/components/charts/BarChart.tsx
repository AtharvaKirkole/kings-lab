/**
 * Horizontal bar chart with an optional baseline marker. 
 */

import type { ReactNode } from 'react';

import styles from './BarChart.module.css';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  display: string;
  detail?: string;
  baseline?: number;
  lowSample?: boolean;
}

interface BarChartProps {
  data: readonly BarDatum[];
  max?: number;
  colorFor?: (datum: BarDatum, index: number) => string;
  baselineLabel?: string;
  onSelect?: (key: string) => void;
  selected?: readonly string[];
  emptyMessage?: ReactNode;
}

export function BarChart({
  data,
  max,
  colorFor,
  baselineLabel,
  onSelect,
  selected = [],
  emptyMessage = 'No data for this selection.',
}: BarChartProps) {
  if (data.length === 0) {
    return <p className={styles.empty}>{emptyMessage}</p>;
  }

  const ceiling = max ?? Math.max(...data.map((d) => Math.max(d.value, d.baseline ?? 0)), 0.0001);
  const scale = (value: number) => `${Math.max(0, Math.min(100, (value / ceiling) * 100))}%`;

  return (
    <div className={styles.chart}>
      {data.map((datum, index) => {
        const isSelected = selected.includes(datum.key);
        const interactive = Boolean(onSelect);

        const row = (
          <>
            <span className={styles.label} title={datum.label}>
              {datum.label}
              {datum.lowSample && (
                <span className={styles.lowSample} title="Fewer than 25 attempts">
                  low n
                </span>
              )}
            </span>

            <span className={styles.track}>
              <span
                className={styles.bar}
                style={{
                  width: scale(datum.value),
                  background: colorFor?.(datum, index) ?? 'var(--vol-5)',
                }}
              />
              {datum.baseline !== undefined && (
                <span
                  className={styles.baseline}
                  style={{ left: scale(datum.baseline) }}
                  title={`${baselineLabel ?? 'Baseline'}: ${datum.baseline.toFixed(1)}`}
                  aria-hidden="true"
                />
              )}
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
            aria-pressed={isSelected}
            onClick={() => onSelect?.(datum.key)}
          >
            {row}
          </button>
        ) : (
          <div key={datum.key} className={styles.row}>
            {row}
          </div>
        );
      })}

      {baselineLabel && data.some((d) => d.baseline !== undefined) && (
        <p className={styles.footnote}>
          <span className={styles.baselineKey} aria-hidden="true" /> {baselineLabel}
        </p>
      )}
    </div>
  );
}
