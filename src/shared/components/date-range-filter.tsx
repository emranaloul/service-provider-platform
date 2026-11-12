import * as React from 'react';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Calendar } from '@/shared/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  dateFnsLocale,
  formatDate,
} from '@/shared/components/layout/form/date-utils';
import { cn } from '@/shared/lib/utils';
import type { Lang } from '@/shared/types/lang';
import { useUiLang } from '@/shared/hooks/use-ui-lang';

export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

/** Single-date popover button (`Popover` + `Calendar`), no RHF — reusable outside `DateRangeFilter`. */
export function SingleDateButton({
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  lang,
}: {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  placeholder: string;
  minDate?: Date;
  maxDate?: Date;
  lang: Lang;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          className={cn(
            'border-border bg-card h-9 justify-between gap-2 rounded-[10px] px-3.5 text-[13.5px] font-normal',
            !value && 'text-text-tertiary',
          )}
        >
          <span className='truncate'>
            {value ? formatDate(value, lang) : placeholder}
          </span>
          {value ? (
            <span
              role='button'
              tabIndex={-1}
              aria-label='clear'
              className='hover:text-destructive inline-flex shrink-0 cursor-pointer opacity-60'
              onClick={(e) => {
                e.stopPropagation();
                onChange(undefined);
              }}
            >
              <X className='size-3.5' />
            </span>
          ) : (
            <CalendarIcon className='size-4 shrink-0 opacity-50' />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='single'
          selected={value}
          // Open on the picked day's month (the popover remounts the calendar
          // each time), else the earliest allowed month.
          defaultMonth={value ?? minDate}
          onSelect={(d) => {
            onChange(d ?? undefined);
            setOpen(false);
          }}
          disabled={
            minDate && maxDate
              ? { before: minDate, after: maxDate }
              : minDate
                ? { before: minDate }
                : maxDate
                  ? { after: maxDate }
                  : undefined
          }
          autoFocus
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
          locale={dateFnsLocale(lang)}
        />
      </PopoverContent>
    </Popover>
  );
}

/**
 * Two independent single-date popovers for a `from`/`to` API date-range
 * filter — each opens its own single-month calendar, rather than one
 * combined range-picker button with a two-month calendar.
 */
export function DateRangeFilter({
  value,
  onChange,
  fromPlaceholder,
  toPlaceholder,
}: {
  value: DateRange | undefined;
  onChange: (value: DateRange | undefined) => void;
  fromPlaceholder: string;
  toPlaceholder: string;
}) {
  const lang = useUiLang();

  const setFrom = (date: Date | undefined) => {
    if (!date && !value?.to) {
      onChange(undefined);
      return;
    }
    onChange({ from: date, to: value?.to });
  };

  const setTo = (date: Date | undefined) => {
    if (!value?.from && !date) {
      onChange(undefined);
      return;
    }
    onChange({
      from: value?.from,
      to: date,
    });
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <SingleDateButton
        value={value?.from}
        onChange={setFrom}
        placeholder={fromPlaceholder}
        maxDate={value?.to}
        lang={lang}
      />
      <SingleDateButton
        value={value?.to}
        onChange={setTo}
        placeholder={toPlaceholder}
        minDate={value?.from}
        lang={lang}
      />
    </div>
  );
}
