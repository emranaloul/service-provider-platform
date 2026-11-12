import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/components/ui/button-variants';
import {
  getSnapshot,
  settle,
  subscribe,
} from '@/shared/lib/confirm-controller';

export type { ConfirmOptions } from '@/shared/lib/confirm-controller';

/** Single host for imperative `confirm()` calls. Mount once near the app root. */
export function ConfirmHost() {
  const { t } = useTranslation();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);

  return (
    <AlertDialog
      open={snapshot.open}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {snapshot.title ??
              t('common.confirmTitle', { defaultValue: 'Confirm' })}
          </AlertDialogTitle>
          {snapshot.description && (
            <AlertDialogDescription>
              {snapshot.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => settle(false)}>
            {snapshot.cancelText ??
              t('common.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              snapshot.destructive &&
                buttonVariants({ variant: 'destructive' }),
            )}
            onClick={() => settle(true)}
          >
            {snapshot.confirmText ??
              t('common.confirm', { defaultValue: 'Confirm' })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
