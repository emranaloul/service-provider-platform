import { useTranslation } from 'react-i18next';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/components/ui/button-variants';

/**
 * Presentational pagination primitives (guide §5.5 `CustomTablePagination`).
 * The chevrons are direction-neutral: they use logical `rtl:rotate-180` so
 * "previous"/"next" point the correct way in both LTR and RTL.
 */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  const { t } = useTranslation('shell');
  return (
    <nav
      role='navigation'
      aria-label={t('common.pagination')}
      data-slot='pagination'
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot='pagination-content'
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot='pagination-item' {...props} />;
}

type PaginationLinkProps = {
  isActive?: boolean;
  size?: VariantProps<typeof buttonVariants>['size'];
} & React.ComponentProps<'a'>;

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot='pagination-link'
      data-active={isActive}
      className={cn(
        buttonVariants({ variant: isActive ? 'outline' : 'ghost', size }),
        'cursor-pointer',
        className,
      )}
      {...props}
    />
  );
}

function PaginationPrevious({
  className,
  size = 'default',
  ...props
}: PaginationLinkProps) {
  const { t } = useTranslation('shell');
  return (
    <PaginationLink
      aria-label={t('common.previousPage')}
      size={size}
      className={cn('gap-1 px-2.5', className)}
      {...props}
    >
      <ChevronLeft className='rtl:rotate-180' />
    </PaginationLink>
  );
}

function PaginationNext({
  className,
  size = 'default',
  ...props
}: PaginationLinkProps) {
  const { t } = useTranslation('shell');
  return (
    <PaginationLink
      aria-label={t('common.nextPage')}
      size={size}
      className={cn('gap-1 px-2.5', className)}
      {...props}
    >
      <ChevronRight className='rtl:rotate-180' />
    </PaginationLink>
  );
}

function PaginationEllipsis({
  className,
  ...props
}: React.ComponentProps<'span'>) {
  const { t } = useTranslation('shell');
  return (
    <span
      aria-hidden
      data-slot='pagination-ellipsis'
      className={cn('flex size-8 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontal className='size-4' />
      <span className='sr-only'>{t('common.morePages')}</span>
    </span>
  );
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
