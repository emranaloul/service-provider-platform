import { useEffect } from 'react';
import {
  applyThemeClass,
  resolveTheme,
  useThemeStore,
  type ResolvedTheme,
  type Theme,
} from '@/shared/stores/theme-store';

/**
 * Keeps `<html class="dark">` in sync with the stored preference, and follows
 * the OS setting live while the preference is `system`.
 */
export function useTheme(): {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
} {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const resolved = resolveTheme(theme);

  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  useEffect(() => {
    if (theme !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyThemeClass(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  return {
    theme,
    resolved,
    setTheme,
    // Toggling from `system` commits to the opposite of what's on screen.
    toggle: () => setTheme(resolved === 'dark' ? 'light' : 'dark'),
  };
}
