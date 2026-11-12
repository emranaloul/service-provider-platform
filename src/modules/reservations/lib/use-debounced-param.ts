import { useEffect, useState } from 'react';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { useListParams } from '@/shared/hooks/use-list-params';

/**
 * A text filter typed locally and written to `?<key>=` once the user
 * pauses. When the URL changes from elsewhere (back/forward, "Clear
 * filters"), the typed value follows it.
 */
export function useDebouncedParam(key: string, delayMs = 400) {
  const { params, update } = useListParams();
  const urlValue = params.get(key) ?? '';
  const [value, setValue] = useState(urlValue);
  const debounced = useDebouncedValue(value.trim(), delayMs);

  useEffect(() => {
    if (urlValue !== debounced) update({ [key]: debounced || null });
    // Only the debounced value drives the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Follow outside URL changes; our own writes match `debounced`.
  const [seen, setSeen] = useState(urlValue);
  if (urlValue !== seen) {
    setSeen(urlValue);
    if (urlValue !== debounced) setValue(urlValue);
  }

  return [value, setValue] as const;
}
