import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EnrollmentType, PackageType } from '@/shared/api/enums';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import { Spinner } from '@/shared/components/ui/spinner';
import { notify } from '@/shared/lib/notify';
import { useUpdateOrderResult } from '@/modules/reservations/api/orders';
import type { ReservationDetails } from '@/modules/reservations/api/types';

/**
 * "Update result" on a completed order (Missing Items §12.3): fit / unfit,
 * plus Enroll / Unenroll — chosen by the user, never derived from the fit
 * result — when the package covers both exams and academy services.
 */
export function UpdateResultDialog({
  order,
  open,
  onClose,
}: {
  order: Pick<ReservationDetails, 'id' | 'isfit' | 'packageType'>;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('updateResult.title', { id: order.id })}
    >
      {open && <UpdateResultForm order={order} onDone={onClose} />}
    </EntityFormDialog>
  );
}

function UpdateResultForm({
  order,
  onDone,
}: {
  order: Pick<ReservationDetails, 'id' | 'isfit' | 'packageType'>;
  onDone: () => void;
}) {
  const { t } = useTranslation('reservations');
  const asksEnrollment = order.packageType === PackageType.Both;
  const [isFit, setIsFit] = useState(order.isfit);
  const [enrollment, setEnrollment] = useState<number | null>(null);
  const [showError, setShowError] = useState(false);
  const update = useUpdateOrderResult();

  const submit = async () => {
    if (asksEnrollment && enrollment === null) return setShowError(true);
    try {
      await update.mutateAsync({
        reservationId: order.id,
        isFit,
        enrollmentType: asksEnrollment
          ? (enrollment ?? EnrollmentType.None)
          : EnrollmentType.None,
      });
      notify(t('updateResult.done'), 'success');
      onDone();
    } catch {
      // Toasted globally.
    }
  };

  return (
    <div className='flex flex-col gap-5 py-2'>
      <fieldset className='flex flex-col gap-2'>
        <legend className='mb-2 text-sm font-bold'>
          {t('complete.fitLabel')}
        </legend>
        <RadioGroup
          value={isFit ? 'fit' : 'unfit'}
          onValueChange={(v) => setIsFit(v === 'fit')}
          className='flex gap-6'
        >
          {(['fit', 'unfit'] as const).map((v) => (
            <div key={v} className='flex items-center gap-2'>
              <RadioGroupItem id={`ur-${v}`} value={v} />
              <Label htmlFor={`ur-${v}`}>{t(`drawer.${v}`)}</Label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      {asksEnrollment && (
        <fieldset className='flex flex-col gap-2'>
          <legend className='mb-2 text-sm font-bold'>
            {t('updateResult.enrollment')}
            <span className='text-destructive'>*</span>
          </legend>
          <RadioGroup
            value={enrollment === null ? '' : String(enrollment)}
            onValueChange={(v) => {
              setEnrollment(Number(v));
              setShowError(false);
            }}
            className='flex gap-6'
          >
            {(
              [
                [EnrollmentType.Enroll, 'enroll'],
                [EnrollmentType.Unenroll, 'unenroll'],
              ] as const
            ).map(([value, key]) => (
              <div key={key} className='flex items-center gap-2'>
                <RadioGroupItem id={`ur-${key}`} value={String(value)} />
                <Label htmlFor={`ur-${key}`}>{t(`updateResult.${key}`)}</Label>
              </div>
            ))}
          </RadioGroup>
          <p className='text-ink-2 text-small'>
            {t('updateResult.enrollmentHint')}
          </p>
          {showError && (
            <p role='alert' className='text-down text-small'>
              {t('updateResult.enrollmentRequired')}
            </p>
          )}
        </fieldset>
      )}

      <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
        <Button
          variant='secondary'
          onClick={onDone}
          disabled={update.isPending}
        >
          {t('actions.close')}
        </Button>
        <Button onClick={() => void submit()} disabled={update.isPending}>
          {update.isPending && <Spinner />}
          {t('updateResult.submit')}
        </Button>
      </div>
    </div>
  );
}
