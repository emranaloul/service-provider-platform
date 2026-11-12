import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';

interface TimeFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Allow seconds precision (`step=1`). */
  step?: number;
  className?: string;
}

/**
 * RHF-bound time-only field (guide §3.11 `CustomTimePicker`). A native
 * `<input type="time">` storing an `"HH:mm"` string — no calendar needed.
 */
export function TimeField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  step,
  className,
}: TimeFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className='text-destructive'>*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Input
              type='time'
              step={step}
              disabled={disabled}
              className='w-fit'
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
