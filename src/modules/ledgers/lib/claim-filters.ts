import {
  parseUtcDate,
  toDateOnly,
} from '@/shared/components/layout/form/date-utils';

/**
 * Claim-tab filters in the URL (doc §14.1). Multi-selects (`ServiceIds`,
 * `ServiceGroupIds`) are kept as comma-separated ids, e.g. `?services=3,7`.
 */

/** Positive integer ids from a comma-separated param, deduped, in order. */
export function parseIdList(value: string | null | undefined): number[] {
  if (!value) return [];
  const ids: number[] = [];
  for (const part of value.split(',')) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) continue;
    const id = Number(trimmed);
    if (id > 0 && Number.isSafeInteger(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** The param for these ids, or `null` (removes the param) when none. */
export function formatIdList(ids: readonly number[]): string | null {
  return ids.length > 0 ? ids.join(',') : null;
}

/** Adds or removes one id, keeping the order of the rest. */
export function toggleId(
  ids: readonly number[],
  id: number,
  checked: boolean,
): number[] {
  if (!checked) return ids.filter((x) => x !== id);
  return ids.includes(id) ? [...ids] : [...ids, id];
}

/** A positive integer id from a param, else `undefined` ("all"). */
export function parseId(value: string | null | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined;
  const id = Number(value.trim());
  return id > 0 && Number.isSafeInteger(id) ? id : undefined;
}

export const CLAIM_PARAMS = [
  'q',
  'from',
  'to',
  'dialog',
  'page',
  'branch',
  'services',
  'groups',
] as const;
export type ClaimParam = (typeof CLAIM_PARAMS)[number];

/**
 * URL keys of the claim UI. On its own screen it uses the plain names; when
 * embedded in another page (`prefix`, e.g. `claim` on the branch page) every
 * key is prefixed so it can't clash with that page's own `tab`, `page`, … —
 * `claimQ`, `claimFrom`, `claimPage`, …
 */
export function claimParamKeys(prefix?: string): Record<ClaimParam, string> {
  return Object.fromEntries(
    CLAIM_PARAMS.map((k) => [
      k,
      prefix ? `${prefix}${k[0].toUpperCase()}${k.slice(1)}` : k,
    ]),
  ) as Record<ClaimParam, string>;
}

/** A patch that removes every claim param (for tab switches). */
export function clearClaimParams(prefix?: string): Record<string, null> {
  return Object.fromEntries(
    Object.values(claimParamKeys(prefix)).map((k) => [k, null]),
  );
}

/**
 * The claim's context query (§14.1 "The Claim URL carries the current context
 * query"): the branch when the claim is made from a branch page, else the
 * provider.
 */
export function claimContext(
  serviceProviderId: number | null,
  branchId?: number,
): Record<string, number | undefined> {
  return branchId
    ? { ServiceProviderBranchId: branchId }
    : { ServiceProviderId: serviceProviderId ?? undefined };
}

/** UTC timestamp → the local `yyyy-MM-dd` the date filters use. */
export const toLocalDay = (iso: string | null) =>
  iso ? toDateOnly(parseUtcDate(iso)) : null;

/** The Ledgers tab of the Claims screen, filtered to a claimed period. */
export function claimedLedgersUrl(period: {
  from: string | null;
  to: string | null;
}): string {
  const q = new URLSearchParams({ tab: 'ledgers' });
  const from = toLocalDay(period.from);
  const to = toLocalDay(period.to);
  if (from) q.set('from', from);
  if (to) q.set('to', to);
  return `/ledgers?${q.toString()}`;
}
