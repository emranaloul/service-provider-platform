import { OrderStatus, UserType } from '@/shared/api/enums';
import { combineFlags } from '@/shared/lib/bit-flags';
import type { FormValue } from '@/shared/api/form-data';
import type { Order, ServiceQuestion } from '@/modules/reservations/api/types';

/** Provider users hide cancelled and no-show orders by default (§13.2). */
export const PROVIDER_EXCLUDED_STATUS = combineFlags([
  OrderStatus.Cancel,
  OrderStatus.NoShow,
]);

/**
 * Which order actions a user may take (doc §13.4). Permission checks for
 * the company / company-extended areas are passed in as booleans.
 */
export interface OrderActionContext {
  groupId: UserType | null;
  canChangeStatus: boolean; // company: change-status:company-orders
  canComplete: boolean; // company: complete:company-orders
  canCancel: boolean; // company: cancel:company-orders
  canUpdateVaccines: boolean; // company-extended: update:order-vaccines
}

const isAdminOrProvider = (g: UserType | null) =>
  g === UserType.Admin || g === UserType.Provider;

const CHANGEABLE: readonly OrderStatus[] = [
  OrderStatus.New,
  OrderStatus.Accept,
  OrderStatus.CheckIn,
  OrderStatus.InProgress,
];

export function orderActions(
  order: Pick<Order, 'status' | 'isClaimedByProvider'>,
  ctx: OrderActionContext,
) {
  const staff = isAdminOrProvider(ctx.groupId);
  const s = order.status;
  return {
    /** Only CheckIn and InProgress are offered as targets. */
    changeStatus: staff && ctx.canChangeStatus && CHANGEABLE.includes(s),
    complete:
      staff &&
      ctx.canComplete &&
      (s === OrderStatus.InProgress || s === OrderStatus.Delayed),
    editResult: staff && ctx.canComplete && s === OrderStatus.Complete,
    cancel:
      ctx.canCancel && s !== OrderStatus.Cancel && s !== OrderStatus.Reject,
    updateVaccines:
      staff &&
      ctx.canUpdateVaccines &&
      s !== OrderStatus.Cancel &&
      !order.isClaimedByProvider,
    /** Anyone who can see the order. */
    copyQrLink: true,
  };
}

/** A money input: a number ≥ 0 (decimals allowed), else `null`. */
export function parseMoney(value: string): number | null {
  const v = value.trim();
  if (!v || !/^\d+(\.\d+)?$/.test(v)) return null;
  return Number(v);
}

export type NextStep = 'checkIn' | 'start' | 'complete';

/**
 * The one primary action for an order row: Check in (New / Accepted),
 * Start (Checked in), or Record result (In progress / Delayed).
 */
export function nextStep(
  status: OrderStatus,
  actions: Pick<ReturnType<typeof orderActions>, 'changeStatus' | 'complete'>,
): NextStep | null {
  if (
    actions.changeStatus &&
    (status === OrderStatus.New || status === OrderStatus.Accept)
  ) {
    return 'checkIn';
  }
  if (actions.changeStatus && status === OrderStatus.CheckIn) return 'start';
  if (actions.complete) return 'complete';
  return null;
}

/** Status sent for a "change status" step. */
export const STEP_STATUS: Record<'checkIn' | 'start', OrderStatus> = {
  checkIn: OrderStatus.CheckIn,
  start: OrderStatus.InProgress,
};

/** Display names of what was booked: group names, then single services. */
export function orderServiceNames(o: Pick<Order, 'reservationServices'>) {
  const rs = o.reservationServices;
  if (!rs) return [];
  return [
    ...rs.groupServices.map((g) => g.serviceGroupName),
    ...rs.services.map((s) => s.serviceName),
  ];
}

/**
 * A-Z §13.4: while the order is New, Accepted, Checked in or In progress,
 * "Change status" offers Check-in and In progress — minus the status it
 * already has.
 */
export function statusTargets(status: OrderStatus): OrderStatus[] {
  if (!CHANGEABLE.includes(status)) return [];
  return STATUS_TARGETS.filter((s) => s !== status);
}

/** Status targets offered by "Change status" (§13.4). */
export const STATUS_TARGETS = [OrderStatus.CheckIn, OrderStatus.InProgress];

/** `{appOrigin}/public/orderscantoverify/{orderId}/{langId}` (§13.4). */
export const orderQrLink = (
  orderId: string,
  langId: number,
  origin = window.location.origin,
) => `${origin}/public/orderscantoverify/${orderId}/${langId}`;

// ── Change status ───────────────────────────────────────────────────────────

export interface ChangeStatusInput {
  id: string;
  status: OrderStatus;
  /** Required when cancelling. */
  cancelationReason?: string;
  /** Required when rejecting. */
  rejectionReason?: string;
}

/** Returns the field that is missing, or `null` when the input is valid. */
export function changeStatusError(
  v: ChangeStatusInput,
): 'cancelationReason' | 'rejectionReason' | null {
  if (v.status === OrderStatus.Cancel && !v.cancelationReason?.trim()) {
    return 'cancelationReason';
  }
  if (v.status === OrderStatus.Reject && !v.rejectionReason?.trim()) {
    return 'rejectionReason';
  }
  return null;
}

export const changeStatusPayload = (
  v: ChangeStatusInput,
): Record<string, FormValue> => ({
  Id: v.id,
  Status: v.status,
  // Backend spelling (§18.9).
  CancelationReson:
    v.status === OrderStatus.Cancel ? v.cancelationReason?.trim() : undefined,
  rejectionReason:
    v.status === OrderStatus.Reject ? v.rejectionReason?.trim() : undefined,
});

// ── Complete ────────────────────────────────────────────────────────────────

/** Every service on the order with its `reservationServiceId`. */
export function orderServices(order: Pick<Order, 'reservationServices'>) {
  const rs = order.reservationServices;
  if (!rs) return [];
  return [
    ...rs.services.map((s) => ({
      serviceId: s.id,
      reservationServiceId: s.reservationServiceId,
    })),
    ...rs.groupServices.flatMap((g) =>
      g.services.map((s) => ({
        serviceId: s.id,
        reservationServiceId: s.reservationServiceId,
      })),
    ),
  ];
}

export interface OrderQuestion extends ServiceQuestion {
  reservationServiceId: number;
}

/**
 * Maps each catalogue question to the reservation service it belongs to, so
 * every answer is grouped under the right reservation service (§13.4).
 */
export function questionsForOrder(
  order: Pick<Order, 'reservationServices'>,
  questions: readonly ServiceQuestion[],
): OrderQuestion[] {
  const services = orderServices(order);
  return questions.flatMap((q) =>
    services
      .filter((s) => s.serviceId === q.serviceId)
      .map((s) => ({ ...q, reservationServiceId: s.reservationServiceId })),
  );
}

export interface CompleteInput {
  id: string;
  note: string;
  isFit: boolean;
  /** key = `${reservationServiceId}:${questionId}` → answer. */
  answers: Record<string, string>;
  /** At least one is required. */
  files: File[];
}

export const answerKey = (
  q: Pick<OrderQuestion, 'reservationServiceId' | 'questionId'>,
) => `${q.reservationServiceId}:${q.questionId}`;

/** Missing required answers, and whether result files are missing. */
export function completeErrors(
  v: CompleteInput,
  questions: readonly OrderQuestion[],
) {
  return {
    unanswered: questions.filter(
      (q) => q.isRequired && !v.answers[answerKey(q)]?.trim(),
    ),
    noFiles: v.files.length === 0,
  };
}

export function completePayload(
  v: CompleteInput,
  questions: readonly OrderQuestion[],
): Record<string, FormValue> {
  const byService = new Map<
    number,
    { serviceQuestionId: number; answer: string }[]
  >();
  for (const q of questions) {
    const answer = v.answers[answerKey(q)]?.trim();
    if (!answer) continue;
    byService.set(q.reservationServiceId, [
      ...(byService.get(q.reservationServiceId) ?? []),
      { serviceQuestionId: q.questionId, answer },
    ]);
  }
  return {
    Id: v.id,
    Note: v.note.trim(),
    IsFit: v.isFit,
    ReservationService: [...byService].map(([id, answers]) => ({
      id,
      reservationServiceAnswer: answers,
    })),
    ResultAttachments: v.files,
  };
}
