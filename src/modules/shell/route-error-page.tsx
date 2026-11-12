import { useTranslation } from 'react-i18next';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

/**
 * Top-level `errorElement` for the data router — a themed fallback instead
 * of a blank screen for render errors and router-thrown responses.
 */
export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className='bg-background flex min-h-screen flex-col items-center justify-center gap-2.5 px-4 text-center'>
      <span className='bg-danger-soft text-danger flex size-14 items-center justify-center rounded-full'>
        <TriangleAlert aria-hidden className='size-6' />
      </span>
      <h1 className='text-h2 font-semibold'>
        {notFound ? t('common.notFound') : t('common.errorTitle')}
      </h1>
      <p className='text-ink-muted max-w-md'>
        {notFound ? t('common.notFoundDesc') : t('common.errorDesc')}
      </p>
      <div className='mt-2 flex items-center gap-2'>
        {!notFound && (
          <Button variant='outline' onClick={() => window.location.reload()}>
            {t('common.reload')}
          </Button>
        )}
        <Button asChild>
          <Link to='/'>{t('shell.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
}
