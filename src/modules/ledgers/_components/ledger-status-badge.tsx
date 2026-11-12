import { useTranslation } from 'react-i18next';
import type { LedgerStatus } from '@/shared/api/enums';
import { StatusBadge } from '@/shared/components/status-badge';
import { LEDGER_STATUS } from '@/modules/ledgers/lib/ledger-status';

/** Paid / Unpaid pill: dot + word, never colour alone. */
export function LedgerStatusBadge({ status }: { status: LedgerStatus }) {
  const { t } = useTranslation('ledgers');
  const s = LEDGER_STATUS[status];
  if (!s) return <span>—</span>;
  return <StatusBadge variant={s.variant} label={t(`status.${s.key}`)} />;
}
