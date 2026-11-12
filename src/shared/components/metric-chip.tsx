import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

/** A small labeled stat — a request/entity header's "status/source/doctor/…" grid cell. */
export function MetricChip({
  label,
  value,
  valueClassName,
  isEmpty,
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className='min-w-0'>
      <div className='text-text-tertiary mb-1 truncate text-[11px] font-bold'>
        {label}
      </div>
      <div
        className={cn(
          'truncate text-[13px] font-extrabold',
          isEmpty ? 'text-text-tertiary' : 'text-foreground',
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}
