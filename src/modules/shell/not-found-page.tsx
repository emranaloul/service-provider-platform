import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className='bg-background flex min-h-screen flex-col items-center justify-center gap-2.5 px-4 text-center'>
      <h1 className='text-h2 font-semibold'>{t('common.notFound')}</h1>
      <p className='text-ink-muted max-w-md'>{t('common.notFoundDesc')}</p>
      <Button asChild className='mt-2'>
        <Link to='/'>{t('shell.goHome')}</Link>
      </Button>
    </div>
  );
}
