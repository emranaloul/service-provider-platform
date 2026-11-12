import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Label } from '@/shared/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/components/ui/radio-group';
import type { FieldOption } from '@/shared/components/layout/form/types';
import { cn } from '@/shared/lib/utils';

interface RadioFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  options: FieldOption[];
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  /** Lay options out in a row instead of a column. */
  orientation?: 'vertical' | 'horizontal';
  /**
   * `segmented` renders each option as a full-width toggle pill (selected:
   * white bg, navy border+text; unselected: muted gray) instead of a dot +
   * label — for short option sets like yes/no answers.
   */
  variant?: 'default' | 'segmented';
  className?: string;
}

/**
 * RHF-bound radio group (guide §3.4 `CustomRadioBtn`), consolidating sibling
 * radios under one `RadioGroup` as the guide recommends.
 */
export function RadioField<T extends FieldValues>({
  control,
  name,
  options,
  label,
  description,
  required,
  disabled,
  orientation = 'vertical',
  variant = 'default',
  className,
}: RadioFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && (
            <FormLabel>
              {label}
              {required && <span className='text-destructive'>*</span>}
            </FormLabel>
          )}
          <FormControl>
            {variant === 'segmented' ? (
              <RadioGroupPrimitive.Root
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
                className={cn('flex flex-wrap gap-2.5', className)}
              >
                {options.map((opt) => (
                  <RadioGroupPrimitive.Item
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className={cn(
                      'flex-1 rounded-xl border px-4 py-2.5 text-[13.5px] font-bold transition-colors',
                      'border-border bg-surface-alt text-text-tertiary',
                      'data-[state=checked]:border-action data-[state=checked]:bg-card data-[state=checked]:text-foreground',
                      'disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {opt.label}
                  </RadioGroupPrimitive.Item>
                ))}
              </RadioGroupPrimitive.Root>
            ) : (
              <RadioGroup
                value={field.value ?? ''}
                onValueChange={field.onChange}
                disabled={disabled}
                className={cn(
                  orientation === 'horizontal' && 'flex flex-wrap gap-5',
                  className,
                )}
              >
                {options.map((opt) => {
                  const id = `${name}-${opt.value}`;
                  return (
                    <div key={opt.value} className='flex items-center gap-2'>
                      <RadioGroupItem
                        value={opt.value}
                        id={id}
                        disabled={opt.disabled}
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
              </RadioGroup>
            )}
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
