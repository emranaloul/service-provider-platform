import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  /** Render as a link (e.g. Table / Board / Calendar views are routes). */
  to?: string;
}

const ITEM =
  'inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold transition-colors [&_svg]:size-3.5';

/**
 * Pulse segmented control (pulse.css `.sg`): surface pill track, the active
 * segment filled with ink. Use for view switches (Table / Board / Calendar)
 * and ranges (Day / Week / Month). Segments with `to` render as links.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange?: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  className?: string;
}) {
  return (
    <div
      role='group'
      aria-label={label}
      className={cn(
        'bg-surface border-line inline-flex w-fit rounded-full border p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        const cls = cn(
          ITEM,
          active ? 'bg-ink text-surface' : 'text-ink-2 hover:text-ink',
        );
        const content = (
          <>
            {opt.icon && <opt.icon aria-hidden />}
            {opt.label}
          </>
        );
        return opt.to ? (
          <Link
            key={opt.id}
            to={opt.to}
            aria-current={active ? 'page' : undefined}
            className={cls}
          >
            {content}
          </Link>
        ) : (
          // Raw button on purpose: segments are styled by the track.
          <button
            key={opt.id}
            type='button'
            aria-pressed={active}
            onClick={() => onChange?.(opt.id)}
            className={cls}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
