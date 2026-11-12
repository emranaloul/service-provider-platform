import { endOfDay, isValid, parse, startOfDay } from 'date-fns';
import {
  OrderStatus,
  RequestChannel,
  RequestFunding,
} from '@/shared/api/enums';
import { combineFlags, splitFlags } from '@/shared/lib/bit-flags';

/** Channel filter values, kept in `?channel=`. */
export const CHANNELS: readonly RequestChannel[] =
  Object.values(RequestChannel);
/** Funding filter values, kept in `?funding=`. */
export const FUNDINGS: readonly RequestFunding[] =
  Object.values(RequestFunding);

const pick = <T extends number>(
  values: readonly T[],
  raw: string | null,
): T | undefined => {
  if (!raw) return undefined;
  const n = Number(raw);
  return values.find((v) => v === n);
};

/** `?channel=` → a known `RequestChannel`, else `undefined` (all). */
export const parseChannel = (raw: string | null) => pick(CHANNELS, raw);

/** `?funding=` → a known `RequestFunding`, else `undefined` (all). */
export const parseFunding = (raw: string | null) => pick(FUNDINGS, raw);

/** ID numbers are digits only; anything else typed is dropped. */
export const digitsOnly = (value: string) => value.replace(/\D/g, '');

/** Every URL param the reservations filters write (not view/week/drawer). */
export const ORDER_FILTER_PARAMS = [
  'q',
  'status',
  'date',
  'branch',
  'fit',
  'channel',
  'funding',
  'idn',
  'city',
  'phone',
  'from',
  'to',
  'excl',
] as const;

/** The less-used filters, behind "More filters". */
export const MORE_FILTER_PARAMS = [
  'funding',
  'idn',
  'city',
  'phone',
  'from',
  'to',
  'excl',
] as const;

/** How many of `keys` hold a value (`all` and empty count as unset). */
export const countActiveFilters = (
  params: URLSearchParams,
  keys: readonly string[],
) =>
  keys.filter((k) => {
    const v = params.get(k);
    return v !== null && v !== '' && v !== 'all';
  }).length;

/** A `useListParams().update` patch that removes every filter param. */
export const clearFiltersPatch = (): Record<string, null> =>
  Object.fromEntries(ORDER_FILTER_PARAMS.map((k) => [k, null]));

/** Every order status, in bit order — the excluded-statuses choices. */
export const ORDER_STATUSES: readonly OrderStatus[] =
  Object.values(OrderStatus);

const ALL_STATUS_BITS = combineFlags(ORDER_STATUSES);

/**
 * `?excl=` → the sum of the excluded status bits, keeping only known bits;
 * missing, junk or empty (0) → `undefined`, so the API default applies.
 */
export function parseExcludedStatus(raw: string | null): number | undefined {
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const mask = Number(raw) & ALL_STATUS_BITS;
  return mask === 0 ? undefined : mask;
}

/** The statuses set in an excluded-status mask, in bit order. */
export const excludedStatuses = (mask: number | undefined): OrderStatus[] =>
  mask === undefined ? [] : splitFlags(mask, ORDER_STATUSES);

/** Adds or removes one status; an empty result → `null` (drop the param). */
export function toggleExcludedStatus(
  mask: number | undefined,
  status: OrderStatus,
  on: boolean,
): string | null {
  const next = on ? (mask ?? 0) | status : (mask ?? 0) & ~status;
  return next === 0 ? null : String(next);
}

/** `?from=` / `?to=` hold `yyyy-MM-dd`; anything else is ignored. */
export function parseDayParam(raw: string | null): string | undefined {
  if (!raw) return undefined;
  const d = parse(raw, 'yyyy-MM-dd', new Date());
  return isValid(d) ? raw : undefined;
}

/**
 * The `from` / `to` range for the API: local start of the first day and
 * local end of the last, as UTC ISO strings (appointments are stored in
 * UTC — the same convention as the calendar's `weekRange`).
 */
export function dayRangeToUtc(
  from: string | undefined,
  to: string | undefined,
): { from?: string; to?: string } {
  const day = (v: string) => parse(v, 'yyyy-MM-dd', new Date());
  return {
    from: from ? startOfDay(day(from)).toISOString() : undefined,
    to: to ? endOfDay(day(to)).toISOString() : undefined,
  };
}
