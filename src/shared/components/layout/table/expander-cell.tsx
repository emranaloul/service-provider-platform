import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/components/ui/button';

interface ExpanderCellProps {
  /** The full text. Only plain text is supported (no HTML — see note below). */
  text: string;
  /** Character count before truncation (guide default 40). */
  threshold?: number;
  className?: string;
}

/**
 * Truncating text cell with show-more / show-less (guide §4.5 `CustomCell` /
 * `CustomDescriptionCell` / `CustomTestExpander`). Short text renders inline.
 *
 * Plain text only by design: the guide's HTML variant used unsanitized
 * `dangerouslySetInnerHTML` (flagged in §8). If a column ever needs rich HTML,
 * add DOMPurify and sanitize here first — do not reintroduce the raw injection.
 */
export function ExpanderCell({
  text,
  threshold = 40,
  className,
}: ExpanderCellProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > threshold;

  if (!needsToggle) {
    return (
      <span className={cn('text-text-secondary text-[13px]', className)}>
        {text}
      </span>
    );
  }

  return (
    <div
      className={cn('text-text-secondary max-w-[450px] text-[13px]', className)}
    >
      <span>{expanded ? text : `${text.slice(0, threshold)}…`}</span>{' '}
      <Button
        type='button'
        variant='link'
        size='xs'
        className='h-auto p-0 align-baseline'
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded
          ? t('common.showLess', { defaultValue: 'Show less' })
          : t('common.showMore', { defaultValue: 'Show more' })}
      </Button>
    </div>
  );
}
