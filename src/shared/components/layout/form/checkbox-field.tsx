import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Checkbox } from '@/shared/components/ui/checkbox';

interface CheckboxFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * RHF-bound checkbox (guide §3.3 `CustomCheckbox`). Uses shadcn's
 * `onCheckedChange` wired to `field.onChange` (not a DOM event).
 */
export function CheckboxField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: CheckboxFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className='flex items-start gap-2.5'>
            <FormControl>
              <Checkbox
                checked={!!field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                disabled={disabled}
                className='mt-0.5'
              />
            </FormControl>
            <div className='grid gap-1'>
              {label && (
                <FormLabel className='cursor-pointer'>{label}</FormLabel>
              )}
              {description && <FormDescription>{description}</FormDescription>}
            </div>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
