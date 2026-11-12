import type * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { Loader2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/utils';
import { spinnerVariants } from '@/shared/components/ui/spinner-variants';

/**
 * The inline busy indicator (a pending button, a combobox loading options).
 * Never a first-load state — those are skeletons (CLAUDE.md hard rule 4).
 */
function Spinner({
  className,
  size,
  ...props
}: React.ComponentProps<'svg'> & VariantProps<typeof spinnerVariants>) {
  const { t } = useTranslation('shell');
  return (
    <Loader2Icon
      data-slot='spinner'
      role='status'
      aria-label={t('common.loading')}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    />
  );
}

export { Spinner };
