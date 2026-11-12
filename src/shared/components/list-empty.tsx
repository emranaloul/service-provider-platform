import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ListEmptyProps {
  /** i18n namespace to read `empty` from; omit to pass a literal `label` instead. */
  ns?: string;
  label?: string;
  className?: string;
}

/** Generic "no results" state for a list/table with zero rows — pass the module's own i18n namespace via `ns`, or a literal `label`. */
export function ListEmpty({ ns, label, className }: ListEmptyProps) {
  const { t } = useTranslation(ns);
  return (
    <div
      className={cn(
        'bg-card shadow-card flex flex-col items-center gap-2.5 rounded-2xl p-10 text-center',
        className,
      )}
    >
      <Inbox className='text-muted-foreground size-8' />
      <p className='text-text-secondary text-[13.5px]'>
        {label ?? t('empty', { ns })}
      </p>
    </div>
  );
}
