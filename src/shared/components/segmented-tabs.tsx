import { useId } from 'react';
import { m } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { usePillTransition } from '@/shared/lib/motion';
import { usePermissionCheck } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

export interface SegmentedTabOption<T extends string> {
  id: T;
  label: string;
  /** Optional leading glyph, for a track whose segments switch a view rather than filter one. */
  icon?: LucideIcon;
  /** Permission id required to see this segment (array = any-of). */
  permission?: PermissionInput;
}

interface SegmentedTabsProps<T extends string> {
  options: SegmentedTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Capsule-shaped segmented control — light-gray pill track, solid navy active
 * segment. Used by the topbar role switcher; reuse anywhere a small set of
 * mutually-exclusive views/filters needs the same rounded-full treatment
 * (distinct from `FilterPills`, which is a bordered chip group).
 *
 * The active fill is a single `layoutId` element that *slides* between
 * segments rather than one background per segment cross-fading. Two
 * consequences worth knowing:
 *
 * - It is RTL-correct for free. `layoutId` interpolates measured box
 *   positions, so it never needs a direction-aware `x` (which `motion` does
 *   NOT flip for `dir='rtl'`).
 * - The id must be unique per rendered track, hence `useId()`. A module-level
 *   constant would make two `SegmentedTabs` on one screen animate their pills
 *   into each other.
 */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedTabsProps<T>) {
  const can = usePermissionCheck();
  const pillId = useId();
  const pillTransition = usePillTransition();
  const visible = options.filter((opt) => can(opt.permission));

  // Nothing to switch between — hide the whole track rather than an empty pill.
  if (visible.length === 0) return null;

  return (
    <div
      role='group'
      className={cn(
        // theme.md §4.4: #eff2fb track, 3px padding, 2px gap.
        'bg-secondary inline-flex w-fit gap-0.5 rounded-full p-0.75',
        className,
      )}
    >
      {visible.map((opt) => {
        const active = opt.id === value;
        return (
          <Button
            key={opt.id}
            variant='ghost'
            // Which segment is active is otherwise carried by colour alone, so
            // it never reaches a screen reader (and is lost to anyone who can't
            // separate the two fills).
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative h-auto rounded-full px-3.5 py-1.75 text-[12.5px] font-bold hover:bg-transparent',
              active ? 'text-white hover:text-white' : 'text-text-secondary',
            )}
          >
            {active && (
              <m.span
                aria-hidden
                layoutId={pillId}
                transition={pillTransition}
                className='bg-action absolute inset-0 z-0 rounded-full'
              />
            )}
            {/* Sits above the sliding fill; also carries the icon/label gap,
                which moved off the Button so the pill can span the full box. */}
            <span className='relative z-1 flex items-center gap-1.5'>
              {opt.icon && <opt.icon className='size-3.5' />}
              {opt.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
}
