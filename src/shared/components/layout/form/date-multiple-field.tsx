import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import type { Matcher } from 'react-day-picker';
import { CalendarIcon, X } from 'lucide-react';

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
import { Badge } from '@/shared/components/ui/badge';
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

interface DateMultipleFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  /** Called with the dates removed between selections (guide diff callback). */
  onDatesDeleted?: (removed: Date[]) => void;
  className?: string;
}

/**
 * RHF-bound multiple-date picker (guide §3.11 `MultipleDatePicker`). Stores a
 * `Date[]`; selected days render as removable badges. Preserves the guide's
 * **deleted-dates diff callback** (`onDatesDeleted`) and Arabic-locale RTL calendar.
 */
export function DateMultipleField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  required,
  disabled,
  minDate,
  maxDate,
  onDatesDeleted,
  className,
}: DateMultipleFieldProps<T>) {
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
        const value: Date[] = Array.isArray(field.value) ? field.value : [];

        const commit = (next: Date[]) => {
          if (onDatesDeleted) {
            const nextTimes = new Set(next.map((d) => d.getTime()));
            const removed = value.filter((d) => !nextTimes.has(d.getTime()));
            if (removed.length) onDatesDeleted(removed);
          }
          field.onChange(next);
        };

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
                      value.length === 0 && 'text-muted-foreground',
                    )}
                  >
                    {value.length
                      ? `${value.length} ${label ?? ''}`.trim()
                      : (placeholder ?? '')}
                    <CalendarIcon className='size-4 shrink-0 opacity-50' />
                  </Button>
                </PopoverTrigger>
              </FormControl>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='multiple'
                  selected={value}
                  // Open on the earliest picked day's month (the popover
                  // remounts the calendar each time), else the earliest allowed.
                  defaultMonth={
                    value.length > 0
                      ? new Date(Math.min(...value.map((d) => d.getTime())))
                      : minDate
                  }
                  onSelect={(dates) => commit(dates ?? [])}
                  disabled={disabledMatcher}
                  autoFocus
                  dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  locale={dateFnsLocale(lang)}
                  startMonth={minDate}
                  endMonth={maxDate}
                />
              </PopoverContent>
            </Popover>
            {value.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {value.map((d) => (
                  <Badge
                    key={d.getTime()}
                    variant='secondary'
                    className='gap-1'
                  >
                    {formatDate(d, lang)}
                    <span
                      role='button'
                      tabIndex={-1}
                      aria-label='remove'
                      className='hover:text-destructive -me-0.5 inline-flex cursor-pointer'
                      onClick={() =>
                        commit(value.filter((x) => x.getTime() !== d.getTime()))
                      }
                    >
                      <X className='size-3' />
                    </span>
                  </Badge>
                ))}
              </div>
            )}
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
