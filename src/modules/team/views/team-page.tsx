import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Upload, Users } from 'lucide-react';
import { ImportUsersDialog } from '@/modules/team/_components/import-users-dialog';
import { DataTable } from '@/shared/components/data-table';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import {
  Hero,
  HeroEyebrow,
  HeroFigure,
  HeroTitle,
  Panel,
} from '@/shared/components/pulse';
import { SearchBox } from '@/shared/components/search-box';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useDeleteWithConfirm } from '@/shared/hooks/use-delete-with-confirm';
import { useListParams } from '@/shared/hooks/use-list-params';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import {
  useDeleteUser,
  useResendSetPasswordLink,
  userListQuery,
} from '@/modules/team/api/users';
import { userColumns } from '@/modules/team/_components/user-columns';
import { UserFormSheet } from '@/modules/team/_components/user-form-sheet';

const PAGE_SIZE = 10;

/** Team (provider users) of the signed-in provider (missing items §2). */
export function TeamPage() {
  const { t } = useTranslation('team');
  const can = useSpPermissionCheck();
  const { groupId, serviceProviderId } = useCurrentUser();
  const { params, update, page } = useListParams();
  const canView = can('view:service-provider-users');

  // `?user=new` adds, `?user=<id>` edits: the drawer survives a refresh.
  const drawer = params.get('user');

  // Search box: typed locally, written to the URL once the user pauses.
  const [search, setSearch] = useState(params.get('q') ?? '');
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  useEffect(() => {
    if ((params.get('q') ?? '') !== debouncedSearch) {
      update({ q: debouncedSearch || null });
    }
    // Only the debounced value drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const list = useQuery({
    ...userListQuery(
      {
        pageNumber: page,
        pageSize: PAGE_SIZE,
        search: params.get('q') ?? undefined,
      },
      groupId,
      serviceProviderId,
    ),
    enabled: serviceProviderId !== null && canView,
  });
  const remove = useDeleteUser();
  const deleteWithConfirm = useDeleteWithConfirm('team', remove);
  const resendLink = useResendSetPasswordLink();

  const openDrawer = (value: string | null) =>
    update({ user: value }, { resetPage: false, push: true });

  // Memoised by the React Compiler.
  const columns = userColumns({
    t,
    can,
    onEdit: (u) => openDrawer(u.id),
    onResendLink: (u) =>
      resendLink.mutate(u.id, {
        onSuccess: () => notify(t('toast.linkSent'), 'success'),
      }),
    onDelete: (u) => void deleteWithConfirm(u.id),
  });

  const total = list.data?.totalRecords;

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-10 gap-y-6'>
        <div className='flex flex-[1_1_260px] flex-col gap-2.5'>
          <HeroEyebrow icon={<Users />}>{t('hero.eyebrow')}</HeroEyebrow>
          <HeroTitle>{t('hero.title')}</HeroTitle>
          <p className='text-hero-ink-2'>{t('subtitle')}</p>
        </div>
        <HeroFigure
          value={total ?? '—'}
          caption={t('hero.caption', { count: total ?? 0 })}
        />
      </Hero>

      {serviceProviderId === null && (
        <Alert variant='destructive'>
          <AlertDescription>{t('noProvider')}</AlertDescription>
        </Alert>
      )}
      {!canView && (
        <Alert variant='destructive'>
          <AlertDescription>{t('noAccess')}</AlertDescription>
        </Alert>
      )}

      <div className='flex flex-wrap items-center gap-3'>
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder={t('filters.search')}
        />
        <div className='flex-1' />
        {can('create:service-provider-users') && (
          <Button
            variant='outline'
            onClick={() =>
              update({ import: '1' }, { resetPage: false, push: true })
            }
            disabled={serviceProviderId === null}
          >
            <Upload />
            {t('import.open')}
          </Button>
        )}
        {can('create:service-provider-users') && (
          <Button
            variant='brand'
            onClick={() => openDrawer('new')}
            disabled={serviceProviderId === null}
          >
            <Plus />
            {t('actions.add')}
          </Button>
        )}
      </div>

      {list.isError ? (
        <ListError error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <Panel className='animate-enter overflow-hidden'>
          <DataTable
            columns={columns}
            data={list.data?.data ?? []}
            loading={list.isPending && serviceProviderId !== null && canView}
            onRowClick={
              can('update:service-provider-users')
                ? (u) => openDrawer(u.id)
                : undefined
            }
          />
        </Panel>
      )}

      <ListPagination
        pageNumber={page}
        totalPages={list.data?.totalPages ?? 1}
        totalRecords={total}
        onPageChange={(p) => update({ page: String(p) }, { resetPage: false })}
        label={t('common.pagination')}
      />

      {serviceProviderId !== null && can('create:service-provider-users') && (
        <ImportUsersDialog
          serviceProviderId={serviceProviderId}
          open={params.get('import') === '1'}
          onClose={() =>
            update({ import: null }, { resetPage: false, push: true })
          }
        />
      )}

      {serviceProviderId !== null && (
        <UserFormSheet
          userId={drawer}
          serviceProviderId={serviceProviderId}
          onClose={() => openDrawer(null)}
        />
      )}
    </>
  );
}
