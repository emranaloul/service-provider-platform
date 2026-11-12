import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { mediaUrl } from '@/shared/api/media';
import { ActiveStatusBadge } from '@/shared/components/active-status-badge';
import { ActionsCell } from '@/shared/components/layout/table';
import { Tag } from '@/shared/components/pulse';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { joinList } from '@/shared/lib/format';
import { pickTranslation } from '@/shared/lib/translation';
import type { SpPermission } from '@/shared/permissions';
import type { Lang } from '@/shared/types/lang';
import type { Branch } from '@/modules/branches/api/types';

interface BranchColumnContext {
  t: TFunction<'branches'>;
  lang: Lang;
  classificationNames: Map<number, string>;
  can: (name: SpPermission) => boolean;
  onOpen: (branch: Branch) => void;
  onEdit: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
  /** Ids of the selected branches (across pages), for bulk delete. */
  selected: ReadonlySet<number>;
  /** Branches on the current page, for the header "select all" box. */
  pageBranches: readonly Branch[];
  onToggle: (branch: Branch, checked: boolean) => void;
  onTogglePage: (checked: boolean) => void;
}

/** Column factory for the branch list (doc §8). */
export function branchColumns({
  t,
  lang,
  classificationNames,
  can,
  onOpen,
  onEdit,
  onDelete,
  selected,
  pageBranches,
  onToggle,
  onTogglePage,
}: BranchColumnContext): ColumnDef<Branch>[] {
  const pickedOnPage = pageBranches.filter((b) => selected.has(b.id)).length;
  const headerState =
    pageBranches.length > 0 && pickedOnPage === pageBranches.length
      ? true
      : pickedOnPage > 0
        ? 'indeterminate'
        : false;

  // Selection only serves bulk delete, so it needs the delete permission.
  const selectColumn: ColumnDef<Branch>[] = can(
    'delete:service-provider-branch',
  )
    ? [
        {
          id: 'select',
          header: () => (
            <Checkbox
              checked={headerState}
              disabled={pageBranches.length === 0}
              onCheckedChange={(c) => onTogglePage(c === true)}
              aria-label={t('bulk.selectAll')}
            />
          ),
          cell: ({ row }) => {
            const name =
              pickTranslation(row.original.translations, lang)?.name ??
              `#${row.original.id}`;
            return (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selected.has(row.original.id)}
                  onCheckedChange={(c) => onToggle(row.original, c === true)}
                  aria-label={t('bulk.selectRow', { name })}
                />
              </div>
            );
          },
        },
      ]
    : [];

  return [
    ...selectColumn,
    {
      id: 'name',
      header: t('columns.name'),
      cell: ({ row }) => {
        const tr = pickTranslation(row.original.translations, lang);
        const logo = mediaUrl(row.original.logo);
        return (
          <div className='flex items-center gap-3'>
            {logo ? (
              <img
                src={logo}
                alt=''
                className='size-10 shrink-0 rounded-xl object-cover'
              />
            ) : (
              <span
                aria-hidden
                className='bg-sunken size-10 shrink-0 rounded-xl'
              />
            )}
            <div className='flex min-w-0 flex-col'>
              <span className='text-ink font-bold'>
                {tr?.name ?? `#${row.original.id}`}
              </span>
              <span className='text-ink-3 truncate text-xs'>{tr?.address}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'classification',
      header: t('columns.classification'),
      cell: ({ row }) => {
        const name = classificationNames.get(
          row.original.serviceProviderClassificationId,
        );
        return name ? <Tag>{name}</Tag> : '—';
      },
    },
    {
      id: 'location',
      header: t('columns.location'),
      cell: ({ row }) =>
        joinList([row.original.cityName, row.original.countryName], lang),
    },
    {
      id: 'contact',
      header: t('columns.contact'),
      cell: ({ row }) => (
        <div className='flex flex-col'>
          <span>
            {row.original.firstName} {row.original.lastName}
          </span>
          <span dir='ltr' className='num text-ink-3 text-start text-xs'>
            {row.original.phone}
          </span>
        </div>
      ),
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: ({ row }) => (
        <ActiveStatusBadge ns='branches' active={row.original.status} />
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'end' },
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <ActionsCell
            items={[
              {
                label: t('actions.open'),
                icon: ExternalLink,
                onSelect: () => onOpen(row.original),
              },
              ...(can('update:service-provider-branch')
                ? [
                    {
                      label: t('actions.edit'),
                      icon: Pencil,
                      onSelect: () => onEdit(row.original),
                    },
                  ]
                : []),
              ...(can('delete:service-provider-branch')
                ? [
                    'separator' as const,
                    {
                      label: t('actions.delete'),
                      icon: Trash2,
                      destructive: true,
                      onSelect: () => onDelete(row.original),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      ),
    },
  ];
}
