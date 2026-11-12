import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows Tailwind's default font sizes. Without this, a
 * custom size from `index.css` (`text-small`, `text-figure`, …) and a colour
 * token (`text-ink-2`, `text-hero-accent`) look like the same group and the
 * size is silently dropped.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'h1',
            'h2',
            'body',
            'small',
            'label',
            'figure',
            'figure-lg',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
