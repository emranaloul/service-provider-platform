import { useEffect, useState } from 'react';

/**
 * Returns `value`, delayed by `delayMs` after it last changed. Use to gate a
 * search-input-driven query (`useQuery`'s `search` param) so a query only
 * fires once the user pauses typing, instead of on every keystroke.
 *
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebouncedValue(search, 400);
 * useJobList({ pageNumber: 1, pageSize: 10, search: debouncedSearch || undefined });
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
