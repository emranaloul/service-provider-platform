import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { resolveTheme, useThemeStore } from '@/shared/stores/theme-store';

/**
 * Themed toast host (guide §5.3 `CustomToast` → sonner). Mount once near the app
 * root. Colours read from the project theme tokens in `src/index.css`, so they
 * follow light/dark automatically. Emit toasts with the `notify` helper in
 * `@/shared/lib/notify` (keeps the old `CustomToast(title, type)` call ergonomics).
 *
 * `theme` follows the app's light/dark choice, so `richColors` toasts (error,
 * success…) use their dark palette in dark mode. The text colour is left to
 * each toast type — forcing `text-foreground` put light text on the light
 * error background.
 */
function Toaster({ ...props }: ToasterProps) {
  const theme = resolveTheme(useThemeStore((s) => s.theme));
  return (
    <Sonner
      theme={theme}
      className='toaster group'
      dir='auto'
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius-lg)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'font-sans rounded-xl! px-4! py-3! text-[13.5px]! font-bold! shadow-toast! border-0!',
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
