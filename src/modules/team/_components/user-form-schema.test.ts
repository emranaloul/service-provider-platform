import { describe, expect, it } from 'vitest';
import { toDateOnly } from '@/shared/components/layout/form/date-utils';
import { dateOfBirthFromApi } from '@/modules/team/_components/user-form-schema';

describe('dateOfBirthFromApi', () => {
  it('keeps the calendar day of a value without a time zone', () => {
    const d = dateOfBirthFromApi('1990-05-01T00:00:00');
    expect(d).not.toBeNull();
    expect(toDateOnly(d as Date)).toBe('1990-05-01');
    expect(d?.getHours()).toBe(0);
  });

  it('ignores the time and offset part', () => {
    const d = dateOfBirthFromApi('1990-05-01T23:30:00-05:00');
    expect(toDateOnly(d as Date)).toBe('1990-05-01');
  });

  it('reads a plain date', () => {
    expect(toDateOnly(dateOfBirthFromApi('2000-12-31') as Date)).toBe(
      '2000-12-31',
    );
  });

  it('returns null for empty or invalid values', () => {
    expect(dateOfBirthFromApi(null)).toBeNull();
    expect(dateOfBirthFromApi(undefined)).toBeNull();
    expect(dateOfBirthFromApi('')).toBeNull();
    expect(dateOfBirthFromApi('not a date')).toBeNull();
    expect(dateOfBirthFromApi('1990-13-45')).toBeNull();
  });
});
