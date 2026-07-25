/**
 * Theme: dark (default) or light. Stamped as `data-theme` on <html> (what the
 * token sheet keys off) and persisted to localStorage. Storage writes are
 * guarded - private-mode Safari throws, and a theme pref isn't worth crashing on.
 */

import { useEffect } from 'react';
import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'kings-shot-lab:theme';

function readStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage unavailable -- fall through to the default.
  }
  return 'dark';
}

function persist(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }
}

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: readStoredTheme(),
  setMode: (mode) => {
    persist(mode);
    set({ mode });
  },
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    persist(next);
    set({ mode: next });
  },
}));

/** Applies the mode to <html>. Mounted once at the app root. */
export function useApplyTheme(): void {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);
}
