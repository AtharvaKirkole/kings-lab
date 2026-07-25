/**
 * Floating tooltip for chart marks - absolutely-positioned HTML over the chart
 * Position is tracked in container-relative px and flipped near the right edge so it stays in frame.
 */

import { useCallback, useRef, useState, type ReactNode, type RefObject } from 'react';
import clsx from 'clsx';

import styles from './Tooltip.module.css';

export interface TooltipState<T> {
  data: T;
  x: number;
  y: number;
}

export interface HoverTooltip<T> {
  containerRef: RefObject<HTMLDivElement>;
  tooltip: TooltipState<T> | null;
  show: (data: T, event: { clientX: number; clientY: number }) => void;
  hide: () => void;
}

export function useHoverTooltip<T>(): HoverTooltip<T> {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState<T> | null>(null);

  const show = useCallback((data: T, event: { clientX: number; clientY: number }) => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setTooltip({ data, x: event.clientX - bounds.left, y: event.clientY - bounds.top });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, show, hide };
}

interface TooltipCardProps {
  x: number;
  y: number;
  children: ReactNode;
}

export function TooltipCard({ x, y, children }: TooltipCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const width = ref.current?.offsetWidth ?? 200;
  const parentWidth = ref.current?.parentElement?.offsetWidth ?? Number.POSITIVE_INFINITY;

  const flip = x + width + 24 > parentWidth;

  return (
    <div
      ref={ref}
      className={styles.card}
      style={{
        left: x,
        top: y,
        transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, -50%)`,
      }}
      role="tooltip"
    >
      {children}
    </div>
  );
}

export function TooltipRow({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={clsx(styles.rowValue, 'tabular', accent && styles.rowAccent)}>{value}</span>
    </div>
  );
}

export function TooltipTitle({ children, swatch }: { children: ReactNode; swatch?: string }) {
  return (
    <div className={styles.title}>
      {swatch && <span className={styles.swatch} style={{ background: swatch }} aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}
