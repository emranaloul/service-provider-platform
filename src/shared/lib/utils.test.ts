import { describe, expect, it } from 'vitest';
import { cn } from '@/shared/lib/utils';

describe('cn', () => {
  it('keeps a custom font size next to a colour token', () => {
    expect(cn('text-figure', 'text-hero-accent')).toBe(
      'text-figure text-hero-accent',
    );
    expect(cn('text-small', 'text-ink-2')).toBe('text-small text-ink-2');
  });

  it('still lets a later size win over an earlier one', () => {
    expect(cn('text-small', 'text-h2')).toBe('text-h2');
  });
});
