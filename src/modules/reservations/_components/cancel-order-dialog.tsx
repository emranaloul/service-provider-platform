import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { OrderStatus } from '@/shared/api/enums';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { notify } from '@/shared/lib/notify';
import { useChangeOrderStatus } from '@/modules/reservations/api/orders';
import { changeStatusError } from '@/modules/reservations/lib/order-rules';

/** Cancel with a required reason (doc §13.4, `CancelationReson`). */
export function CancelOrderDialog({
  orderId,
  open,
  onClose,
}: {
  orderId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('reservations');
  const [reason, setReason] = useState('');
  const [showError, setShowError] = useState(false);
  const change = useChangeOrderStatus();

  const submit = async () => {
    const input = {
      id: orderId,
      status: OrderStatus.Cancel,
      cancelationReason: reason,
    };
    if (changeStatusError(input)) return setShowError(true);
    try {
      await change.mutateAsync(input);
      notify(t('cancel.done'), 'success');
      setReason('');
      onClose();
    } catch {
      // Toasted globally.
    }
  };

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('cancel.title', { id: orderId })}
    >
      <div className='flex flex-col gap-4 py-2'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='cancel-reason'>
            {t('cancel.reason')}
            <span className='text-destructive'>*</span>
          </Label>
          <Textarea
            id='cancel-reason'
            value={reason}
            aria-invalid={showError && !reason.trim()}
            onChange={(e) => {
              setReason(e.target.value);
              setShowError(false);
            }}
          />
          {showError && !reason.trim() && (
            <p role='alert' className='text-down text-small'>
              {t('cancel.required')}
            </p>
          )}
        </div>
        <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
          <Button
            variant='secondary'
            onClick={onClose}
            disabled={change.isPending}
          >
            {t('cancel.keep')}
          </Button>
          <Button
            variant='destructive'
            onClick={() => void submit()}
            disabled={change.isPending}
          >
            {change.isPending && <Spinner />}
            {t('cancel.confirm')}
          </Button>
        </div>
      </div>
    </EntityFormDialog>
  );
}
