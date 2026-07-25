/**
 * App does: resolve the load state, process the active view, hand each view its data and shots. 
 * 
 * No analytics of its own, the derivation is shown in `useFilteredShots`, 
 * 
 * criteria shown in the filter store.
 */

import { useEffect, useMemo, useState } from 'react';

import { FilterRail } from './components/layout/FilterRail';
import { Header, type ViewId } from './components/layout/Header';
import { Button } from './components/ui/Controls';
import { LoadingScreen } from './components/ui/LoadingScreen';
import { ErrorBoundary, ErrorState } from './components/ui/States';
import type { Dataset } from './data/types';
import { useDataset, useDatasetStore } from './data/useDataset';
import { int } from './lib/format';
import { countActiveFilters, useFilterStore } from './state/useFilters';
import { useFilteredShots } from './state/useFilteredShots';
import { useApplyTheme } from './state/useTheme';
import { readViewFromUrl, writeUrl } from './state/urlState';
import { EfficiencyView } from './views/EfficiencyView';
import { PlayerCompareView } from './views/PlayerCompareView';
import { ShotChartView } from './views/ShotChartView';
import styles from './App.module.css';

export default function App() {
  useApplyTheme();
  const state = useDataset();

  if (state.status === 'idle' || state.status === 'loading') { return <LoadingScreen />; }
  if (state.status === 'error') {
    return (
      <div className={styles.errorShell}>
        <ErrorState
          message={state.message}
          detail={state.detail}
          onRetry={() => {
            // Reset to idle
            useDatasetStore.setState({ state: { status: 'idle' } });
            void useDatasetStore.getState().load();
          }}
        />
      </div>
    );
  }

  return <Dashboard dataset={state.dataset} />;
}

/** Copies the current URL, which already encodes the active slice. */
function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <Button
      onClick={() => {
        void navigator.clipboard.writeText(window.location.href).then(() => setCopied(true));
      }}
      title="Copy a link to this exact slice"
    >
      {copied ? '✓ Copied' : '🔗 Copy link'}
    </Button>
  );
}

function Dashboard({ dataset }: { dataset: Dataset }) {
  const [view, setView] = useState<ViewId>(readViewFromUrl);
  const [railOpen, setRailOpen] = useState(false);

  const { shots, teamBaseline, totalShots } = useFilteredShots(dataset);

  const filters = useFilterStore();
  const activeFilters = countActiveFilters(filters);
  const resetFilters = useFilterStore((s) => s.reset);

  // Mirror the current slice into the address bar so it can be copied out.
  useEffect(() => writeUrl(filters, view), [filters, view]);

  const selectionLabel = useMemo(() => {
    if (activeFilters === 0) return `All ${int(totalShots)} shots`;
    return `${int(shots.length)} of ${int(totalShots)} shots and ${activeFilters} filter${activeFilters > 1 ? 's' : ''}`;
  }, [activeFilters, shots.length, totalShots]);

  return (
    <div className={styles.app}>
      <Header view={view} onViewChange={setView} />

      <div className={styles.body}>
        {railOpen && <div className={styles.scrim} onClick={() => setRailOpen(false)} aria-hidden="true" />}

        <FilterRail dataset={dataset} shots={shots} open={railOpen} onClose={() => setRailOpen(false)} />

        <main className={styles.content}>
          <div className={styles.contentHeader}>
            <div className={styles.selectionBlock}>
              <p className={styles.selection}>{selectionLabel}</p>
              {activeFilters > 0 && (
                <button type="button" className={styles.resetLink} onClick={resetFilters}>
                  Reset all filters
                </button>
              )}
            </div>
            <div className={styles.contentActions}>
              <CopyLinkButton />
              <Button
                onClick={() => setRailOpen(true)}
                title="Open filters"
                className={styles.filtersButton}
              >
                ☰ Filters{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </Button>
            </div>
          </div>

          {/* So that 1 failing panel will not blank the app. */}
          <ErrorBoundary fallbackTitle="This could not be rendered">
            {view === 'court' && <ShotChartView shots={shots} teamBaseline={teamBaseline} />}
            {view === 'efficiency' && <EfficiencyView shots={shots} />}
            {view === 'players' && (
              <PlayerCompareView shots={shots} teamBaseline={teamBaseline} />
            )}
          </ErrorBoundary>

          <footer className={styles.footer}>
            <span> Atharva Kirkole</span>
            <span className={styles.footerMeta}> project </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
