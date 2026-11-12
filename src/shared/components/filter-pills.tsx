import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { usePermissionCheck } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

export interface FilterOption<T extends string> {
  id: T;
  label: string;
  /** Permission id required to see this pill (array = any-of). */
  permission?: PermissionInput;
}

interface FilterPillsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Active pill color — 'navy' (default) or 'blue' (used by the requests source filter). */
  activeColor?: 'navy' | 'blue';
  className?: string;
}

/**
 * Filter chips (theme.md §4.3): separate pills, `6px 12px`, 12.5px/700 —
 * off: white with a 1px #dde2f1 border and grey text; on: solid navy. The
 * switch is instant, as the design specifies (no sliding fill).
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  activeColor = 'navy',
  className,
}: FilterPillsProps<T>) {
  const can = usePermissionCheck();
  const visible = options.filter((opt) => can(opt.permission));

  if (visible.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {visible.map((opt) => {
        const active = opt.id === value;
        return (
          <Button
            key={opt.id}
            variant='ghost'
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'h-auto rounded-full border px-3 py-1.5 text-[12.5px] font-bold',
              active
                ? activeColor === 'blue'
                  ? 'bg-info-solid border-info-solid hover:bg-info-solid text-white hover:text-white'
                  : 'bg-action border-action hover:bg-action text-action-foreground hover:text-action-foreground'
                : 'border-border bg-card text-text-secondary hover:bg-card hover:text-foreground',
            )}
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
