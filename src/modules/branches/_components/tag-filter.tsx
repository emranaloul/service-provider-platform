import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react';
import type { Option } from '@/shared/api/lookups';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { toggleTagId } from '@/modules/branches/lib/tag-param';

interface TagFilterProps {
  options: readonly Option[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
}

/** Multi-select tag filter for the branch list (doc §8.1 `TagIds`). */
export function TagFilter({ options, value, onChange }: TagFilterProps) {
  const { t } = useTranslation('branches');
  const baseId = useId();
  const selectedNames = options
    .filter((o) => value.includes(o.id))
    .map((o) => o.name);
  const summary =
    value.length === 0
      ? t('common.all')
      : selectedNames.length === 1
        ? selectedNames[0]
        : t('filters.tagsSelected', { count: value.length });

  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-ink-3 text-[11px] font-bold'>
        {t('filters.tags')}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className='min-w-40 justify-between font-normal'
            disabled={options.length === 0}
          >
            <span className='max-w-48 truncate'>{summary}</span>
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
                      onChange(toggleTagId(value, o.id, c === true))
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
              variant='ghost'
              size='sm'
              className='mt-1 w-full'
              onClick={() => onChange([])}
            >
              <X />
              {t('filters.clearTags')}
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
