import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { StepperInput } from '@/shared/components/stepper-input';

interface StepperFieldProps<T extends FieldValues> {
  control?: Control<T>;
  /** The field holds the number as a string (like every numeric form value). */
  name: FieldPath<T>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  min: number;
  max: number;
  step?: number;
  /** `false` keeps typed decimals (e.g. a currency amount). */
  integer?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  /** Text after the stepper (`seats`, `% off`, …). */
  unit?: string;
}

/**
 * RHF-bound `[–] 16 [+]` stepper (design §1.4) with an optional unit after
 * it, for numeric form values held as strings.
 */
export function StepperField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  min,
  max,
  step,
  integer,
  decreaseLabel,
  increaseLabel,
  unit,
}: StepperFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const parsed = Number(field.value);
        return (
          <FormItem>
            {label && (
              <FormLabel>
                {label}
                {required && <span className='text-destructive'>*</span>}
              </FormLabel>
            )}
            <div className='flex items-center gap-3'>
              <FormControl>
                <StepperInput
                  value={
                    field.value === '' || !Number.isFinite(parsed)
                      ? min
                      : parsed
                  }
                  onChange={(value) => field.onChange(String(value))}
                  min={min}
                  max={max}
                  step={step}
                  integer={integer}
                  decreaseLabel={decreaseLabel}
                  increaseLabel={increaseLabel}
                  invalid={!!fieldState.error}
                  disabled={disabled}
                />
              </FormControl>
              {unit && (
                <span className='text-text-secondary text-sm font-bold'>
                  {unit}
                </span>
              )}
            </div>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
