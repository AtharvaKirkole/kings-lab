/**
 * Sortable data table - also the accessible "table view" for the charts (every plotted number is readable here as text).
 */

import { useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';

import styles from './DataTable.module.css';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Value used for sorting; */
  sortValue?: (row: T) => number | string;
  align?: 'left' | 'right';
  title?: string;
}

interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string;
  /** Column sorted on first render. */
  defaultSort?: { key: string; direction: 'asc' | 'desc' };
  onRowClick?: (row: T) => void;
  isRowSelected?: (row: T) => boolean;
  caption: string;
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  defaultSort,
  onRowClick,
  isRowSelected,
  caption,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column?.sortValue) return rows;

    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av).localeCompare(String(bv)) * direction;
      }
      return (av - bv) * direction;
    });
  }, [rows, columns, sort]);

  const toggleSort = (key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    );
  };

  return (
    <div className="scroll-x">
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => {
              const sortable = Boolean(column.sortValue);
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={column.align === 'right' ? styles.thRight : styles.th}
                  aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                  title={column.title}
                >
                  {sortable ? (
                    <button type="button" className={styles.sortButton} onClick={() => toggleSort(column.key)}>
                      {column.header}
                      <span className={clsx(styles.caret, active && styles.caretActive)} aria-hidden="true">
                        {active ? (sort!.direction === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              className={clsx(onRowClick && styles.rowClickable, isRowSelected?.(row) && styles.rowSelected)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onKeyDown={
                onRowClick
                  ? (e) => {
                      if (e.key === 'Enter') onRowClick(row);
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'right' ? styles.tdRight : styles.td}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
