import * as React from 'react';
import {
  DayPicker,
  useDayPicker,
  type DayButton,
  type MonthCaptionProps,
} from 'react-day-picker';
import { format, setMonth, setYear } from 'date-fns';
import type { Locale } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

/**
 * Purpose-built `Calendar` over react-day-picker v10 — themed to the brand
 * palette with its own spacing scale, not shadcn's default classNames patched
 * in place. RTL-aware: pass `dir="rtl"` and a date-fns `locale` from the
 * consuming field.
 *
 * The month/year caption is a fully custom `MonthCaption` override (two real
 * `Select` triggers driven by `useDayPicker().goToMonth`) rather than styling
 * react-day-picker's native `<select>`-based dropdown markup — that markup
 * renders as bare unstyled `<select>` elements with no reliable box model to
 * theme (three separate attempts at CSS-only theming all regressed to the
 * same unstyled look), so this replaces it outright instead of patching it
 * again. `captionLayout` no longer applies (kept in props for API
 * compatibility with existing callers) since the caption is always this
 * custom component; jumping across years still works, and `startMonth`/
 * `endMonth` still bound the year `Select`'s options.
 */
function Calendar({
  className,
  showOutsideDays = true,
  navLayout = 'around',
  numberOfMonths = 1,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  // `DayPickerProps.locale` is typed as the wider `Partial<DayPickerLocale>`,
  // but every call site in this app passes a full date-fns `Locale` (via
  // `dateFnsLocale(lang)`) — narrow it back for `format()`, which needs it.
  const locale = props.locale as Locale | undefined;

  const MonthCaption = React.useCallback(
    (captionProps: MonthCaptionProps) => (
      <CalendarMonthCaption {...captionProps} locale={locale} />
    ),
    [locale],
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      navLayout={navLayout}
      numberOfMonths={numberOfMonths}
      className={cn('bg-popover text-popover-foreground p-4', className)}
      classNames={{
        months: cn(
          'flex flex-col gap-6 sm:flex-row',
          numberOfMonths > 1 &&
            'sm:divide-x sm:divide-border rtl:sm:divide-x-reverse',
        ),
        month: 'flex w-full flex-col gap-4 sm:px-4 sm:first:ps-0 sm:last:pe-0',
        month_caption: 'flex h-9 items-center',
        caption_label: 'text-[14.5px] font-bold text-foreground select-none',
        nav: 'hidden',
        button_previous: 'hidden',
        button_next: 'hidden',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 flex-1 pb-2.5 text-center text-[11px] font-bold tracking-[.02em] text-muted-foreground uppercase select-none',
        week: 'mt-0.5 flex w-full',
        day: 'group/day relative aspect-square w-full p-0.5 text-center select-none',
        range_start: 'rounded-s-lg bg-accent',
        range_middle: 'bg-accent/60',
        range_end: 'rounded-e-lg bg-accent',
        outside: 'text-muted-foreground/50',
        disabled: 'text-muted-foreground/40 opacity-50',
        hidden: 'invisible',
      }}
      components={{
        MonthCaption,
        // The prev/next Nav is hidden (`nav`/`button_previous`/`button_next`
        // above) now that the month/year selects handle navigation.
        Chevron: ({ className }) => (
          <ChevronDownIcon className={cn('size-3.5 shrink-0', className)} />
        ),
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}

function CalendarMonthCaption({
  calendarMonth,
  locale,
}: MonthCaptionProps & { locale: Locale | undefined }) {
  const { goToMonth, dayPickerProps } = useDayPicker();
  const { startMonth, endMonth } = dayPickerProps;
  const current = calendarMonth.date;

  // Only months `goToMonth` can actually reach: it clamps to
  // `startMonth`/`endMonth`, so offering all 12 unconditionally leaves the
  // out-of-range options as silent no-ops that read as a broken dropdown.
  const months = React.useMemo(() => {
    const year = current.getFullYear();
    const first =
      startMonth && startMonth.getFullYear() === year
        ? startMonth.getMonth()
        : 0;
    const last =
      endMonth && endMonth.getFullYear() === year ? endMonth.getMonth() : 11;
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => ({
      index: first + i,
      label: format(setMonth(current, first + i), 'LLLL', { locale }),
    }));
  }, [current, locale, startMonth, endMonth]);

  const years = React.useMemo(() => {
    const startYear = startMonth?.getFullYear() ?? current.getFullYear() - 100;
    const endYear = endMonth?.getFullYear() ?? current.getFullYear() + 10;
    return Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => startYear + i,
    );
  }, [startMonth, endMonth, current]);

  return (
    <div className='flex items-center gap-2'>
      <Select
        value={String(current.getMonth())}
        onValueChange={(v) => goToMonth(setMonth(current, Number(v)))}
      >
        <SelectTrigger
          size='sm'
          className='text-foreground hover:bg-accent h-8 gap-1 border-none bg-transparent px-2.5 text-[13.5px] font-bold shadow-none'
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='max-h-64'>
          {months.map((m) => (
            <SelectItem key={m.index} value={String(m.index)}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(current.getFullYear())}
        onValueChange={(v) => goToMonth(setYear(current, Number(v)))}
      >
        <SelectTrigger
          size='sm'
          className='text-foreground hover:bg-accent h-8 gap-1 border-none bg-transparent px-2.5 text-[13.5px] font-bold shadow-none'
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className='max-h-64'>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isRangeEdge = modifiers.range_start || modifiers.range_end;
  const isSelectedSingle =
    modifiers.selected && !isRangeEdge && !modifiers.range_middle;
  const isPlainToday = modifiers.today && !isSelectedSingle && !isRangeEdge;

  return (
    <button
      ref={ref}
      type='button'
      data-day={day.date.toLocaleDateString()}
      className={cn(
        'text-foreground flex aspect-square size-9 items-center justify-center rounded-lg text-[13px] leading-none font-medium transition-colors',
        'hover:bg-accent',
        'focus-visible:ring-ring/50 focus-visible:ring-2 focus-visible:outline-none',
        isPlainToday && 'text-brand font-extrabold',
        (isSelectedSingle || isRangeEdge) &&
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
        modifiers.range_middle &&
          !isRangeEdge &&
          'text-foreground hover:bg-accent rounded-none bg-transparent',
        modifiers.disabled && 'pointer-events-none opacity-40',
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
