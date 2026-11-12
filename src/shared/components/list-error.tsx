import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { errorMessage } from '@/shared/api/api-error';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';

/** Load-error state: the backend's message when it sent one, and a retry. */
export function ListError({
  error,
  onRetry,
}: {
  error?: unknown;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Alert variant='destructive'>
      <AlertCircle />
      <AlertTitle>{t('common.errorTitle')}</AlertTitle>
      <AlertDescription>
        {error !== undefined && <p>{errorMessage(error)}</p>}
        <Button variant='outline' size='sm' onClick={onRetry} className='mt-1'>
          {t('common.retry')}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
