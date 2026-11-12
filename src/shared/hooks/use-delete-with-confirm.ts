import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';

interface DeleteMutationLike {
  mutateAsync: (params: {
    id: number;
    forceDelete?: boolean;
  }) => Promise<unknown>;
}

/** Shared confirm() -> mutate -> notify() delete flow, parameterized by the module's i18n namespace. */
export function useDeleteWithConfirm(ns: string, mutation: DeleteMutationLike) {
  const { t } = useTranslation(ns);

  return useCallback(
    async function deleteWithConfirm(id: number) {
      const ok = await confirm({
        title: t('common.deleteConfirmTitle'),
        description: t('common.deleteConfirmDesc'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return;

      try {
        await mutation.mutateAsync({ id });
        notify(t('common.deleted'), 'success');
      } catch {}
    },
    [t, mutation],
  );
}
