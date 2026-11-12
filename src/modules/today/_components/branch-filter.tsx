import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ChevronDown, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { cn } from '@/shared/lib/utils';
import { toggleBranchId } from '@/modules/today/lib/branch-param';

export interface BranchOption {
  id: number;
  name: string;
}

interface BranchFilterProps {
  options: readonly BranchOption[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
  loading: boolean;
}

/** Multi-select branch filter for the dashboard (A-Z §29 `ServiceProviderBranchIds`). */
export function BranchFilter({
  options,
  value,
  onChange,
  loading,
}: BranchFilterProps) {
  const { t } = useTranslation('today');
  const baseId = useId();
  const selected = options.filter((o) => value.includes(o.id));
  const summary =
    value.length === 0
      ? t('filters.allBranches')
      : value.length === 1 && selected.length === 1
        ? selected[0].name
        : t('filters.branchesSelected', { count: value.length });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          aria-label={t('filters.branches')}
          className={cn(
            'h-9 max-w-64 justify-between gap-2 rounded-[10px] px-3.5 text-[13.5px] font-normal',
            value.length === 0 && 'text-ink-3',
          )}
          disabled={loading || options.length === 0}
        >
          <Building2 className='text-ink-3' />
          <span className='truncate'>{summary}</span>
          <ChevronDown className='text-ink-3' />
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' className='w-64 p-2'>
        <div className='flex max-h-72 flex-col gap-0.5 overflow-y-auto'>
          {options.map((o) => {
            const id = `${baseId}-${o.id}`;
            return (
              <div
                key={o.id}
                className='hover:bg-sunken flex items-center gap-2.5 rounded-md px-2 py-2'
              >
                <Checkbox
                  id={id}
                  checked={value.includes(o.id)}
                  onCheckedChange={(c) =>
                    onChange(toggleBranchId(value, o.id, c === true))
                  }
                />
                <Label
                  htmlFor={id}
                  className='text-ink flex-1 cursor-pointer font-normal'
                >
                  {o.name}
                </Label>
              </div>
            );
          })}
        </div>
        {value.length > 0 && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='mt-1 w-full'
            onClick={() => onChange([])}
          >
            <X />
            {t('filters.clearBranches')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}
