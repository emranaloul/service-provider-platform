import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { toFormData, type FormValue } from '@/shared/api/form-data';
import { apiGet, apiPut, currentCulture } from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import type { BranchVaccine } from '@/modules/branches/api/types';
import { orderKeys } from '@/modules/reservations/api/orders';
import type { Order } from '@/modules/reservations/api/types';

/** Adding, swapping or removing vaccines on a reservation (missing items §5). */

export interface AllowedVaccines {
  reservationId: string;
  source: unknown;
  vaccines: { id: number; name: string; price: number }[];
}

export const allowedVaccinesQuery = (reservationId: string) =>
  queryOptions({
    queryKey: [
      ...orderKeys.detail(reservationId),
      'allowedVaccines',
      currentCulture(),
    ],
    queryFn: ({ signal }) =>
      apiGet<AllowedVaccines>('Reservation/Reservation/AllowedVaccines', {
        signal,
        params: { ReservationId: reservationId },
      }),
  });

/** Slot-time options for one vaccine at the order's branch. */
export const vaccineSlotTimesQuery = (
  branchId: number,
  vaccineId: number | null,
) =>
  queryOptions({
    queryKey: ['orderVaccineSlots', branchId, vaccineId, currentCulture()],
    queryFn: ({ signal }) =>
      apiGet<PagedResponse<BranchVaccine>>(
        'Provider/ServiceProviderBranchVaccine/List?',
        {
          signal,
          params: { ServiceProviderBranchId: branchId, VaccineId: vaccineId },
        },
      ).then((page) =>
        (page?.data ?? []).flatMap((v) =>
          (v.slotTimes ?? []).map((s) => ({
            value: s.serviceProviderBranchSlotTimeId,
            from: s.timeFrom,
            to: s.timeTo,
          })),
        ),
      ),
    enabled: vaccineId !== null,
  });

/** A new vaccine row; changing its vaccine must clear its slot time. */
export interface NewVaccineRow {
  vaccineId: number | null;
  slotTimeId: number | null;
}

export interface OrderVaccineEdit {
  /** `reservationVaccines[].id` of the rows being removed. */
  removedIds: number[];
  added: NewVaccineRow[];
}

const completeRows = (rows: readonly NewVaccineRow[]) =>
  rows.filter(
    (r): r is { vaccineId: number; slotTimeId: number } =>
      r.vaccineId !== null && r.slotTimeId !== null,
  );

/**
 * "The last remaining item cannot be removed": with no services or service
 * groups on the reservation, at least one vaccine must stay.
 */
export function orderVaccinesError(
  order: Pick<Order, 'reservationServices' | 'reservationVaccines'>,
  edit: OrderVaccineEdit,
): 'lastItem' | null {
  const rs = order.reservationServices;
  const hasServices =
    !!rs && (rs.services.length > 0 || rs.groupServices.length > 0);
  if (hasServices) return null;
  const kept = (order.reservationVaccines ?? []).filter(
    (v) => !edit.removedIds.includes(v.id),
  ).length;
  return kept + completeRows(edit.added).length > 0 ? null : 'lastItem';
}

/**
 * `PUT Reservation/Update` body, or `null` when nothing changed (then do
 * not call the API). Rows missing a vaccine or a slot time are ignored.
 */
export function orderVaccinesPayload(
  reservationId: string,
  edit: OrderVaccineEdit,
): Record<string, FormValue> | null {
  const added = completeRows(edit.added).map((r) => ({
    vaccineId: r.vaccineId,
    slotTimeId: r.slotTimeId,
    isDeleted: false,
  }));
  const removed = edit.removedIds.map((id) => ({
    id,
    vaccineId: 0,
    slotTimeId: 0,
    isDeleted: true,
  }));
  if (!added.length && !removed.length) return null;
  return {
    Id: reservationId,
    ReservationVaccines: [...added, ...removed],
    // Literal "null": the services stay as they are.
    ReservationServices: 'null',
  };
}

export function useUpdateOrderVaccines() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservationId,
      edit,
    }: {
      reservationId: string;
      edit: OrderVaccineEdit;
    }) => {
      const body = orderVaccinesPayload(reservationId, edit);
      return body
        ? apiPut<number>('Reservation/Reservation/Update', toFormData(body))
        : Promise.resolve(null);
    },
    onSuccess: (_d, { reservationId }) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: orderKeys.lists() }),
        qc.invalidateQueries({ queryKey: orderKeys.detail(reservationId) }),
      ]),
  });
}
