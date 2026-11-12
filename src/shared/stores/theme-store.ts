import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const THEMES = ['light', 'dark', 'system'] as const;
export type Theme = (typeof THEMES)[number];

/** The theme actually painted — `system` resolves to one of these. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'sp-theme';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    { name: STORAGE_KEY },
  ),
);

export function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return prefersDark() ? 'dark' : 'light';
  return theme;
}

/** Tailwind's `dark:` variant is driven by this class (see `@custom-variant dark`). */
export function applyThemeClass(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}
