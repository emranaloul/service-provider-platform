import type { ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';
import { FieldsSkeleton } from '@/shared/components/skeletons';

interface EntityFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  contentClassName?: string;
  /** Detail query still loading (edit mode) — renders a centered spinner instead of `children`. */
  isLoading?: boolean;
  children: ReactNode;
}

/**
 * Standard create/edit dialog skeleton shared by every Job/Survey/Doctor
 * entity form: `Dialog` -> `DialogContent` -> `DialogHeader`+`DialogTitle` ->
 * centered spinner while the edit-detail query loads, or the form once
 * ready. Pass `isLoading` only for edit dialogs backed by a detail query;
 * create dialogs have nothing to wait on.
 */
export function EntityFormDialog({
  open,
  onOpenChange,
  title,
  contentClassName,
  isLoading = false,
  children,
}: EntityFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn('sm:max-w-md md:max-w-lg lg:max-w-xl', contentClassName)}
      >
        <DialogHeader className='border-border-subtle gap-3 border-b pb-3'>
          <DialogTitle className='text-lg font-extrabold'>{title}</DialogTitle>
        </DialogHeader>
        {/*
         * `DialogContent` caps its own height and sets `overflow-hidden`, and
         * its grid gives this row `minmax(0,1fr)` — so without a scroll
         * container here a form taller than the viewport is silently clipped
         * rather than scrolled. `min-h-0` keeps the row free to shrink below
         * its content; `pe-1` stops the scrollbar sitting on top of focus
         * rings. Always rendered (skeleton included) so `DialogContent` keeps
         * exactly the two grid rows its template declares.
         */}
        <div className='min-h-0 overflow-y-auto pe-1'>
          {isLoading ? <FieldsSkeleton /> : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
