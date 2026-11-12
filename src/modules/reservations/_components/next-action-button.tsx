import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/lib/notify';
import { useChangeOrderStatus } from '@/modules/reservations/api/orders';
import type { Order } from '@/modules/reservations/api/types';
import { nextStep, STEP_STATUS } from '@/modules/reservations/lib/order-rules';
import { useOrderActions } from '@/modules/reservations/lib/use-order-actions';

/** A table row's one primary action, if the user may take it. */
export function NextActionButton({
  order,
  onComplete,
}: {
  order: Order;
  onComplete: (order: Order) => void;
}) {
  const { t } = useTranslation('reservations');
  const actions = useOrderActions(order);
  const change = useChangeOrderStatus();
  const step = nextStep(order.status, actions);
  if (!step) return null;

  const run = async () => {
    if (step === 'complete') return onComplete(order);
    try {
      await change.mutateAsync({ id: order.id, status: STEP_STATUS[step] });
      notify(t('actions.statusChanged'), 'success');
    } catch {
      // Toasted globally.
    }
  };

  return (
    <Button
      size='sm'
      variant={step === 'checkIn' ? 'default' : 'outline'}
      disabled={change.isPending}
      onClick={(e) => {
        // The row itself opens the drawer.
        e.stopPropagation();
        void run();
      }}
    >
      {t(`next.${step}`)}
    </Button>
  );
}
