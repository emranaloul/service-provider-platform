import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

interface FormFooterProps {
  isPending: boolean;
  saveLabel: string;
  savingLabel: string;
  className?: string;
  /** Override the save button's own classes (e.g. a taller height for a specific form). */
  buttonClassName?: string;
  /**
   * Permission required to submit (array = any-of) — e.g.
   * `['academy', 'update:course']`. Not granted → the whole save row disappears,
   * leaving the form read-only.
   */
  permission?: PermissionInput;
  /**
   * With both set the row becomes the dialog footer of the design: a rule
   * above, `Cancel` then the save button, end-aligned and auto-width.
   */
  cancelLabel?: string;
  onCancel?: () => void;
  /** Blocks saving until the form can be submitted (e.g. a price still loading). */
  disabled?: boolean;
}

/** Standard save row for entity forms — save button shows a spinner + "saving" label while pending. */
export function FormFooter({
  isPending,
  saveLabel,
  savingLabel,
  className,
  buttonClassName,
  permission,
  cancelLabel,
  onCancel,
  disabled,
}: FormFooterProps) {
  const allowed = useHasPermission(permission);
  if (!allowed) return null;

  const hasCancel = !!onCancel && !!cancelLabel;

  return (
    <div
      className={
        className ??
        (hasCancel
          ? 'border-border-subtle flex items-center justify-end gap-2.5 border-t pt-4'
          : 'flex flex-col gap-2.5 pt-2')
      }
    >
      {hasCancel && (
        <Button
          type='button'
          variant='secondary'
          disabled={isPending}
          onClick={onCancel}
          className='h-10 rounded-[10px] px-5 text-[13.5px] font-bold'
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type='submit'
        disabled={isPending || disabled}
        className={
          buttonClassName ??
          // theme.md §4.1 Primary.
          cn(
            'bg-action text-action-foreground h-10 gap-2 rounded-[10px] text-[13.5px] font-bold hover:brightness-110',
            hasCancel ? 'px-5' : 'w-full',
          )
        }
      >
        {isPending && <Spinner />}
        {isPending ? savingLabel : saveLabel}
      </Button>
    </div>
  );
}
