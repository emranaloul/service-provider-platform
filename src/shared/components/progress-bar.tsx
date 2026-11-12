import { cn } from '@/shared/lib/utils';

/** Pill track with a navy fill (App.dc.html `.trk`). `value` is 0–100. */
export function ProgressBar({
  value,
  label,
  className,
}: {
  value: number;
  /** Accessible name, e.g. "Progress". */
  label: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role='progressbar'
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={cn(
        'bg-surface-2 h-2 min-w-15 flex-1 overflow-hidden rounded-full',
        className,
      )}
    >
      {/* Inline width: an unbounded runtime percentage (hard rule 10). */}
      <div className='bg-brand h-full' style={{ width: `${pct}%` }} />
    </div>
  );
}
