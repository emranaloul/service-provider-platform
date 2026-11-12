import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { z } from 'zod';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { DataTable } from '@/shared/components/data-table';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { FormFooter, TextField } from '@/shared/components/layout/form';
import { ActionsCell } from '@/shared/components/layout/table';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import { IconTile, Panel, PanelHeader, Tag } from '@/shared/components/pulse';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/ui/form';
import { useDeleteWithConfirm } from '@/shared/hooks/use-delete-with-confirm';
import { useListParams } from '@/shared/hooks/use-list-params';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import {
  providerTagQuery,
  providerTagsQuery,
  useDeleteProviderTag,
  useSaveProviderTag,
  type ProviderTag,
} from '@/modules/profile/api/tags';

const PAGE_SIZE = 10;

/**
 * Tags tab: the provider's own tags (missing items §3).
 *
 * OPEN QUESTION: there is no dedicated tags permission. doc §17.2 lists
 * `view:service-provider-orders` for this tab, which looks like a copy
 * slip; until the backend confirms, the tab is gated with
 * `view:service-provider-settings` and editing with
 * `update:service-provider-settings` (see profile-page.tsx).
 */
export function ProviderTagsPanel({ providerId }: { providerId: number }) {
  const { t } = useTranslation('profile');
  const can = useSpPermissionCheck();
  const canEdit = can('update:service-provider-settings');
  const { params, idParam, update } = useListParams();
  const page = idParam('tagsPage') ?? 1;
  const list = useQuery(providerTagsQuery(providerId, page, PAGE_SIZE));
  const rows = list.data?.data ?? [];

  // Dialog in the URL: `?tag=new` adds, `?tag=<id>` renames. A tag on the
  // current page is used as-is; any other id is fetched with GetById, so a
  // shared link opens the right tag. A tag of another provider never opens.
  const tagParam = params.get('tag');
  const tagId =
    tagParam && tagParam !== 'new' && /^\d+$/.test(tagParam)
      ? Number(tagParam)
      : 0;
  const onPage = tagId ? rows.find((r) => r.id === tagId) : undefined;
  const fetched = useQuery({
    ...providerTagQuery(tagId),
    enabled: canEdit && tagId > 0 && !onPage,
  });
  const fromApi =
    fetched.data && Number(fetched.data.serviceProviderId) === providerId
      ? fetched.data
      : null;
  const editing = onPage ?? fromApi;
  const dialog: { tag: ProviderTag | null } | null = !canEdit
    ? null
    : tagParam === 'new'
      ? { tag: null }
      : editing
        ? { tag: editing }
        : null;
  const setTagParam = (value: string | null) =>
    update({ tag: value }, { resetPage: false, push: true });
  const deleteTag = useDeleteWithConfirm('profile', useDeleteProviderTag());

  const columns: ColumnDef<ProviderTag>[] = [
    {
      id: 'name',
      header: t('tags.column'),
      cell: ({ row }) => <Tag>{row.original.name}</Tag>,
    },
    ...(canEdit
      ? [
          {
            id: 'actions',
            header: '',
            meta: { align: 'end' },
            cell: ({ row }) => {
              const tag = row.original;
              return (
                <ActionsCell
                  items={[
                    {
                      label: t('actions.rename'),
                      icon: Pencil,
                      onSelect: () => setTagParam(String(tag.id)),
                    },
                    {
                      label: t('actions.delete'),
                      icon: Trash2,
                      destructive: true,
                      onSelect: () =>
                        void deleteTag(
                          tag.id,
                          t('tags.deleteDesc', { name: tag.name }),
                        ),
                    },
                  ]}
                />
              );
            },
          } satisfies ColumnDef<ProviderTag>,
        ]
      : []),
  ];

  return (
    <Panel className='animate-enter overflow-hidden'>
      <PanelHeader
        icon={
          <IconTile>
            <Tags />
          </IconTile>
        }
        title={t('tags.title')}
        description={t('tags.description')}
        actions={
          canEdit && (
            <Button variant='brand' onClick={() => setTagParam('new')}>
              <Plus />
              {t('tags.add')}
            </Button>
          )
        }
      />
      {list.isError ? (
        <div className='p-5'>
          <ListError error={list.error} onRetry={() => void list.refetch()} />
        </div>
      ) : !list.isPending && rows.length === 0 ? (
        <p className='text-ink-2 px-5 pb-6'>{t('tags.empty')}</p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={list.isPending}
          className='rounded-none shadow-none'
        />
      )}
      {(list.data?.totalPages ?? 1) > 1 && (
        <div className='px-5 pb-5'>
          <ListPagination
            pageNumber={page}
            totalPages={list.data?.totalPages ?? 1}
            totalRecords={list.data?.totalRecords}
            onPageChange={(p) =>
              update(
                { tagsPage: p > 1 ? String(p) : null },
                { resetPage: false },
              )
            }
            label={t('common.pagination')}
          />
        </div>
      )}
      <EntityFormDialog
        open={dialog !== null}
        onOpenChange={(o) => !o && setTagParam(null)}
        title={
          dialog?.tag
            ? t('tags.editTitle', { name: dialog.tag.name })
            : t('tags.addTitle')
        }
      >
        {dialog && (
          <TagForm
            key={dialog.tag?.id ?? 'new'}
            providerId={providerId}
            tag={dialog.tag}
            onDone={() => setTagParam(null)}
          />
        )}
      </EntityFormDialog>
    </Panel>
  );
}

function TagForm({
  providerId,
  tag,
  onDone,
}: {
  providerId: number;
  tag: ProviderTag | null;
  onDone: () => void;
}) {
  const { t } = useTranslation('profile');
  const save = useSaveProviderTag(providerId);
  const schema = useMemo(
    () =>
      z.object({ name: z.string().trim().min(1, t('validation.required')) }),
    [t],
  );
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: tag?.name ?? '' },
  });

  const onSubmit = form.handleSubmit(async ({ name }) => {
    try {
      await save.mutateAsync({ name, tag: tag ?? undefined });
      notify(tag ? t('tags.updated') : t('tags.created'), 'success');
      onDone();
    } catch {
      // Toasted by the global mutation handler.
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className='flex flex-col gap-4.5 py-2'
        noValidate
      >
        <TextField name='name' label={t('tags.name')} required autoFocus />
        <FormFooter
          isPending={save.isPending}
          saveLabel={t('actions.save')}
          savingLabel={t('actions.saving')}
          cancelLabel={t('actions.cancel')}
          onCancel={onDone}
        />
      </form>
    </Form>
  );
}
