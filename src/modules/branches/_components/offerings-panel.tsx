import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { ColumnDef } from '@tanstack/react-table';
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { DataTable } from '@/shared/components/data-table';
import { ActionsCell } from '@/shared/components/layout/table';
import { ListError } from '@/shared/components/list-error';
import { IconTile, Panel, PanelHeader, Tag } from '@/shared/components/pulse';
import { Button } from '@/shared/components/ui/button';
import { useDeleteWithConfirm } from '@/shared/hooks/use-delete-with-confirm';
import { formatNumber } from '@/shared/lib/format';
import {
  useServicePermission,
  useSpPermissionCheck,
} from '@/shared/permissions';
import {
  branchServicesQuery,
  branchVaccinesQuery,
  useDeleteBranchService,
  useDeleteBranchVaccine,
} from '@/modules/branches/api/branches';
import {
  branchServiceName,
  branchVaccineName,
  isServiceGroup,
  type Branch,
} from '@/modules/branches/api/types';
import {
  OfferingFormDialog,
  type OfferingTarget,
} from '@/modules/branches/_components/offering-form-dialog';

interface OfferingRow {
  key: string;
  type: 'service' | 'group' | 'vaccine';
  name: string;
  cost: number;
  b2cPrice: number;
  b2bPrice: number | null;
  discount: number | null;
  target: OfferingTarget;
}

const money = (n: number | null) =>
  n === null ? '—' : formatNumber(Number(n.toFixed(2)));

/**
 * One list of everything a branch offers (doc §10.6): branch services and,
 * with `view:branch-vaccines`, branch vaccines. Service #5 and vaccine #5
 * are unrelated records, so rows are keyed by type + id.
 */
export function OfferingsPanel({ branch }: { branch: Branch }) {
  const { t } = useTranslation('branches');
  const can = useSpPermissionCheck();
  const canViewVaccines = can('view:branch-vaccines');
  const services = useQuery(branchServicesQuery(branch.id));
  const vaccines = useQuery(branchVaccinesQuery(branch.id, canViewVaccines));
  const [dialog, setDialog] = useState<{
    target: OfferingTarget | null;
  } | null>(null);

  const deleteService = useDeleteWithConfirm(
    'branches',
    useDeleteBranchService(branch.id),
  );
  const deleteVaccine = useDeleteWithConfirm(
    'branches',
    useDeleteBranchVaccine(branch.id),
  );

  const rows: OfferingRow[] = [
    ...(services.data ?? []).map((s): OfferingRow => ({
      key: `s-${s.id}`,
      type: isServiceGroup(s) ? 'group' : 'service',
      name: branchServiceName(s),
      cost: s.cost,
      b2cPrice: s.b2CPrice,
      b2bPrice: null,
      discount: s.b2CDiscount,
      target: { kind: 'service', item: s },
    })),
    ...(canViewVaccines ? (vaccines.data ?? []) : []).map((v): OfferingRow => ({
      key: `v-${v.id}`,
      type: 'vaccine',
      name: branchVaccineName(v),
      cost: v.cost,
      b2cPrice: v.b2CPrice,
      b2bPrice: v.b2BPrice,
      discount: null,
      target: { kind: 'vaccine', item: v },
    })),
  ];

  const canViewVaccineCatalogue = useServicePermission('view:vaccine');
  const canAdd =
    can('create:branch-services') ||
    (can('create:branch-vaccines') && canViewVaccineCatalogue);

  const columns: ColumnDef<OfferingRow>[] = [
    {
      id: 'name',
      header: t('offerings.columns.name'),
      cell: ({ row }) => (
        <span className='text-ink font-bold'>{row.original.name}</span>
      ),
    },
    {
      id: 'type',
      header: t('offerings.columns.type'),
      cell: ({ row }) => <Tag>{t(`offerings.types.${row.original.type}`)}</Tag>,
    },
    {
      id: 'cost',
      header: t('offerings.columns.cost'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num'>{money(row.original.cost)}</span>
      ),
    },
    {
      id: 'b2c',
      header: t('offerings.columns.b2cPrice'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num font-semibold'>
          {money(row.original.b2cPrice)}
        </span>
      ),
    },
    {
      id: 'b2b',
      header: t('offerings.columns.b2bPrice'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num'>{money(row.original.b2bPrice)}</span>
      ),
    },
    {
      id: 'discount',
      header: t('offerings.columns.discount'),
      meta: { align: 'end' },
      cell: ({ row }) => (
        <span className='num'>{money(row.original.discount)}</span>
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'end' },
      cell: ({ row }) => {
        const r = row.original;
        const isVaccine = r.target.kind === 'vaccine';
        const canEdit = can(
          isVaccine ? 'update:branch-vaccines' : 'update:branch-services',
        );
        const canDelete = can(
          isVaccine ? 'delete:branch-vaccines' : 'delete:branch-services',
        );
        return (
          <ActionsCell
            items={[
              ...(canEdit
                ? [
                    {
                      label: t('actions.edit'),
                      icon: Pencil,
                      onSelect: () => setDialog({ target: r.target }),
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      label: t('actions.delete'),
                      icon: Trash2,
                      destructive: true,
                      onSelect: () =>
                        void (isVaccine ? deleteVaccine : deleteService)(
                          r.target.item.id,
                        ),
                    },
                  ]
                : []),
            ]}
          />
        );
      },
    },
  ];

  const error = services.error ?? vaccines.error;

  return (
    <Panel className='animate-enter overflow-hidden'>
      <PanelHeader
        icon={
          <IconTile>
            <ListChecks />
          </IconTile>
        }
        title={t('offerings.title')}
        description={t('offerings.description')}
        actions={
          canAdd && (
            <Button variant='brand' onClick={() => setDialog({ target: null })}>
              <Plus />
              {t('offerings.add')}
            </Button>
          )
        }
      />
      {error ? (
        <div className='p-5'>
          <ListError
            error={error}
            onRetry={() => {
              void services.refetch();
              if (canViewVaccines) void vaccines.refetch();
            }}
          />
        </div>
      ) : !services.isPending && rows.length === 0 ? (
        <p className='text-ink-2 px-5 pb-6'>{t('offerings.empty')}</p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={
            services.isPending || (canViewVaccines && vaccines.isPending)
          }
          className='rounded-none shadow-none'
        />
      )}
      <OfferingFormDialog
        branch={branch}
        target={dialog?.target ?? null}
        open={dialog !== null}
        onClose={() => setDialog(null)}
      />
    </Panel>
  );
}
