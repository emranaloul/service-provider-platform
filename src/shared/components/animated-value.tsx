import type { ReactNode } from 'react';
import { CountUp } from '@/shared/components/count-up';

// The first figure in a formatted value: Latin digits, optional thousands
// groups (`,` or the Arabic `٬`) and an optional fraction (`.` or `٫`) — what
// `money()` and plain counts produce in both languages.
const FIGURE =
  /-?\d{1,3}(?:([,٬])\d{3})+(?:([.٫])(\d+))?|-?\d+(?:([.٫])(\d+))?/;

/**
 * Counts the figure inside a card's value up from 0 while keeping the text
 * around it ("SAR 1,250.00", "75%", "3 / 12"). A plain number counts as is;
 * anything without a figure (a placeholder "—") renders untouched.
 */
export function AnimatedValue({ value }: { value: ReactNode }) {
  if (typeof value === 'number') return <CountUp value={value} />;
  if (typeof value !== 'string') return value;
  const match = FIGURE.exec(value);
  if (!match) return value;

  const [figure, group, groupedPoint, groupedFraction, point, fraction] = match;
  const decimalSep = groupedPoint ?? point ?? '.';
  const decimals = (groupedFraction ?? fraction ?? '').length;
  const target = Number(
    figure.replaceAll(group ?? ',', '').replace(decimalSep, '.'),
  );
  const before = value.slice(0, match.index);
  const after = value.slice(match.index + figure.length);

  const format = (n: number) => {
    const [whole, frac] = Math.abs(n).toFixed(decimals).split('.');
    const grouped = group
      ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, group)
      : whole;
    const sign = n < 0 && Number(n.toFixed(decimals)) !== 0 ? '-' : '';
    return `${before}${sign}${grouped}${frac ? decimalSep + frac : ''}${after}`;
  };

  return <CountUp value={target} format={format} />;
}
