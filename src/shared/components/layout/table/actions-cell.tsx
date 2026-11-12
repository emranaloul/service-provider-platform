import type { ComponentType, ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { usePermissionCheck } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

export interface ActionItem {
  label: ReactNode;
  /** lucide icon component (rendered at menu-item size). */
  icon?: ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  /**
   * Permission id required to see this action (array = any-of). Filtered out
   * when not granted; if nothing survives, the trigger hides too.
   */
  permission?: PermissionInput;
}

/** `'separator'` entries render a divider between groups of items. */
export type ActionEntry = ActionItem | 'separator';

interface ActionsCellProps {
  items: ActionEntry[];
  /** Accessible label for the trigger button. Defaults to a translated string. */
  label?: string;
  align?: 'start' | 'center' | 'end';
}

/**
 * Row-actions dropdown (guide §4.5 `CustomActionsCell`). Radix-managed — no
 * `MenuComponent.reinitialization()`. Trigger is a ghost icon button.
 */
export function ActionsCell({ items, label, align = 'end' }: ActionsCellProps) {
  const { t } = useTranslation();
  const can = usePermissionCheck();

  // Filter first, then tidy the dividers the filtering may have orphaned, and
  // hide the whole trigger when no action survives — an empty "⋯" menu reads as
  // a broken button.
  const entries = dropOrphanSeparators(
    items.filter((item) => item === 'separator' || can(item.permission)),
  );
  if (entries.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon-sm'
          className='text-muted-foreground'
          aria-label={label ?? t('common.actions', { defaultValue: 'Actions' })}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        {entries.map((item, i) =>
          item === 'separator' ? (
            <DropdownMenuSeparator key={`sep-${i}`} />
          ) : (
            <DropdownMenuItem
              key={i}
              variant={item.destructive ? 'destructive' : 'default'}
              disabled={item.disabled}
              onSelect={item.onSelect}
            >
              {item.icon && <item.icon />}
              {item.label}
            </DropdownMenuItem>
          ),
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Collapses leading, trailing and consecutive separators to keep the menu tidy. */
function dropOrphanSeparators(entries: ActionEntry[]): ActionEntry[] {
  const trimmed: ActionEntry[] = [];
  for (const entry of entries) {
    if (entry === 'separator') {
      // Skip until at least one item precedes it, and never two in a row.
      if (trimmed.length === 0 || trimmed.at(-1) === 'separator') continue;
    }
    trimmed.push(entry);
  }
  if (trimmed.at(-1) === 'separator') trimmed.pop();
  return trimmed;
}
