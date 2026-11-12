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
import { Label } from '@/shared/components/ui/label';
import type { FieldOption } from '@/shared/components/layout/form/types';
import { cn } from '@/shared/lib/utils';

interface CheckboxGroupFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  options: FieldOption[];
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Lay options out in a row instead of a column. */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

/**
 * RHF-bound checkbox group: multiple options toggled independently into a
 * `string[]` field value (unlike `RadioField`, which is single-select).
 */
export function CheckboxGroupField<T extends FieldValues>({
  control,
  name,
  options,
  label,
  description,
  required,
  disabled,
  orientation = 'vertical',
  className,
}: CheckboxGroupFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected: string[] = Array.isArray(field.value)
          ? field.value
          : [];
        const toggle = (value: string, checked: boolean) => {
          field.onChange(
            checked
              ? [...selected, value]
              : selected.filter((v) => v !== value),
          );
        };
        return (
          <FormItem>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='text-destructive'>*</span>}
              </FormLabel>
            )}
            <FormControl>
              <div
                className={cn(
                  orientation === 'horizontal'
                    ? 'flex flex-wrap gap-5'
                    : 'flex flex-col gap-2.5',
                  className,
                )}
              >
                {options.map((opt) => {
                  const id = `${name}-${opt.value}`;
                  return (
                    <div key={opt.value} className='flex items-center gap-2'>
                      <Checkbox
                        id={id}
                        checked={selected.includes(opt.value)}
                        onCheckedChange={(checked) =>
                          toggle(opt.value, checked === true)
                        }
                        disabled={disabled || opt.disabled}
                      />
                      <Label
                        htmlFor={id}
                        className='cursor-pointer font-normal'
                      >
                        {opt.label}
                      </Label>
                    </div>
                  );
                })}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
