import * as React from 'react';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

type NativeProps = Omit<
  React.ComponentProps<'input'>,
  'name' | 'form' | 'type' | 'defaultValue' | 'ref'
>;

interface TextFieldProps<T extends FieldValues> extends NativeProps {
  control?: Control<T>;
  name: FieldPath<T>;
  label?: string;
  description?: string;
  /** Marks the field as required (renders an asterisk on the label). */
  required?: boolean;
  /** `textarea` renders a multiline control; otherwise a single-line input. */
  as?: 'input' | 'textarea';
  type?: React.HTMLInputTypeAttribute;
  /** Show an eye toggle for password inputs (guide §3.1 / §3.9). */
  toggleShowPassword?: boolean;
  /** Trailing slot rendered inside the input wrapper (guide `endContent`). */
  endContent?: React.ReactNode;
}

/**
 * RHF-bound text / textarea field (guide §3.1 `CustomInputField` + §3.9 password
 * toggle). Wrap in a `<Form>` (FormProvider) or pass `control` explicitly.
 */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  as = 'input',
  type = 'text',
  toggleShowPassword,
  endContent,
  className,
  ...props
}: TextFieldProps<T>) {
  const [show, setShow] = React.useState(false);
  const isPassword = type === 'password';
  const effectiveType = isPassword && show ? 'text' : type;

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
          {as === 'textarea' ? (
            <FormControl>
              {/* `props` is typed against <input>; the overlapping attributes
                  (placeholder, disabled, rows, …) are textarea-safe and `field`
                  (spread last) supplies the correct textarea handlers/ref. */}
              <Textarea
                className={className}
                {...(props as React.ComponentProps<'textarea'>)}
                {...field}
              />
            </FormControl>
          ) : (
            <div className='relative'>
              {/* FormControl on the input itself, so the label's `for` reaches it. */}
              <FormControl>
                <Input
                  type={effectiveType}
                  className={cn(
                    (toggleShowPassword && isPassword) || endContent
                      ? 'pe-9'
                      : undefined,
                    className,
                  )}
                  {...props}
                  {...field}
                />
              </FormControl>
              {toggleShowPassword && isPassword ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-sm'
                  tabIndex={-1}
                  onClick={() => setShow((s) => !s)}
                  className='text-muted-foreground absolute end-1 top-1/2 -translate-y-1/2'
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff /> : <Eye />}
                </Button>
              ) : (
                endContent && (
                  <div className='absolute end-2 top-1/2 -translate-y-1/2'>
                    {endContent}
                  </div>
                )
              )}
            </div>
          )}
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
