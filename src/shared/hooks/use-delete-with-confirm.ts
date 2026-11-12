import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HAS_DEPENDENTS, type DeleteParams } from '@/shared/api/delete';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';

interface DeleteMutationLike {
  mutateAsync: (params: DeleteParams) => Promise<unknown>;
}

/**
 * The two-step delete protocol (doc §1.5): confirm → delete → if the server
 * answers `-1` (has dependents) confirm again → delete with `forceDelete`.
 * Errors are toasted by the global mutation handler.
 */
export function useDeleteWithConfirm(ns: string, mutation: DeleteMutationLike) {
  const { t } = useTranslation(ns);

  return useCallback(
    async function deleteWithConfirm(
      id: number | string,
      description?: string,
    ) {
      const ok = await confirm({
        title: t('common.deleteConfirmTitle'),
        description: description ?? t('common.deleteConfirmDesc'),
        confirmText: t('common.delete'),
        cancelText: t('common.cancel'),
        destructive: true,
      });
      if (!ok) return false;

      try {
        const result = await mutation.mutateAsync({ id });
        if (result === HAS_DEPENDENTS) {
          const force = await confirm({
            title: t('common.deleteDependentsTitle'),
            description: t('common.deleteDependentsDesc'),
            confirmText: t('common.deleteAll'),
            cancelText: t('common.cancel'),
            destructive: true,
          });
          if (!force) return false;
          await mutation.mutateAsync({ id, forceDelete: true });
        }
        notify(t('common.deleted'), 'success');
        return true;
      } catch {
        return false;
      }
    },
    [t, mutation],
  );
}
