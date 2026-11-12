import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useCurrentUser } from '@/shared/session/current-user';
import { dashboardBadges, dashboardQuery } from '@/modules/today/api/dashboard';
import { screenKeyOf } from '@/app/screens';
import { Sheet, SheetContent, SheetTitle } from '@/shared/components/ui/sheet';
import { SidebarContent } from '@/modules/shell/_components/sidebar';
import { Topbar } from '@/modules/shell/_components/topbar';

/**
 * App shell: Pulse sidebar (hero palette; a drawer under 1024px), top bar
 * with the screen's title, content capped at 90rem.
 */
export function AppLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const screenKey = screenKeyOf(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const badges = useNavBadges();

  return (
    <div className='flex h-dvh overflow-hidden'>
      <aside className='w-sidebar hidden flex-none lg:block'>
        <SidebarContent badges={badges} />
      </aside>
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side='right' className='w-sidebar border-0 p-0'>
          <SheetTitle className='sr-only'>{t('shell.mainNav')}</SheetTitle>
          <SidebarContent
            badges={badges}
            onNavigate={() => setMenuOpen(false)}
          />
        </SheetContent>
      </Sheet>
      <div className='flex min-w-0 flex-1 flex-col'>
        <Topbar
          title={screenKey ? t(`nav.${screenKey}`) : undefined}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main id='main' className='min-h-0 flex-1 overflow-auto'>
          <div
            key={screenKey}
            className='max-w-content mx-auto flex w-full flex-col gap-5 px-4 pt-6 pb-10 md:px-7.5'
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

/**
 * Sidebar count bubbles from the dashboard summary (no badge endpoints):
 * new reservations and claimable ones. Zero shows no bubble.
 */
function useNavBadges(): Partial<Record<string, number>> {
  const viewer = useCurrentUser();
  const summary = useQuery({
    ...dashboardQuery({}, viewer),
    enabled: !!viewer.user,
  }).data;
  if (!viewer.user) return {};
  const { reservations, claimable } = dashboardBadges(summary);
  return { reservations, ledgers: claimable };
}
