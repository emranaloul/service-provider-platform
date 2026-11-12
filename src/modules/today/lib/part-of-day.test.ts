import { describe, expect, it } from 'vitest';
import { partOfDay } from './part-of-day';

describe('partOfDay', () => {
  it('splits the day into morning, afternoon and evening', () => {
    expect(partOfDay(0)).toBe('morning');
    expect(partOfDay(11)).toBe('morning');
    expect(partOfDay(12)).toBe('afternoon');
    expect(partOfDay(16)).toBe('afternoon');
    expect(partOfDay(17)).toBe('evening');
    expect(partOfDay(23)).toBe('evening');
  });
});
