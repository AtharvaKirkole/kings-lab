/**
 * 2-D heatmap as a real <table>, so the figure IS its own accessible table view
 * Every cell shows its value which also covers the lighter diverging steps.
 */

import clsx from 'clsx';

import styles from './MatrixChart.module.css';

export interface MatrixCell {
  value: number | null;
  display: string;
  count: number;
  fill: string;
  lowSample: boolean;
}

interface MatrixChartProps {
  rows: readonly string[];
  columns: readonly string[];
  cells: (MatrixCell | null)[][];
  rowLabel: string;
  columnLabel: string;
  formatRow?: (value: string) => string;
  formatColumn?: (value: string) => string;
  caption: string;
}

export function MatrixChart({
  rows,
  columns,
  cells,
  rowLabel,
  columnLabel,
  formatRow = (v) => v,
  formatColumn = (v) => v,
  caption,
}: MatrixChartProps) {
  return (
    <div className="scroll-x">
      <table className={styles.matrix}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              <span className={styles.cornerRow}>{rowLabel}</span>
              <span className={styles.cornerCol}>{columnLabel}</span>
            </th>
            {columns.map((column) => (
              <th key={column} scope="col" className={styles.colHeader}>
                {formatColumn(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={row}>
              <th scope="row" className={styles.rowHeader}>{formatRow(row)}</th>
              {columns.map((column, c) => {
                const cell = cells[r]?.[c];
                if (!cell || cell.count === 0) {
                  return <td key={column} className={styles.cellEmpty} aria-label="no attempts">–</td>;
                }
                return (
                  <td
                    key={column}
                    className={clsx(styles.cell, cell.lowSample && styles.cellLowSample)}
                    style={{ background: cell.fill }}
                    title={`${formatRow(row)} and ${formatColumn(column)}: ${cell.display} on ${cell.count} attempts`}
                  >
                    <span className={`${styles.cellValue} tabular`}>{cell.display}</span>
                    <span className={`${styles.cellCount} tabular`}>{cell.count}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
