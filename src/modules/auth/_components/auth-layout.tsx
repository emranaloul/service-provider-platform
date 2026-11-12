import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SegmentedControl } from '@/shared/components/pulse';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import type { Lang } from '@/shared/types/lang';

/** Centred card for the signed-out screens, with the language switch. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const lang = useUiLang();
  return (
    <div className='bg-canvas flex min-h-dvh flex-col'>
      <header className='flex items-center justify-between gap-3 px-4 py-4 md:px-8'>
        <div className='flex items-center gap-2.5'>
          <span
            aria-hidden
            className='hd bg-brand text-on-brand grid size-9 place-items-center rounded-md text-[17px] font-bold'
          >
            {t('appName').charAt(0)}
          </span>
          <span className='flex flex-col leading-snug'>
            <span className='hd text-[15px] font-bold'>{t('appName')}</span>
            <span className='text-ink-2 text-xs'>{t('appSubtitle')}</span>
          </span>
        </div>
        <SegmentedControl<Lang>
          label={t('shell.language')}
          value={lang}
          onChange={(v) => void i18n.changeLanguage(v)}
          options={[
            { id: 'ar', label: 'ع' },
            { id: 'en', label: 'EN' },
          ]}
        />
      </header>
      <main className='flex flex-1 items-start justify-center px-4 pt-[8vh] pb-12'>
        <div className='bg-surface border-line shadow-card animate-enter w-full max-w-md rounded-2xl border p-6 md:p-8'>
          {children}
        </div>
      </main>
    </div>
  );
}
