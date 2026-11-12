import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

export interface OptionCard<T extends string | number> {
  value: T;
  title: string;
  hint?: string;
  disabled?: boolean;
  /** Still pickable, but shown dashed and dimmed (an inactive entity). */
  muted?: boolean;
}

/**
 * A row of radio option cards (design §1.4): title + sub-line, the picked
 * one with a navy border and tint. Keyboard and screen readers get a real
 * radio group.
 */
export function OptionCards<T extends string | number>({
  options,
  value,
  onChange,
  label,
  columns = 3,
  disabled,
}: {
  options: readonly OptionCard<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  /** `1` stacks the cards (a column of choices beside another field). */
  columns?: 1 | 2 | 3;
  disabled?: boolean;
}) {
  return (
    <div
      role='radiogroup'
      aria-label={label}
      className={cn(
        'grid grid-cols-1 gap-2.5',
        columns === 3 && 'sm:grid-cols-3',
        columns === 2 && 'sm:grid-cols-2',
      )}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Button
            key={option.value}
            type='button'
            variant='ghost'
            role='radio'
            aria-checked={checked}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'h-auto flex-col items-start justify-start gap-0.5 rounded-xl px-4 py-3 text-start whitespace-normal hover:not-disabled:translate-y-0',
              checked
                ? 'border-action bg-accent hover:bg-accent border-2'
                : 'border-border bg-card hover:bg-muted border-[1.5px]',
              option.muted && 'border-dashed opacity-70',
            )}
          >
            <span className='text-foreground text-[14.5px] font-extrabold'>
              {option.title}
            </span>
            {option.hint && (
              <span className='text-muted-foreground text-[12.5px] font-medium'>
                {option.hint}
              </span>
            )}
          </Button>
        );
      })}
    </div>
  );
}
