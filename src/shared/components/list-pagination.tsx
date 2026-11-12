import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
  PaginationPrevious,
  PaginationNext,
} from '@/shared/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/lib/utils';

/** Page numbers to render around the current page, `null` standing in for an ellipsis. */
function getPageItems(pageNumber: number, totalPages: number) {
  const items: (number | null)[] = [];
  const siblings = 1;

  const start = Math.max(2, pageNumber - siblings);
  const end = Math.min(totalPages - 1, pageNumber + siblings);

  items.push(1);
  if (start > 2) items.push(null);
  for (let page = start; page <= end; page++) items.push(page);
  if (end < totalPages - 1) items.push(null);
  if (totalPages > 1) items.push(totalPages);

  return items;
}

/** theme.md §4.15: 32px squares, radius 9. */
const CELL = 'size-8 rounded-[9px] text-xs font-bold';
/** Inactive page / arrow: `#eff2fb` with `#8a93b8` text. */
const CELL_QUIET =
  'border-transparent bg-secondary text-muted-foreground hover:brightness-95 hover:bg-secondary hover:text-foreground';

/**
 * Lists shorter than this never show pagination chrome at all — no pager, no
 * page-size dropdown. A single short page has nothing to navigate and nothing
 * worth resizing.
 */
const MIN_RECORDS_FOR_PAGINATION = 10;

/**
 * Server-side numbered pager for a paginated list, plus an optional
 * page-size dropdown — both seated in one white pill bar matching the
 * table/card surface above it (`DataTable`'s radius + shadow).
 *
 * Hidden entirely for lists under `MIN_RECORDS_FOR_PAGINATION` rows. Above
 * that, the page-size dropdown stays visible even when the rows all fit on
 * one page — otherwise picking a size larger than the dataset (e.g. 20 for 12
 * rows) would hide the only control that could set it back down.
 */
export function ListPagination({
  pageNumber,
  totalPages,
  totalRecords,
  onPageChange,
  label,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: {
  pageNumber: number;
  totalPages: number;
  /** Row count for the whole list (not the current page); `undefined` while loading. */
  totalRecords: number | undefined;
  onPageChange: (page: number) => void;
  label: string;
  /** Omit to hide the page-size dropdown (e.g. a fixed-size nested pager). */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}) {
  const hasPageSizeControl =
    pageSize !== undefined && pageSizeOptions && onPageSizeChange;
  const hasPager = totalPages > 1;

  if (
    totalRecords === undefined ||
    totalRecords < MIN_RECORDS_FOR_PAGINATION ||
    (!hasPager && !hasPageSizeControl)
  ) {
    return null;
  }

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    onPageChange(page);
  };

  return (
    <div className='flex w-full'>
      <div className='bg-card shadow-card flex w-full flex-wrap items-center justify-end gap-1.5 rounded-2xl px-5.5 py-3'>
        {hasPager && (
          <>
            <Pagination className='mx-0 w-auto' aria-label={label}>
              <PaginationContent className='gap-1.5'>
                <PaginationItem>
                  <PaginationPrevious
                    href='#'
                    size='icon'
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(pageNumber - 1);
                    }}
                    aria-disabled={pageNumber === 1}
                    className={cn(
                      CELL,
                      CELL_QUIET,
                      'px-0',
                      pageNumber === 1 &&
                        'text-muted-foreground/50 pointer-events-none hover:bg-transparent',
                    )}
                  />
                </PaginationItem>

                {getPageItems(pageNumber, totalPages).map((page, index) =>
                  page === null ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <PaginationEllipsis
                        className={cn(CELL, 'text-muted-foreground')}
                      />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        href='#'
                        isActive={page === pageNumber}
                        onClick={(e) => {
                          e.preventDefault();
                          goToPage(page);
                        }}
                        className={cn(
                          CELL,
                          'num',
                          page === pageNumber
                            ? 'bg-action text-action-foreground hover:bg-action hover:text-action-foreground border-transparent'
                            : CELL_QUIET,
                        )}
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    href='#'
                    size='icon'
                    onClick={(e) => {
                      e.preventDefault();
                      goToPage(pageNumber + 1);
                    }}
                    aria-disabled={pageNumber === totalPages}
                    className={cn(
                      CELL,
                      CELL_QUIET,
                      'px-0',
                      pageNumber === totalPages &&
                        'text-muted-foreground/50 pointer-events-none hover:bg-transparent',
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </>
        )}

        {hasPager && hasPageSizeControl && (
          <span aria-hidden className='ms-2' />
        )}

        {hasPageSizeControl && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              size='sm'
              className='num bg-secondary text-text-secondary hover:bg-accent h-8 w-auto gap-1 rounded-[9px] border-transparent px-2.5 text-xs font-bold focus-visible:border-white focus-visible:ring-white/50'
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)} className='num'>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
