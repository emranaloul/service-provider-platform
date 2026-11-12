import { Input } from '@/shared/components/ui/input';

export interface TimeRange {
  from: string | undefined;
  to: string | undefined;
}

/**
 * Two plain `HH:mm` time inputs for a list's `timeFrom`/`timeTo` filter —
 * the time-of-day counterpart of `DateRangeFilter`, but simpler: a time of
 * day has no calendar to pick from, so this is just two shadcn `Input
 * type='time'` fields with plain `value`/`onChange`, no popover needed.
 */
export function TimeRangeFilter({
  value,
  onChange,
  fromPlaceholder,
  toPlaceholder,
}: {
  value: TimeRange | undefined;
  onChange: (value: TimeRange | undefined) => void;
  fromPlaceholder: string;
  toPlaceholder: string;
}) {
  const setFrom = (from: string) => {
    if (!from && !value?.to) {
      onChange(undefined);
      return;
    }
    onChange({ from: from || undefined, to: value?.to });
  };

  const setTo = (to: string) => {
    if (!value?.from && !to) {
      onChange(undefined);
      return;
    }
    onChange({ from: value?.from, to: to || undefined });
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Input
        type='time'
        value={value?.from ?? ''}
        onChange={(e) => setFrom(e.target.value)}
        aria-label={fromPlaceholder}
        className='border-border bg-card h-9 w-auto rounded-[10px] px-3 text-[13.5px]'
      />
      <Input
        type='time'
        value={value?.to ?? ''}
        onChange={(e) => setTo(e.target.value)}
        aria-label={toPlaceholder}
        className='border-border bg-card h-9 w-auto rounded-[10px] px-3 text-[13.5px]'
      />
    </div>
  );
}
