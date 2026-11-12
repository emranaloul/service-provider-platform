import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { Matcher } from 'react-day-picker';
import { CalendarIcon } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Calendar } from '@/shared/components/ui/calendar';
import { Button } from '@/shared/components/ui/button';
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
import { useUiLang } from '@/shared/hooks/use-ui-lang';

/**
 * react-day-picker's `DateRange`, mirrored locally: the package's root type
 * export resolves to `never` (v10 wildcard-export collision), so we redefine its
 * shape here. Structurally identical to what `Calendar mode="range"` expects.
 */
type RangeValue = { from: Date | undefined; to?: Date | undefined };

interface DateRangeFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  /** Months to render side by side (default 2). */
  numberOfMonths?: number;
  className?: string;
}

/**
 * RHF-bound date-range picker (guide §3.11 `RangeDatePicker`). Stores a
 * react-day-picker `DateRange` (`{ from?, to? }`); `null` when empty.
 */
export function DateRangeField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  disabled,
  minDate,
  maxDate,
  numberOfMonths = 2,
  className,
}: DateRangeFieldProps<T>) {
  const lang = useUiLang();
  const [open, setOpen] = React.useState(false);

  const disabledMatcher = React.useMemo<Matcher | undefined>(() => {
    if (minDate && maxDate) return { before: minDate, after: maxDate };
    if (minDate) return { before: minDate };
    if (maxDate) return { after: maxDate };
    return undefined;
  }, [minDate, maxDate]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? undefined) as RangeValue | undefined;
        const labelText =
          value?.from && value?.to
            ? `${formatDate(value.from, lang)} – ${formatDate(value.to, lang)}`
            : value?.from
              ? formatDate(value.from, lang)
              : (placeholder ?? '');
        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='text-destructive'>*</span>}
              </FormLabel>
            )}
            <Popover open={open} onOpenChange={setOpen}>
              <FormControl>
                <PopoverTrigger asChild>
                  <Button
                    type='button'
                    variant='outline'
                    disabled={disabled}
                    onBlur={field.onBlur}
                    className={cn(
                      'w-full justify-between px-3 font-normal',
                      !value?.from && 'text-muted-foreground',
                    )}
                  >
                    {labelText}
                    <CalendarIcon className='size-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
              </FormControl>
              <PopoverContent
                className='w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0'
                align='start'
                collisionPadding={16}
              >
                <Calendar
                  mode='range'
                  selected={value}
                  // Open on the range's start month (the popover remounts the
                  // calendar each time), else the earliest allowed month.
                  defaultMonth={value?.from ?? minDate}
                  onSelect={(range) => field.onChange(range ?? null)}
                  disabled={disabledMatcher}
                  autoFocus
                  numberOfMonths={numberOfMonths}
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  locale={dateFnsLocale(lang)}
                  startMonth={minDate}
                  endMonth={maxDate}
                  className='max-sm:[--cell-size:1.75rem]'
                />
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
