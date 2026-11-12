import {
  FilterPills,
  type FilterOption,
} from '@/shared/components/filter-pills';

/**
 * One labelled group of filter chips (theme.md §4.3): an uppercase text-label font-bold
 * (11px/700, #aab1cf, letter-spacing .04em) with the chips 7px under it.
 * Several groups sit side by side (`gap-6`) — the caller lays them out.
 */
export function FilterChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className='flex min-w-0 flex-col gap-1.75'>
      <span className='text-text-tertiary text-[11px] font-bold tracking-[.04em] uppercase'>
        {label}
      </span>
      {/* Wraps: the course row can hold many chips. */}
      <FilterPills<T>
        options={options}
        value={value}
        onChange={onChange}
        className='max-w-full min-w-0'
      />
    </div>
  );
}
