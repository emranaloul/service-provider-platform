import type { SortingState } from '@tanstack/react-table';
import { SortDirection } from '@/shared/api/enums';
import { useListParams } from '@/shared/hooks/use-list-params';

/**
 * Server-side column sorting kept in the URL (`sort=<column id>`,
 * `dir=desc`). `sortBy` maps each sortable column id to the backend's
 * `sortBy` value; `query` is spread into the list request (empty when the
 * list is in its default order). Feed `sorting` / `onSortingChange` to
 * `DataTable`.
 */
export function useSortParams<K extends string, V extends number>(
  sortBy: Record<K, V>,
) {
  const { params, update } = useListParams();
  const raw = params.get('sort');
  const key = raw !== null && Object.hasOwn(sortBy, raw) ? (raw as K) : null;
  const desc = params.get('dir') === 'desc';
  const sorting: SortingState = key ? [{ id: key, desc }] : [];
  const query: { sortBy?: V; sortDir?: SortDirection } = key
    ? {
        sortBy: sortBy[key],
        sortDir: desc ? SortDirection.Desc : SortDirection.Asc,
      }
    : {};
  const onSortingChange = (s: SortingState) =>
    update({ sort: s[0]?.id ?? null, dir: s[0]?.desc ? 'desc' : null });
  return { sorting, query, onSortingChange };
}
