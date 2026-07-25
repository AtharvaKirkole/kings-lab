/**
 * Small shared controls: switch, chip, 3 state, legends, button.
 */

import type { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './Controls.module.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

interface SegmentedProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string>({ options, value, onChange, label, size = 'md' }: SegmentedProps<T>) {
  return (
    <div className={clsx(styles.segmented, size === 'sm' && styles.segmentedSm)} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.segment}
          aria-pressed={value === option.value}
          title={option.hint}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// toggle framework
interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  count?: number;
  title?: string;
}

export function Chip({ active, onClick, children, count, title }: ChipProps) {
  return (
    <button type="button" className={styles.chip} aria-pressed={active} onClick={onClick} title={title}>
      <span className={styles.chipLabel}>{children}</span>
      {count !== undefined && <span className={`${styles.chipCount} tabular`}>{count}</span>}
    </button>
  );
}

// 3 state contool

interface TriStateProps {
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  label: string;
  onLabel: string;
  offLabel: string;
  reverseStates?: boolean;
}

/** Three explicit states */
export function TriState({ value, onChange, label, onLabel, offLabel, reverseStates }: TriStateProps) {
  const branches = [
    { key: 'on', state: true, label: onLabel },
    { key: 'off', state: false, label: offLabel },
  ];
  const options: { key: string; state: boolean | null; label: string }[] = [
    { key: 'any', state: null, label: 'Any' },
    ...(reverseStates ? [...branches].reverse() : branches),
  ];

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <div className={`${styles.segmented} ${styles.segmentedSm}`} role="group" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            className={styles.segment}
            aria-pressed={value === option.state}
            onClick={() => onChange(option.state)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// Legends

export interface LegendItem {
  color: string;
  label: string;
  outline?: boolean;
}

export function Legend({ items, title, compact }: { items: readonly LegendItem[]; title?: string; compact?: boolean }) {
  return (
    <div className={clsx(styles.legend, compact && styles.legendCompact)}>
      {title && <span className={styles.legendTitle}>{title}</span>}
      <ul className={styles.legendItems}>
        {items.map((item) => (
          <li key={item.label} className={styles.legendItem}>
            <span
              className={item.outline ? styles.legendRing : styles.legendSwatch}
              style={item.outline ? { borderColor: item.color } : { background: item.color }}
              aria-hidden="true"
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Continuous legends */
export function ScaleLegend({ items, low, high }: { items: readonly LegendItem[]; low: string; high: string }) {
  return (
    <div className={styles.scaleLegend}>
      <span className={styles.scaleEnd}>{low}</span>
      <div className={styles.scaleBar}>
        {items.map((item) => (
          <span key={item.label} style={{ background: item.color }} title={item.label} />
        ))}
      </div>
      <span className={styles.scaleEnd}>{high}</span>
    </div>
  );
}

// Button
interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'ghost' | 'solid';
  disabled?: boolean;
  title?: string;
  className?: string;
}

export function Button({ onClick, children, variant = 'ghost', disabled, title, className }: ButtonProps) {
  return (
    <button
      type="button"
      className={clsx(variant === 'solid' ? styles.buttonSolid : styles.buttonGhost, className)}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
