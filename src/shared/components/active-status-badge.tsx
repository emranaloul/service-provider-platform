// Keep consistent with status badge design system
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/shared/components/status-badge';

/** Generic active/inactive badge — pass the module's own i18n namespace via `ns`. */
export function ActiveStatusBadge({
  ns,
  active,
}: {
  ns: string;
  active: boolean;
}) {
  const { t } = useTranslation(ns);
  return (
    <StatusBadge
      variant={active ? 'green' : 'slate'}
      label={active ? t('common.active') : t('common.inactive')}
    />
  );
}
