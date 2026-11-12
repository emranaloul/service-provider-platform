import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react';
import type { Option } from '@/shared/api/lookups';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import { toggleId } from '@/modules/ledgers/lib/claim-filters';

interface ClaimIdFilterProps {
  label: string;
  options: readonly Option[];
  value: readonly number[];
  onChange: (ids: number[]) => void;
}

/**
 * Searchable multi-select for the claim filters (services, service groups —
 * doc §14.1 `ServiceIds`, `ServiceGroupIds`); the catalogue can be long.
 */
export function ClaimIdFilter({
  label,
  options,
  value,
  onChange,
}: ClaimIdFilterProps) {
  const { t } = useTranslation('ledgers');
  const selectedNames = options
    .filter((o) => value.includes(o.id))
    .map((o) => o.name);
  const summary =
    value.length === 0
      ? t('common.all')
      : selectedNames.length === 1 && value.length === 1
        ? selectedNames[0]
        : t('filters.selected', { count: value.length });

  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-ink-3 text-[11px] font-bold'>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant='outline'
            className='min-w-40 justify-between font-normal'
            disabled={options.length === 0 && value.length === 0}
            aria-label={`${label}: ${summary}`}
          >
            <span className='max-w-48 truncate'>{summary}</span>
            <ChevronDown className='text-ink-3' />
          </Button>
        </PopoverTrigger>
        <PopoverContent align='start' className='w-72 p-0'>
          <Command>
            <CommandInput placeholder={t('filters.searchList')} />
            <CommandList className='max-h-72'>
              <CommandEmpty>{t('filters.noMatches')}</CommandEmpty>
              {options.map((o) => {
                const checked = value.includes(o.id);
                return (
                  <CommandItem
                    key={o.id}
                    value={String(o.id)}
                    keywords={[o.name]}
                    onSelect={() => onChange(toggleId(value, o.id, !checked))}
                  >
                    <Checkbox
                      checked={checked}
                      tabIndex={-1}
                      aria-hidden
                      className='pointer-events-none'
                    />
                    <span className='truncate'>{o.name}</span>
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
          {value.length > 0 && (
            <div className='border-line border-t p-1'>
              <Button
                variant='ghost'
                size='sm'
                className='w-full'
                onClick={() => onChange([])}
              >
                <X />
                {t('filters.clear')}
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
