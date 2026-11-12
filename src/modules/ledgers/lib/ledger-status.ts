import { LedgerStatus } from '@/shared/api/enums';
import type { StatusBadgeVariant } from '@/shared/components/status-badge';
import { formatLocalDateTime } from '@/shared/lib/format';
import type { Lang } from '@/shared/types/lang';

/** i18n key (`status.<key>`) and badge tone of each ledger status (§2.4). */
export const LEDGER_STATUS: Record<
  LedgerStatus,
  { key: 'unpaid' | 'paid'; variant: StatusBadgeVariant }
> = {
  [LedgerStatus.UnPaid]: { key: 'unpaid', variant: 'warn' },
  [LedgerStatus.Paid]: { key: 'paid', variant: 'up' },
};

export const LEDGER_STATUSES: readonly LedgerStatus[] = [
  LedgerStatus.UnPaid,
  LedgerStatus.Paid,
];

/** `?status=` → a ledger status, or `undefined` for "all". */
export const parseLedgerStatus = (
  value: number | undefined,
): LedgerStatus | undefined => LEDGER_STATUSES.find((s) => s === value);

/** Claim tab / Ledgers tab, kept in `?tab=`. */
export type LedgersTab = 'claim' | 'ledgers';

/** `1 Oct 2026 – 31 Oct 2026` in the viewer's local time. */
export const formatPeriod = (
  from: string | null | undefined,
  to: string | null | undefined,
  lang: Lang,
) =>
  `${formatLocalDateTime(from, lang, false)} – ${formatLocalDateTime(to, lang, false)}`;
