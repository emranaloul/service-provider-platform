import { addDays, isValid, startOfDay } from 'date-fns';
import { OrderStatus } from '@/shared/api/enums';
import {
  fromDateOnly,
  parseUtcDate,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';
import type { Order } from '@/modules/reservations/api/types';

/** Reservations page views, kept in `?view=`. Table is the default. */
export const ORDER_VIEWS = ['table', 'board', 'calendar'] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const parseOrderView = (value: string | null): OrderView =>
  ORDER_VIEWS.find((v) => v === value) ?? 'table';

/** Result filter, kept in `?fit=`. */
export const FIT_FILTERS = ['all', 'fit', 'unfit'] as const;
export type FitFilter = (typeof FIT_FILTERS)[number];

export const parseFitFilter = (value: string | null): FitFilter =>
  FIT_FILTERS.find((v) => v === value) ?? 'all';

/** `fit` / `unfit` → the list's `isFit`; `all` → no filter. */
export const fitParam = (f: FitFilter): boolean | undefined =>
  f === 'all' ? undefined : f === 'fit';

/** Board columns, in workflow order. */
export const BOARD_COLUMNS = [
  { key: 'new', status: OrderStatus.New },
  { key: 'accepted', status: OrderStatus.Accept },
  { key: 'checkedIn', status: OrderStatus.CheckIn },
  { key: 'inProgress', status: OrderStatus.InProgress },
  { key: 'delayed', status: OrderStatus.Delayed },
  { key: 'completed', status: OrderStatus.Complete },
] as const;

export type BoardColumnKey = (typeof BOARD_COLUMNS)[number]['key'];

/** Orders per board column, each sorted by appointment time. */
export function groupByBoardColumn(
  orders: readonly Order[],
): Record<BoardColumnKey, Order[]> {
  const out = Object.fromEntries(
    BOARD_COLUMNS.map((c) => [c.key, [] as Order[]]),
  ) as Record<BoardColumnKey, Order[]>;
  for (const o of sortByAppointment(orders)) {
    const col = BOARD_COLUMNS.find((c) => c.status === o.status);
    if (col) out[col.key].push(o);
  }
  return out;
}

const appointmentTime = (o: Pick<Order, 'dateChosen'>) =>
  parseUtcDate(o.dateChosen).getTime();

export const sortByAppointment = (orders: readonly Order[]) =>
  [...orders].sort((a, b) => appointmentTime(a) - appointmentTime(b));

/** Saturday (local) on or before `date` — weeks start on Saturday. */
export function weekStartOf(date: Date): Date {
  const d = startOfDay(date);
  // getDay: Sun 0 … Sat 6 → days since Saturday.
  return addDays(d, -((d.getDay() + 1) % 7));
}

/** `?week=yyyy-MM-dd` → its week's Saturday; missing/invalid → this week. */
export function parseWeekParam(value: string | null, today = new Date()) {
  const date =
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromDateOnly(value) : null;
  return weekStartOf(date && isValid(date) ? date : today);
}

export const weekParam = (start: Date) => toDateOnly(start);

/** The 7 local days of the week starting at `start`. */
export const weekDays = (start: Date) =>
  Array.from({ length: 7 }, (_, i) => addDays(start, i));

/**
 * The week's bounds for the list's `from` / `to`: local midnight of the
 * first day to just before local midnight after the last, as UTC ISO
 * strings (appointments are stored in UTC).
 */
export function weekRange(start: Date) {
  const end = addDays(start, 7);
  return {
    from: start.toISOString(),
    to: new Date(end.getTime() - 1).toISOString(),
  };
}

/** Orders by local appointment day (`yyyy-MM-dd`), each sorted by time. */
export function groupByLocalDay(
  orders: readonly Order[],
): Map<string, Order[]> {
  const out = new Map<string, Order[]>();
  for (const o of sortByAppointment(orders)) {
    const date = parseUtcDate(o.dateChosen);
    if (!isValid(date)) continue;
    const key = toDateOnly(date);
    const list = out.get(key);
    if (list) list.push(o);
    else out.set(key, [o]);
  }
  return out;
}
