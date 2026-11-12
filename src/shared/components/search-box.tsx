import { Search } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/components/ui/input';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Prototype search input: 🔍 icon inset, max-width 420px, subtle border, navy focus ring. */
export function SearchBox({
  value,
  onChange,
  placeholder,
  className,
}: SearchBoxProps) {
  return (
    <div className={cn('relative w-full max-w-105', className)}>
      <Search
        size={14}
        className='text-muted-foreground pointer-events-none absolute inset-s-3.25 top-1/2 -translate-y-1/2'
      />
      {/* theme.md §4.6 search box: the 44px field with a 38px start inset. */}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className='focus-visible:border-action h-11 w-full ps-9.5 pe-3.5 text-sm'
      />
    </div>
  );
}
