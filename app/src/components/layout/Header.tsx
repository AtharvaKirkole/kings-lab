/**
 * App header: identity, view nav, dataset provenance, theme toggle. The season range and shot count sit up here 
 */

import { useThemeStore } from '../../state/useTheme';
import { Segmented } from '../ui/Controls';
import styles from './Header.module.css';

export type ViewId = 'court' | 'efficiency' | 'players';

const VIEWS = [
  { value: 'court' as const, label: 'Shot Chart', hint: 'Where shots come from and how they convert' },
  { value: 'efficiency' as const, label: 'Efficiency', hint: 'Which shots pay, and how context changes them' },
  { value: 'players' as const, label: 'Player vs Team', hint: 'How each player deviates from the team profile' },
];

interface HeaderProps {
  view: ViewId;
  onViewChange: (view: ViewId) => void;
}

export function Header({ view, onViewChange }: HeaderProps) {
  const mode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';

  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <span className={styles.mark} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M2 18h20l-1.6-9.4-4.6 3.6L12 4l-3.8 8.2-4.6-3.6L2 18Zm0 2h20v2H2v-2Z"
              fill="currentColor"
            />
          </svg>
        </span>
        <div className={styles.titleBlock}>
          <span className={styles.brand}>Sacramento Kings</span>
          <h1 className={styles.title}>Shot Lab</h1>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Dashboard views">
        <Segmented options={VIEWS} value={view} onChange={onViewChange} label="Dashboard view" />
      </nav>

      <div className={styles.meta}>
        <button
          type="button"
          className={styles.themeToggle}
          onClick={toggleTheme}
          role="switch"
          aria-checked={isDark}
          aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
          title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
        >
          <span className={styles.themeIcon} aria-hidden="true">{isDark ? '☾' : '☀'}</span>
          <span className={styles.themeLabel}>{isDark ? 'Dark' : 'Light'}</span>
        </button>
      </div>
    </header>
  );
}
