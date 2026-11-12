import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, Plus, Trash2, X } from 'lucide-react';
import {
  citiesQuery,
  classificationsQuery,
  countriesQuery,
  namesById,
} from '@/shared/api/lookups';
import { useTags } from '@/shared/api/use-tags';
import { HAS_DEPENDENTS } from '@/shared/api/delete';
import { DataTable } from '@/shared/components/data-table';
import { EnumFilterSelect } from '@/shared/components/enum-filter-select';
import { ListError } from '@/shared/components/list-error';
import { ListPagination } from '@/shared/components/list-pagination';
import {
  Hero,
  HeroEyebrow,
  HeroFigure,
  HeroTitle,
  Panel,
} from '@/shared/components/pulse';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { useDeleteWithConfirm } from '@/shared/hooks/use-delete-with-confirm';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import {
  branchListQuery,
  useDeleteBranch,
  useDeleteBranches,
} from '@/modules/branches/api/branches';
import type { Branch } from '@/modules/branches/api/types';
import {
  formatTagParam,
  parseTagParam,
} from '@/modules/branches/lib/tag-param';
import { branchColumns } from '@/modules/branches/_components/branch-columns';
import { BranchFormSheet } from '@/modules/branches/_components/branch-form-sheet';
import { TagFilter } from '@/modules/branches/_components/tag-filter';

const PAGE_SIZE = 10;

/** Branch list of the signed-in provider (doc §8.1, §8.5). */
export function BranchesPage() {
  const { t } = useTranslation('branches');
  const lang = useUiLang();
  const navigate = useNavigate();
  const can = useSpPermissionCheck();
  const { serviceProviderId } = useCurrentUser();
  const { params, update, page, idParam } = useListParams();

  const statusParam = params.get('status');
  const status =
    statusParam === 'true' ? true : statusParam === 'false' ? false : undefined;
  const classificationId = idParam('classification');
  const countryId = idParam('country');
  const cityId = idParam('city');
  const tagIds = parseTagParam(params.get('tags'));
  // `?branch=new` adds, `?branch=<id>` edits: the drawer survives a refresh.
  const branchParam = params.get('branch');
  const drawer = branchParam === 'new' ? 'new' : (idParam('branch') ?? null);

  const list = useQuery({
    ...branchListQuery({
      pageNumber: page,
      pageSize: PAGE_SIZE,
      serviceProviderId: serviceProviderId ?? undefined,
      status,
      classificationId,
      countryId,
      cityId,
      tagIds,
    }),
    enabled: serviceProviderId !== null,
  });
  const classifications = useQuery(classificationsQuery());
  const countries = useQuery(countriesQuery());
  const cities = useQuery(citiesQuery(countryId));
  const tags = useTags();
  const remove = useDeleteBranch();
  const deleteWithConfirm = useDeleteWithConfirm('branches', remove);
  const removeMany = useDeleteBranches();

  // Bulk-delete selection; survives paging and filtering (like Claims).
  const canDelete = can('delete:service-provider-branch');
  const [selected, setSelected] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const pageBranches = list.data?.data ?? [];

  const toggle = (branches: readonly Branch[], checked: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const b of branches) {
        if (checked) next.add(b.id);
        else next.delete(b.id);
      }
      return next;
    });

  const deleteOne = async (b: Branch) => {
    if (await deleteWithConfirm(b.id)) toggle([b], false);
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    const ok = await confirm({
      title: t('bulk.confirmTitle', { count: ids.length }),
      description: t('common.deleteConfirmDesc'),
      confirmText: t('bulk.confirm', { count: ids.length }),
      cancelText: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      const result = await removeMany.mutateAsync(ids);
      if (result === HAS_DEPENDENTS || result === false) {
        notify(t('bulk.failed'), 'error');
        return;
      }
      notify(t('bulk.deleted', { count: ids.length }), 'success');
      setSelected(new Set());
    } catch {
      // Toasted by the global mutation error handler.
    }
  };

  const openDrawer = (value: string | null) =>
    update({ branch: value }, { resetPage: false, push: true });

  // Memoised by the React Compiler.
  const columns = branchColumns({
    t,
    lang,
    classificationNames: namesById(classifications.data),
    can,
    onOpen: (b) => navigate(`/branches/${b.id}`),
    onEdit: (b) => openDrawer(String(b.id)),
    onDelete: (b) => void deleteOne(b),
    selected,
    pageBranches,
    onToggle: (b, checked) => toggle([b], checked),
    onTogglePage: (checked) => toggle(pageBranches, checked),
  });

  const total = list.data?.totalRecords;

  return (
    <>
      <Hero className='flex flex-wrap items-center gap-x-10 gap-y-6'>
        <div className='flex flex-[1_1_260px] flex-col gap-2.5'>
          <HeroEyebrow icon={<MapPin />}>{t('hero.eyebrow')}</HeroEyebrow>
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

      <div className='flex flex-wrap items-end gap-3'>
        <EnumFilterSelect
          ns='branches'
          label={t('filters.status')}
          value={status === undefined ? undefined : String(status)}
          onChange={(v) => update({ status: v ?? null })}
          options={[
            { value: 'true', label: t('common.active') },
            { value: 'false', label: t('common.inactive') },
          ]}
        />
        <EnumFilterSelect
          ns='branches'
          label={t('filters.classification')}
          value={classificationId}
          onChange={(v) => update({ classification: v ? String(v) : null })}
          options={(classifications.data ?? []).map((o) => ({
            value: o.id,
            label: o.name,
          }))}
        />
        <EnumFilterSelect
          ns='branches'
          label={t('filters.country')}
          value={countryId}
          onChange={(v) =>
            update({ country: v ? String(v) : null, city: null })
          }
          options={(countries.data ?? []).map((o) => ({
            value: o.id,
            label: o.name,
          }))}
        />
        {countryId && (
          <EnumFilterSelect
            ns='branches'
            label={t('filters.city')}
            value={cityId}
            onChange={(v) => update({ city: v ? String(v) : null })}
            options={(cities.data ?? []).map((o) => ({
              value: o.id,
              label: o.name,
            }))}
          />
        )}
        <TagFilter
          options={tags.data ?? []}
          value={tagIds}
          onChange={(ids) => update({ tags: formatTagParam(ids) })}
        />
        <div className='flex-1' />
        {can('create:service-provider-branch') && (
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
            data={pageBranches}
            loading={list.isPending && serviceProviderId !== null}
            onRowClick={(b) => navigate(`/branches/${b.id}`)}
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

      {canDelete && selected.size > 0 && (
        <section
          aria-label={t('bulk.label')}
          className='bg-surface border-line shadow-card animate-enter sticky bottom-4 z-10 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border px-5 py-4'
        >
          <span className='text-ink font-bold'>
            {t('bulk.selected', { count: selected.size })}
          </span>
          <div className='ms-auto flex gap-2.5'>
            <Button variant='ghost' onClick={() => setSelected(new Set())}>
              <X />
              {t('bulk.clear')}
            </Button>
            <Button
              variant='destructive'
              onClick={() => void deleteSelected()}
              disabled={removeMany.isPending}
            >
              <Trash2 />
              {t('bulk.delete')}
            </Button>
          </div>
        </section>
      )}

      <BranchFormSheet
        branchId={drawer}
        onClose={() => openDrawer(null)}
        onCreated={(b) => navigate(`/branches/${b.id}`)}
      />
    </>
  );
}
