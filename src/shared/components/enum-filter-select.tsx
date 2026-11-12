import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

interface EnumFilterSelectProps<T extends string | number> {
  label: string;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  options: { value: T; label: string }[];
  /** i18n namespace the "All" option's label (`common.all`) is read from. */
  ns: string;
  className?: string;
}

/**
 * Generic "All / one of N enum values" dropdown for a list's enum filters
 * (owner/screeningType/isActive/riskClassification/…) — shared across
 * modules (`survey`, `job`, …) rather than duplicated per module, since the
 * shape is identical everywhere and only the `common.all` namespace differs.
 */
export function EnumFilterSelect<T extends string | number>({
  label,
  value,
  onChange,
  options,
  ns,
  className,
}: EnumFilterSelectProps<T>) {
  const { t } = useTranslation(ns);
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-text-tertiary text-[11px] font-bold'>{label}</span>
      <Select
        value={value === undefined ? 'all' : String(value)}
        onValueChange={(v) => {
          if (v === 'all') {
            onChange(undefined);
            return;
          }
          const match = options.find((opt) => String(opt.value) === v);
          onChange(match?.value);
        }}
      >
        <SelectTrigger className={className ?? 'min-w-40'}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>{t('common.all')}</SelectItem>
          {options.map((opt) => (
            <SelectItem key={String(opt.value)} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
