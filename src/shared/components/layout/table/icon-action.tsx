import type { ComponentType } from 'react';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

interface IconActionProps {
  /** Tooltip text + accessible name — the label the button no longer prints. */
  label: string;
  /** lucide icon component. */
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
  /** Permission id required to see this action (array = any-of). */
  permission?: PermissionInput;
  disabled?: boolean;
  className?: string;
}

/**
 * Icon-only row action: the label lives in a tooltip and in `aria-label`
 * instead of beside the icon, so an actions column stays narrow.
 *
 * Gating happens here rather than through `Button`'s own `permission` prop —
 * a hidden button inside a `TooltipTrigger` would leave the tooltip orphaned.
 */
export function IconAction({
  label,
  icon: Icon,
  onClick,
  permission,
  disabled,
  className,
}: IconActionProps) {
  const allowed = useHasPermission(permission);
  if (!allowed) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* theme.md §4.1 icon button: 34px, radius 9, #eff2fb, #8a93b8 icon. */}
        <Button
          variant='ghost'
          size='icon'
          aria-label={label}
          disabled={disabled}
          // Never also fire a clickable row's own `onRowClick` underneath.
          onClick={(event) => {
            event.stopPropagation();
            onClick();
          }}
          className={cn(
            'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground rounded-[9px]',
            className,
          )}
        >
          <Icon className='size-3.5' />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
