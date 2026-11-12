import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { cn } from '@/shared/lib/utils';

/**
 * One-time code input (shadcn `input-otp`): one box per digit, paste and SMS
 * autofill fill every box at once. Keeps a real `<input>` underneath.
 */
function InputOTP({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<typeof OTPInput> & {
  containerClassName?: string;
}) {
  return (
    <OTPInput
      data-slot='input-otp'
      containerClassName={cn(
        'flex items-center has-disabled:opacity-50',
        containerClassName,
      )}
      spellCheck={false}
      className={cn('disabled:cursor-not-allowed', className)}
      {...props}
    />
  );
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot='input-otp-group'
      className={cn('flex items-center gap-2.5', className)}
      {...props}
    />
  );
}

/** One digit box; `aria-invalid` turns it red. */
function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<'div'> & { index: number }) {
  const ctx = React.useContext(OTPInputContext);
  const { char, hasFakeCaret, isActive } = ctx?.slots[index] ?? {};
  return (
    <div
      data-slot='input-otp-slot'
      data-active={isActive}
      data-filled={!!char}
      className={cn(
        'border-border-strong bg-card text-ink relative flex size-14 items-center justify-center rounded-lg border text-2xl font-semibold tabular-nums transition-[border-color,box-shadow]',
        'data-[filled=true]:border-brand',
        'data-[active=true]:border-brand data-[active=true]:ring-brand/25 data-[active=true]:z-10 data-[active=true]:ring-3',
        'aria-invalid:border-danger data-[active=true]:aria-invalid:ring-danger/25',
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <span
          aria-hidden
          className='pointer-events-none absolute inset-0 flex items-center justify-center'
        >
          <span className='bg-ink h-6 w-px animate-pulse motion-reduce:animate-none' />
        </span>
      )}
    </div>
  );
}

export { InputOTP, InputOTPGroup, InputOTPSlot };
