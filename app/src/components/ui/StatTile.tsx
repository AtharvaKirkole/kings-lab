/**
 * Stat tile headline
 */

import clsx from 'clsx';

import styles from './StatTile.module.css';

interface StatTileProps {
  label: string;
  value: string;
  detail?: string;
  delta?: number;
  deltaLabel?: string;
  invertDelta?: boolean;
}

export function StatTile({ label, value, detail, delta, deltaLabel, invertDelta }: StatTileProps) {
  const hasDelta = delta !== undefined && Number.isFinite(delta) && Math.abs(delta) >= 0.05;
  const good = hasDelta && (invertDelta ? delta < 0 : delta > 0);

  return (
    <div className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
      <span className={styles.footer}>
        {hasDelta && (
          <span className={clsx(styles.delta, 'tabular', good ? styles.up : styles.down)}>
            {/* Arrow + sign: the meaning never rests on colour alone. */}
            {good ? '▲' : '▼'} {delta > 0 ? '+' : '−'}
            {Math.abs(delta).toFixed(1)}
            {deltaLabel ? ` ${deltaLabel}` : ''}
          </span>
        )}
        {detail && <span className={styles.detail}>{detail}</span>}
      </span>
    </div>
  );
}
