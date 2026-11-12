// Future optimization: virtualize table rendering for large datasets
import { useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';
import { m } from 'motion/react';
import { ChevronUp } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  REVEAL_EASE,
  useReducedMotion,
  useStaggerStep,
} from '@/shared/lib/motion';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { usePermissionCheck } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Header + cell text alignment — defaults to 'start'. Actions/numeric columns want 'end'. */
    align?: 'start' | 'center' | 'end';
    /**
     * Permission id required to see this column (array = any-of). Declared in
     * the `*-columns.tsx` factory; `DataTable` drops the column internally, so
     * a denied column costs nothing at the call site.
     */
    permission?: PermissionInput;
  }
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Global filter string (wire to a search input); filters all string cells. */
  globalFilter?: string;
  onRowClick?: (row: TData) => void;
  /** Client-side pagination — per blueprint, only for datasets under ~500 rows. */
  pageSize?: number;
  /**
   * First load: skeleton rows under the real header instead of the data. A
   * refetch that still has rows keeps showing them.
   */
  loading?: boolean;
  /** How many skeleton rows to draw while `loading` (default 6). */
  skeletonRows?: number;
  /**
   * Replay the row entrance on sort/page/data changes (default). Off for a
   * table whose rows are re-filtered/re-ranked client-side by surrounding
   * controls — they then update in place instead of re-animating.
   */
  replayOnChange?: boolean;
  /**
   * Server-driven sorting: the order comes from the API, the table only shows
   * and changes the state. Columns opt in with `enableSorting: true`.
   */
  sorting?: SortingState;
  onSortingChange?: (next: SortingState) => void;
  className?: string;
}

/** Varied bar widths so skeleton rows read as text, not a grid of blocks. */
const SKELETON_WIDTHS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-3/5'] as const;

/**
 * Prototype-styled table driven by TanStack Table v8 (shadcn data-table pattern).
 * theme.md §4.15: header row on `muted` (#f8f9fd), 12px/700 `muted-foreground`;
 * rows split by `row-line` (#eef1f9), cells `12px 14px`, 13.5px/500 `t2`,
 * with a `surface-alt` hover. All via tokens, so it themes.
 *
 * `react/react-compiler` is disabled for this file (see .oxlintrc.json overrides):
 * TanStack Table's `useReactTable` returns getter-based objects the compiler
 * can't safely memoize, which the compiler reports as a hard bail-out rather
 * than a normal lint violation — a documented library limitation, not a bug.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  globalFilter,
  onRowClick,
  pageSize,
  loading = false,
  skeletonRows = 6,
  replayOnChange = true,
  sorting: serverSorting,
  onSortingChange,
  className,
}: DataTableProps<TData, TValue>) {
  const { t } = useTranslation();
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const manual = serverSorting !== undefined;
  const sorting = serverSorting ?? localSorting;
  const can = usePermissionCheck();

  // Dropped before the table is built, so a denied column can never leak its
  // cell values through sorting, the global filter or an export of the model.
  const visibleColumns = columns.filter((c) => can(c.meta?.permission));

  const table = useReactTable({
    data,
    columns: visibleColumns,
    state: { sorting, globalFilter },
    onSortingChange: (u) => {
      const next = typeof u === 'function' ? u(sorting) : u;
      if (manual) onSortingChange?.(next);
      else setLocalSorting(next);
    },
    manualSorting: manual,
    enableSortingRemoval: !manual,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(pageSize
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }
      : {}),
  });

  const rows = table.getRowModel().rows;
  // Row by row (60ms apart), budgeted so a full 50-row page still finishes in ~0.8s, and
  // flat 0 under reduced motion (rows then fade in together).
  const staggerStep = useStaggerStep(rows.length, 0.8, 0.06);
  const reduced = useReducedMotion();
  const rowVariants = {
    hidden: { opacity: 0, y: reduced ? 0 : 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reduced ? 0 : 0.35, ease: REVEAL_EASE },
    },
  };
  const skeletonKey = loading && rows.length === 0 ? 'skeleton' : 'rows';
  const bodyKey = !replayOnChange
    ? skeletonKey
    : `${sorting.map((s) => `${s.id}:${s.desc}`).join(',')}|${
        table.getState().pagination.pageIndex
      }|${skeletonKey}|${JSON.stringify(rows[0]?.original ?? null)}`;

  return (
    <div
      className={cn(
        'bg-card shadow-card overflow-hidden rounded-2xl',
        className,
      )}
    >
      <div className='overflow-x-auto'>
        <table
          aria-busy={loading || undefined}
          className='w-full border-collapse text-[13.5px]'
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className='bg-muted'>
                {headerGroup.headers.map((header) => {
                  const align = header.column.columnDef.meta?.align;
                  return (
                    <th
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc'
                            ? 'descending'
                            : undefined
                      }
                      onClick={header.column.getToggleSortingHandler()}
                      className={cn(
                        'text-muted-foreground px-3.5 py-3 text-start text-xs font-bold whitespace-nowrap',
                        align === 'end' && 'text-end',
                        align === 'center' && 'text-center',
                        header.column.getCanSort() &&
                          'cursor-pointer select-none',
                      )}
                    >
                      {/* `inline-flex` (not `flex`) so the header box stays an
                          inline run and the `text-end`/`text-center` alignment
                          above still positions it. */}
                      <span className='inline-flex items-center gap-1'>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                        {/* One caret that rotates between asc and desc,
                            replacing the previous ' ↑'/' ↓' glyph swap — the
                            direction now reads as a movement rather than as
                            two unrelated characters. Reserved at 40% opacity
                            on a sortable-but-unsorted column so toggling the
                            sort never shifts the header's width. */}
                        {header.column.getCanSort() && (
                          <ChevronUp
                            aria-hidden
                            className={cn(
                              'size-3.5 shrink-0 transition-[transform,opacity] duration-200 motion-reduce:transition-none',
                              header.column.getIsSorted() === 'desc' &&
                                'rotate-180',
                              !header.column.getIsSorted() && 'opacity-40',
                            )}
                          />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <m.tbody
            // Remounting on sort/page replays the stagger, which is the point:
            // TanStack's default row ids are positional, so a page change
            // reuses `row.id` and would otherwise update rows in place with no
            // entrance at all. Deliberately NOT keyed on `globalFilter` — that
            // would replay the whole body on every keystroke while searching.
            // The skeleton→rows switch is in the key too: Motion only staggers
            // children present when the parent animates, so rows arriving
            // into an already-shown body would otherwise pop in together. The
            // first row's content covers a server-side page change (the table's
            // own pageIndex never moves) without replaying an unchanged refetch.
            key={bodyKey}
            initial='hidden'
            animate='show'
            variants={{
              show: { transition: { staggerChildren: staggerStep } },
            }}
          >
            {loading && rows.length === 0 ? (
              Array.from({ length: skeletonRows }, (_, r) => (
                <tr
                  key={`skeleton-${r}`}
                  aria-hidden
                  className='border-row-line border-t'
                >
                  {visibleColumns.map((column, c) => {
                    const align = column.meta?.align;
                    return (
                      <td key={c} className='px-3.5 py-3.5'>
                        <Skeleton
                          className={cn(
                            'h-3.5',
                            SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length],
                            align === 'end' && 'ms-auto',
                            align === 'center' && 'mx-auto',
                          )}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className='text-muted-foreground animate-in fade-in px-4 py-8 text-center text-[13px] duration-300'
                >
                  {t('common.noResults', { defaultValue: '—' })}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <m.tr
                  key={row.id}
                  variants={rowVariants}
                  onClick={
                    onRowClick ? () => onRowClick(row.original) : undefined
                  }
                  className={cn(
                    'border-row-line hover:bg-surface-alt border-t transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {row.getVisibleCells().map((cell) => {
                    const align = cell.column.columnDef.meta?.align;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          'text-text-secondary px-3.5 py-3 font-medium',
                          align === 'end' && 'text-end',
                          align === 'center' && 'text-center',
                        )}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </m.tr>
              ))
            )}
          </m.tbody>
        </table>
      </div>
      {pageSize && table.getPageCount() > 1 && (
        <div className='border-row-line flex items-center justify-between border-t px-5.5 py-3'>
          <span className='text-muted-foreground text-[12.5px]'>
            {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='ghost'
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className='bg-secondary text-foreground hover:bg-secondary disabled:text-text-tertiary rounded-lg px-3 py-1.5 text-[12.5px] font-bold'
            >
              ‹
            </Button>
            <Button
              variant='ghost'
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className='bg-secondary text-foreground hover:bg-secondary disabled:text-text-tertiary rounded-lg px-3 py-1.5 text-[12.5px] font-bold'
            >
              ›
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
