/**
 * Failure, empty, and error-boundary states
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from './Controls';
import styles from './States.module.css';

export function ErrorState({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className={styles.state} role="alert">
      <span className={styles.icon} aria-hidden="true">⚠</span>
      <h2 className={styles.title}>{message}</h2>
      {detail && <p className={styles.detail}>{detail}</p>}
      {onRetry && (
        <div className={styles.action}>
          <Button variant="solid" onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No shots with these filters',
  detail = 'Loosen or clear a filter',
  onClear,
}: {
  title?: string;
  detail?: string;
  onClear?: () => void;
}) {
  return (
    <div className={styles.state}>
      <span className={styles.icon} aria-hidden="true">◎</span>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.detail}>{detail}</p>
      {onClear && (
        <div className={styles.action}>
          <Button onClick={onClear}>Clear all filters</Button>
        </div>
      )}
    </div>
  );
}


interface BoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
}

interface BoundaryState {
  error: Error | null;
}


export class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[boundary] render failed', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <ErrorState
        message={this.props.fallbackTitle ?? 'This panel could not be rendered'}
        detail={error.message}
        onRetry={() => this.setState({ error: null })}
      />
    );
  }
}
