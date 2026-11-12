import { OrderStatus, UserType } from '@/shared/api/enums';
import { usePermissionFlagCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import type { Order } from '@/modules/reservations/api/types';
import { orderActions } from '@/modules/reservations/lib/order-rules';

/**
 * The actions the signed-in user may take on an order (doc §13.4), with the
 * company-area order bits and the company-extended vaccine bits (missing
 * items §1).
 */
export function useOrderActions(
  order: Pick<Order, 'status' | 'isClaimedByProvider'>,
) {
  const { groupId } = useCurrentUser();
  const can = usePermissionFlagCheck();
  return {
    ...orderActions(order, {
      groupId,
      canChangeStatus: can('change-status:company-orders'),
      canComplete: can('complete:company-orders'),
      canCancel: can('cancel:company-orders'),
      canUpdateVaccines: can('update:order-vaccines'),
    }),
    viewVaccines: can('view:order-vaccines'),
    viewDetails: can('view-details:company-orders'),
    /**
     * "Update result" (Missing Items §12.3): a Complete order, for Admin
     * users or holders of company `update:company-update-result`. Provider
     * roles rarely hold that bit, so providers only see it when granted.
     */
    updateResult:
      order.status === OrderStatus.Complete &&
      (groupId === UserType.Admin || can('update:company-update-result')),
    /** "Update price" (Blocked Items §2): same rule, its own bit (2^37). */
    updatePrice:
      order.status === OrderStatus.Complete &&
      (groupId === UserType.Admin || can('update:company-update-price')),
  };
}
