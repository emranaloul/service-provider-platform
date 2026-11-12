import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/components/ui/badge';
import { formatDate } from '@/shared/components/layout/form/date-utils';
import { useUiLang } from '@/shared/hooks/use-ui-lang';

interface DateCellProps {
  /** Date value; strings/numbers are parsed. `null`/invalid renders an em dash. */
  value: Date | string | number | null | undefined;
  /** Append `HH:mm` to the localized date (guide's `fullDate`). */
  withTime?: boolean;
  /** Render inside a light `Badge` (guide `CustomUTCDateCell` look). */
  badge?: boolean;
  className?: string;
}

/**
 * Localized date cell (guide §4.5 `CustomUTCDateCell`). Reuses the Group 3
 * `formatDate` helper so calendar fields and table cells format identically.
 */
export function DateCell({ value, withTime, badge, className }: DateCellProps) {
  const lang = useUiLang();

  const date =
    value == null ? null : value instanceof Date ? value : new Date(value);
  const valid = date && !Number.isNaN(date.getTime());

  if (!valid) {
    return <span className='text-text-tertiary'>—</span>;
  }

  const text = formatDate(date, lang, withTime);

  if (badge) {
    return (
      <Badge variant='secondary' className={cn('num font-normal', className)}>
        {text}
      </Badge>
    );
  }

  return (
    <span className={cn('num text-text-secondary text-[13px]', className)}>
      {text}
    </span>
  );
}
