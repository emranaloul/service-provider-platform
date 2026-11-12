import { useTranslation } from 'react-i18next';
import { Hammer } from 'lucide-react';
import { EmptyState } from '@/shared/components/empty-state';
import { Panel } from '@/shared/components/pulse';

/**
 * Stand-in for a screen that hasn't been built yet. `design` names the
 * board in docs/design/ that specifies it.
 */
export function PagePlaceholder({ design }: { design: string }) {
  const { t } = useTranslation();
  return (
    <Panel className='animate-enter'>
      <EmptyState
        icon={Hammer}
        title={t('common.comingSoon')}
        hint={`docs/design/${design}`}
      />
    </Panel>
  );
}
