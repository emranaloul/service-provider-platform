import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

/**
 * Standard white card wrapper used throughout the prototype for content sections.
 *
 * `permission` gates the whole section internally: not granted → renders
 * nothing, card and content both.
 */
export function PageSection({
  children,
  className,
  padding = 'default',
  permission,
}: {
  children: ReactNode;
  className?: string;
  padding?: 'default' | 'compact' | 'none';
  permission?: PermissionInput;
}) {
  const allowed = useHasPermission(permission);
  if (!allowed) return null;

  return (
    <div
      className={cn(
        'bg-card shadow-card rounded-2xl',
        padding === 'default' && 'p-6',
        padding === 'compact' && 'px-5 py-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** `permission` gates the tile internally — for per-widget dashboard gating. */
export function StatTile({
  value,
  label,
  tone = 'slate',
  permission,
}: {
  value: string | number;
  label: string;
  tone?: 'red' | 'amber' | 'green' | 'slate';
  permission?: PermissionInput;
}) {
  const allowed = useHasPermission(permission);
  const tones = {
    red: {
      surface: 'bg-danger-soft border-danger-border',
      text: 'text-danger',
    },
    amber: {
      surface: 'bg-warning-soft border-warning-border',
      text: 'text-warning',
    },
    green: {
      surface: 'bg-success-soft border-success-border',
      text: 'text-success',
    },
    slate: { surface: 'bg-accent border-border', text: 'text-text-secondary' },
  }[tone];

  if (!allowed) return null;

  return (
    <div
      className={cn(
        'min-w-35 flex-1 rounded-[11px] border px-3.5 py-3',
        tones.surface,
      )}
    >
      <div className={cn('num text-2xl font-extrabold', tones.text)}>
        {value}
      </div>
      <div className={cn('mt-0.5 text-[11.5px]', tones.text)}>{label}</div>
    </div>
  );
}
