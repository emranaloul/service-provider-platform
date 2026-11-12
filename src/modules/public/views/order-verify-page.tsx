import { useEffect, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import { errorMessage, toApiError } from '@/shared/api/api-error';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import type { Lang } from '@/shared/types/lang';
import { AuthLayout } from '@/modules/auth/_components/auth-layout';
import { publicOrderQuery } from '@/modules/reservations/api/public-order';
import {
  OrderDetails,
  OrderNotFound,
  OrderVerifySkeleton,
} from '@/modules/public/_components/order-details';

/** `langId` in the scanned link: 1 = English, 2 = Arabic. */
const LANG_BY_ID: Partial<Record<string, Lang>> = { '1': 'en', '2': 'ar' };

/**
 * Public QR verification (`/public/orderscantoverify/:id/:langId`): who the
 * booking is for, where and when, and what was booked. No sign-in needed.
 */
export function OrderVerifyPage() {
  const { t, i18n } = useTranslation('public');
  const { id = '', langId } = useParams();
  const query = useQuery({ ...publicOrderQuery(id), enabled: !!id });

  // The link carries the language it was issued in: apply it once.
  const linkLang = langId ? LANG_BY_ID[langId] : undefined;
  useEffect(() => {
    if (linkLang) void i18n.changeLanguage(linkLang);
  }, [linkLang, i18n]);

  let body: ReactNode;
  if (!id || (query.isSuccess && !query.data)) {
    body = <OrderNotFound />;
  } else if (query.isPending) {
    body = <OrderVerifySkeleton />;
  } else if (query.isError) {
    body = toApiError(query.error).isNotFound ? (
      <OrderNotFound />
    ) : (
      <Alert variant='destructive'>
        <AlertCircle />
        <AlertTitle>{t('verify.errorTitle')}</AlertTitle>
        <AlertDescription>
          <p>{errorMessage(query.error)}</p>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void query.refetch()}
            className='mt-1'
          >
            {t('common.retry', { ns: 'shell' })}
          </Button>
        </AlertDescription>
      </Alert>
    );
  } else {
    body = <OrderDetails order={query.data} />;
  }

  return <AuthLayout>{body}</AuthLayout>;
}
