

import { useEffect } from 'react';
import { create } from 'zustand';

import { decodeDataset } from './decode';
import type { Dataset } from './types';

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

export function useDataset(): LoadState {
  const state = useDatasetStore((s) => s.state);
  const load = useDatasetStore((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return state;
}
