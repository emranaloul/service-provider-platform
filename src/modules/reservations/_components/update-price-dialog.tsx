import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { notify } from '@/shared/lib/notify';
import { useUpdateOrderPrice } from '@/modules/reservations/api/orders';
import type { ReservationDetails } from '@/modules/reservations/api/types';
import { parseMoney } from '@/modules/reservations/lib/order-rules';

type PricedOrder = Pick<
  ReservationDetails,
  'id' | 'isfit' | 'cost' | 'sellPrice'
>;

/**
 * "Update price" on a completed order (Blocked Items §2): provider cost and
 * customer price, prefilled from the order; decimals allowed, both ≥ 0.
 */
export function UpdatePriceDialog({
  order,
  open,
  onClose,
}: {
  order: PricedOrder;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('updatePrice.title', { id: order.id })}
    >
      {open && <UpdatePriceForm order={order} onDone={onClose} />}
    </EntityFormDialog>
  );
}

function UpdatePriceForm({
  order,
  onDone,
}: {
  order: PricedOrder;
  onDone: () => void;
}) {
  const { t } = useTranslation('reservations');
  const [cost, setCost] = useState(String(order.cost ?? 0));
  const [sellPrice, setSellPrice] = useState(String(order.sellPrice ?? 0));
  const [submitted, setSubmitted] = useState(false);
  const update = useUpdateOrderPrice();

  const costValue = parseMoney(cost);
  const sellValue = parseMoney(sellPrice);

  const submit = async () => {
    setSubmitted(true);
    if (costValue === null || sellValue === null) return;
    try {
      await update.mutateAsync({
        reservationId: order.id,
        // Resent unchanged, or the fit result would be overwritten.
        isFit: order.isfit,
        cost: costValue,
        sellPrice: sellValue,
      });
      notify(t('updatePrice.done'), 'success');
      onDone();
    } catch {
      // Toasted globally.
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    invalid: boolean,
  ) => (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={id}>
        {label}
        <span className='text-destructive'>*</span>
      </Label>
      <Input
        id={id}
        inputMode='decimal'
        dir='ltr'
        className='num'
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      />
      {invalid && (
        <p role='alert' className='text-down text-small'>
          {t('updatePrice.invalid')}
        </p>
      )}
    </div>
  );

  return (
    <div className='flex flex-col gap-5 py-2'>
      <div className='grid gap-4 sm:grid-cols-2'>
        {field(
          'up-cost',
          t('updatePrice.cost'),
          cost,
          setCost,
          submitted && costValue === null,
        )}
        {field(
          'up-sell',
          t('updatePrice.sellPrice'),
          sellPrice,
          setSellPrice,
          submitted && sellValue === null,
        )}
      </div>
      <p className='text-ink-2 text-small'>{t('updatePrice.hint')}</p>
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
          {t('updatePrice.submit')}
        </Button>
      </div>
    </div>
  );
}
