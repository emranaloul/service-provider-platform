import type { Control, FieldPath, FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/shared/components/ui/form';
import { Switch } from '@/shared/components/ui/switch';

interface SwitchFieldProps<T extends FieldValues> {
  control?: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
}

/**
 * RHF-bound on/off toggle on a tinted panel (design §1.4): the title and its
 * helper text at the start, the switch at the end.
 */
export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
}: SwitchFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className='bg-muted flex items-center justify-between gap-4 rounded-xl px-4 py-3.5'>
          <div className='flex flex-col gap-0.5'>
            <FormLabel className='text-[13.5px] font-bold'>{label}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
          <FormControl>
            <Switch
              checked={!!field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              disabled={disabled}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
