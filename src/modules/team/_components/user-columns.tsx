import type { ColumnDef } from '@tanstack/react-table';
import type { TFunction } from 'i18next';
import { Mail, Pencil, Trash2 } from 'lucide-react';
import { mediaUrl } from '@/shared/api/media';
import { ActiveStatusBadge } from '@/shared/components/active-status-badge';
import { ActionsCell } from '@/shared/components/layout/table';
import { InitialsAvatar, Tag } from '@/shared/components/pulse';
import type { SpPermission } from '@/shared/permissions';
import type { ProviderUser } from '@/modules/team/api/types';

interface UserColumnContext {
  t: TFunction<'team'>;
  can: (name: SpPermission) => boolean;
  onEdit: (user: ProviderUser) => void;
  onResendLink: (user: ProviderUser) => void;
  onDelete: (user: ProviderUser) => void;
}

const fullName = (u: ProviderUser) =>
  [u.firstName, u.lastName].filter(Boolean).join(' ') || u.userName;

/** Column factory for the team list (missing items §2.2). */
export function userColumns({
  t,
  can,
  onEdit,
  onResendLink,
  onDelete,
}: UserColumnContext): ColumnDef<ProviderUser>[] {
  return [
    {
      id: 'name',
      header: t('columns.name'),
      cell: ({ row }) => {
        const name = fullName(row.original);
        const photo = mediaUrl(row.original.img);
        return (
          <div className='flex items-center gap-3'>
            {photo ? (
              <img
                src={photo}
                alt=''
                className='size-10 shrink-0 rounded-full object-cover'
              />
            ) : (
              <InitialsAvatar name={name} className='shrink-0' />
            )}
            <div className='flex min-w-0 flex-col'>
              <span className='text-ink font-bold'>{name}</span>
              <span
                dir='ltr'
                className='text-ink-3 truncate text-start text-xs'
              >
                {row.original.userName}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'phone',
      header: t('columns.phone'),
      cell: ({ row }) =>
        row.original.phoneNo ? (
          <span dir='ltr' className='num'>
            {row.original.phoneNo}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'role',
      header: t('columns.role'),
      cell: ({ row }) => row.original.roleName || '—',
    },
    {
      id: 'branches',
      header: t('columns.branches'),
      cell: ({ row }) => {
        const branches = row.original.userServiceProviderBranches ?? [];
        if (branches.length === 0) return '—';
        return (
          <div className='flex flex-wrap gap-1.5'>
            {branches.map((b) => (
              <Tag key={b.id}>{b.serviceProviderBranchName}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('columns.status'),
      cell: ({ row }) => (
        <ActiveStatusBadge ns='team' active={row.original.isActive} />
      ),
    },
    {
      id: 'actions',
      header: '',
      meta: { align: 'end' },
      cell: ({ row }) => {
        const canEdit = can('update:service-provider-users');
        const canDelete = can('delete:service-provider-users');
        if (!canEdit && !canDelete) return null;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <ActionsCell
              items={[
                ...(canEdit
                  ? [
                      {
                        label: t('actions.edit'),
                        icon: Pencil,
                        onSelect: () => onEdit(row.original),
                      },
                      {
                        label: t('actions.resendLink'),
                        icon: Mail,
                        onSelect: () => onResendLink(row.original),
                      },
                    ]
                  : []),
                ...(canDelete
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
        );
      },
    },
  ];
}
