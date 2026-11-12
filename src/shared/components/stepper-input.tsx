import { Minus, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { cn } from '@/shared/lib/utils';

/**
 * `[–] value [+]` (design §1.4 stepper): a number input between two step
 * buttons. The value is clamped to `min`–`max`; typing is allowed too, and a
 * cleared input reads as `min`. `integer={false}` keeps typed decimals (the
 * step buttons then move by `step`, rounded to two decimals).
 */
export function StepperInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  integer = true,
  decreaseLabel,
  increaseLabel,
  invalid,
  disabled,
  id,
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  decreaseLabel: string;
  increaseLabel: string;
  invalid?: boolean;
  disabled?: boolean;
  id?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v * 100) / 100;
  // Step onto the grid of `step` (so 4 → 6 with a step of 3, not 7).
  const down = () =>
    onChange(clamp(round(Math.ceil(value / step) * step - step)));
  const up = () =>
    onChange(clamp(round(Math.floor(value / step) * step + step)));

  return (
    <div
      className={cn(
        'border-border bg-card flex h-11 w-fit items-stretch overflow-hidden rounded-[10px] border-[1.5px]',
        invalid && 'border-danger-solid',
        disabled && 'opacity-60',
      )}
    >
      <Button
        type='button'
        variant='ghost'
        aria-label={decreaseLabel}
        disabled={disabled || value <= min}
        onClick={down}
        className='bg-secondary text-foreground hover:bg-accent h-full w-11 rounded-none'
      >
        <Minus className='size-4 stroke-[2.5]' />
      </Button>
      <Input
        id={id}
        type='number'
        inputMode={integer ? 'numeric' : 'decimal'}
        value={Number.isFinite(value) ? value : ''}
        min={min}
        max={max}
        step={integer ? 1 : 'any'}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const next = e.target.valueAsNumber;
          onChange(
            Number.isFinite(next)
              ? clamp(integer ? Math.round(next) : next)
              : min,
          );
        }}
        className='num text-foreground h-full w-14.5 [appearance:textfield] rounded-none border-0 text-center text-[15px] font-extrabold shadow-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
      />
      <Button
        type='button'
        variant='ghost'
        aria-label={increaseLabel}
        disabled={disabled || value >= max}
        onClick={up}
        className='bg-secondary text-foreground hover:bg-accent h-full w-11 rounded-none'
      >
        <Plus className='size-4 stroke-[2.5]' />
      </Button>
    </div>
  );
}
