import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import type { FieldOption } from '@/shared/components/layout/form/types';

interface SelectFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  options: FieldOption[];
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Runs after the field changes — e.g. to reset or prefill dependent fields. */
  onValueChange?: (value: string) => void;
}

/**
 * RHF-bound single select (guide §3.2 `CustomSelectField`, single-value case).
 * Multi/searchable selects belong to a later Combobox (`Popover` + `Command`).
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  options,
  label,
  placeholder,
  description,
  required,
  disabled,
  className,
  onValueChange,
}: SelectFieldProps<T>) {
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
          <Select
            value={field.value ?? ''}
            onValueChange={(value) => {
              field.onChange(value);
              onValueChange?.(value);
            }}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger className={className ?? 'w-full'}>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
