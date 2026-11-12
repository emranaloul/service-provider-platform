import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './shared/i18n';
import './shared/i18n/modules';
import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import {
  applyThemeClass,
  resolveTheme,
  useThemeStore,
} from '@/shared/stores/theme-store';

// Paint the stored theme before the first render so there's no light flash.
applyThemeClass(resolveTheme(useThemeStore.getState().theme));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);
