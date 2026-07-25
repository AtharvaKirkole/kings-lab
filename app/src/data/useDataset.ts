/**
 * Dataset loading. Immutable and session-scoped, so it's fetched once into a
 * module-level store. Status is an explicit `idle | loading | ready | error`
 * union, forcing the UI to handle the failure branch rather than render blank.
 */

import { useEffect } from 'react';
import { create } from 'zustand';

import { decodeDataset } from './decode';
import type { Dataset } from './types';

/** Path is relative so the build works when served from a sub-path. */
const DATASET_URL = `${import.meta.env.BASE_URL}data/shots.json`;

export type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; dataset: Dataset }
  | { status: 'error'; message: string; detail?: string };

interface DatasetStore {
  state: LoadState;
  load: () => Promise<void>;
}

export const useDatasetStore = create<DatasetStore>((set, get) => ({
  state: { status: 'idle' },

  load: async () => {
    // Guard against React 18 StrictMode's double-invoked effects and any
    // accidental second mount kicking off a duplicate fetch.
    const current = get().state.status;
    if (current === 'loading' || current === 'ready') return;

    set({ state: { status: 'loading' } });

    try {
      const response = await fetch(DATASET_URL, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`Dataset request failed with HTTP ${response.status} ${response.statusText}`);
      }
      const dataset = decodeDataset(await response.json());
      set({ state: { status: 'ready', dataset } });
    } catch (error) {
      // The data itself is trusted (see decode.ts); this only guards the load
      // itself - a missing file or a dev server that isn't running.
      console.error('[dataset] load failed', error);
      set({
        state: {
          status: 'error',
          message: 'Could not load the shot dataset.',
          detail: 'Check that the dev server is running and app/public/data/shots.json exists (run `npm run data`).',
        },
      });
    }
  },
}));

/** Kicks off the one-time load and returns the current status. */
export function useDataset(): LoadState {
  const state = useDatasetStore((s) => s.state);
  const load = useDatasetStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
