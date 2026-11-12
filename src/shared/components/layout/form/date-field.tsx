import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { Matcher } from 'react-day-picker';
import { format } from 'date-fns';
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
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  dateFnsLocale,
  formatDate,
  toTimeValue,
  withTimeApplied,
} from '@/shared/components/layout/form/date-utils';
import { cn } from '@/shared/lib/utils';
import { useUiLang } from '@/shared/hooks/use-ui-lang';

interface DateFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Add an `HH:mm` time input below the calendar (guide `as="datetime"`). */
  withTime?: boolean;
  /** Earliest selectable day (inclusive). */
  minDate?: Date;
  /** Latest selectable day (inclusive). */
  maxDate?: Date;
  /** `label` (default) or `dropdown` month/year selectors. */
  captionLayout?: React.ComponentProps<typeof Calendar>['captionLayout'];
  /** date-fns pattern for the shown value (default: the long localized date). */
  displayFormat?: string;
  className?: string;
}

/**
 * RHF-bound single date / datetime picker (guide §3.11 `SingleDatePicker`).
 * `Popover` + `Calendar` (react-day-picker). Stores a `Date | null`; with
 * `withTime`, an `HH:mm` input sets the time on the same value.
 */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  disabled,
  withTime = false,
  minDate,
  maxDate,
  captionLayout = 'label',
  displayFormat,
  className,
}: DateFieldProps<T>) {
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
        const value: Date | undefined = field.value ?? undefined;
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
                      !value && 'text-muted-foreground',
                    )}
                  >
                    {value
                      ? displayFormat
                        ? format(value, displayFormat, {
                            locale: dateFnsLocale(lang),
                          })
                        : formatDate(value, lang, withTime)
                      : (placeholder ?? '')}
                    <CalendarIcon className='size-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
              </FormControl>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={value}
                  // Open on the picked day's month (the popover remounts the
                  // calendar each time), else the earliest allowed month.
                  defaultMonth={value ?? minDate}
                  onSelect={(d) => {
                    if (!d) {
                      field.onChange(null);
                      return;
                    }
                    // Preserve any previously-picked time on the new day.
                    field.onChange(
                      withTime && value
                        ? withTimeApplied(d, toTimeValue(value))
                        : d,
                    );
                    if (!withTime) setOpen(false);
                  }}
                  disabled={disabledMatcher}
                  autoFocus
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  locale={dateFnsLocale(lang)}
                  captionLayout={captionLayout}
                  startMonth={minDate}
                  endMonth={maxDate}
                />
                {withTime && (
                  <div className='border-border border-t p-3'>
                    <Input
                      type='time'
                      value={toTimeValue(value)}
                      onChange={(e) =>
                        field.onChange(withTimeApplied(value, e.target.value))
                      }
                    />
                  </div>
                )}
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
