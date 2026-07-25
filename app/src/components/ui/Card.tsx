/** Every chart and table on the dashboard sits here. */

import type { ReactNode } from 'react';
import clsx from 'clsx';

import styles from './Card.module.css';

interface CardProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}

export function Card({ title, subtitle, actions, children, flush, className }: CardProps) {
  return (
    <section className={clsx(styles.card, className)}>
      {(title || actions) && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {title && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </header>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
