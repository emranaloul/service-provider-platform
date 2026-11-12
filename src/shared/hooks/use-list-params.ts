import { useSearchParams } from 'react-router-dom';

/**
 * List state kept in the URL (filters, search, `page`, open drawer) so it
 * survives back/refresh. Any filter change resets `page` unless told not to.
 */
export function useListParams() {
  const [params, setParams] = useSearchParams();

  const update = (
    patch: Record<string, string | null>,
    { resetPage = true, push = false } = {},
  ) =>
    setParams(
      (p) => {
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '' || v === 'all') p.delete(k);
          else p.set(k, v);
        }
        if (resetPage) p.delete('page');
        return p;
      },
      { replace: !push },
    );

  const page = Math.max(1, Number(params.get('page')) || 1);
  /** A numeric id filter, or `undefined` for "all". */
  const idParam = (key: string) => {
    const v = Number(params.get(key));
    return Number.isInteger(v) && v > 0 ? v : undefined;
  };

  return { params, update, page, idParam };
}
