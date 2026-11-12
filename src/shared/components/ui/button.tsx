import * as React from 'react';
import { type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/shared/lib/utils';
import { buttonVariants } from '@/shared/components/ui/button-variants';
import { useHasPermission } from '@/shared/permissions/has-permission';
import type { PermissionInput } from '@/shared/permissions/permission-types';

/**
 * `permission` gates the button internally: not granted → renders nothing.
 * Omit it and the button behaves exactly as before. An array means any-of.
 *
 * @example
 * <Button permission={['academy', 'create:course']} onClick={onCreate}>
 *   {t('job.create')}
 * </Button>
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  permission,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    permission?: PermissionInput;
  }) {
  const Comp = asChild ? Slot.Root : 'button';
  const allowed = useHasPermission(permission);

  if (!allowed) return null;

  return (
    <Comp
      data-slot='button'
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
