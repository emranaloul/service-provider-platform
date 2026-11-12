import { describe, expect, it } from 'vitest';
import { LangId, OrderStatus, WEEK_DAYS, WeekDay } from '@/shared/api/enums';
import {
  dateOnlyKey,
  diffChanged,
  diffCollection,
  translationsPayload,
} from '@/shared/api/payload';
import { mediaUrl } from '@/shared/api/media';
import { combineFlags, hasFlag, splitFlags } from '@/shared/lib/bit-flags';
import {
  normalizeTime,
  localTimeToUtc,
  utcTimeToLocal,
} from '@/shared/lib/utc-time';
import {
  hasSpPermission,
  PermissionArea,
} from '@/shared/permissions/backend-flags';

describe('translationsPayload', () => {
  const values = [
    { langId: LangId.En, fields: { Name: ' Hospital ', Description: '' } },
    { langId: LangId.Ar, fields: { Name: '', Description: 'x' } },
  ];

  it('create: only filled names, trimmed, empty fields as ""', () => {
    expect(translationsPayload(values, 'Name')).toEqual([
      { langId: 1, Name: 'Hospital', Description: '' },
    ]);
  });

  it('update: adds row id (0 if new) and the parent FK', () => {
    const both = [
      values[0],
      { langId: LangId.Ar, fields: { Name: 'مستشفى', Description: '' } },
    ];
    expect(
      translationsPayload(both, 'Name', {
        existing: [{ id: 17, langId: 1 }],
        parentKey: 'ServiceProviderCategoryID',
        parentId: 5,
      }),
    ).toEqual([
      {
        id: 17,
        ServiceProviderCategoryID: 5,
        langId: 1,
        Name: 'Hospital',
        Description: '',
      },
      {
        id: 0,
        ServiceProviderCategoryID: 5,
        langId: 2,
        Name: 'مستشفى',
        Description: '',
      },
    ]);
  });
});

describe('diffCollection', () => {
  const existing = [
    { id: 10, key: 3 },
    { id: 11, key: 7 },
  ];

  it('keeps, deletes and adds by business key', () => {
    expect(diffCollection(existing, [7, 9])).toEqual([
      { id: 10, key: 3, isDeleted: true },
      { id: 11, key: 7, isDeleted: false },
      { id: 0, key: 9, isDeleted: false },
    ]);
  });

  it('reports change only when something was added or removed', () => {
    expect(diffChanged(diffCollection(existing, [3, 7]))).toBe(false);
    expect(diffChanged(diffCollection(existing, [3]))).toBe(true);
  });

  it('keys dates by the full day, not the weekday (§18.2)', () => {
    // 2026-10-05 and 2026-10-12 are both Mondays in the same month.
    const dates = [{ id: 1, key: dateOnlyKey('2026-10-05T00:00:00') }];
    expect(diffCollection(dates, ['2026-10-12'])).toEqual([
      { id: 1, key: '2026-10-05', isDeleted: true },
      { id: 0, key: '2026-10-12', isDeleted: false },
    ]);
  });
});

describe('bit flags', () => {
  it('reads a closingDay mask', () => {
    const mask = combineFlags([WeekDay.Friday, WeekDay.Saturday]);
    expect(mask).toBe(65);
    expect(hasFlag(mask, WeekDay.Friday)).toBe(true);
    expect(splitFlags(mask, WEEK_DAYS)).toEqual([
      WeekDay.Saturday,
      WeekDay.Friday,
    ]);
  });

  it('sums excluded statuses', () => {
    expect(combineFlags([OrderStatus.Cancel, OrderStatus.NoShow])).toBe(132);
  });
});

describe('utc time', () => {
  it('normalises seconds away', () => {
    expect(normalizeTime('05:00:00')).toBe('05:00');
    expect(normalizeTime('5:3')).toBe('05:03');
  });

  it('round-trips local ↔ UTC', () => {
    const ref = new Date(2026, 10, 12);
    expect(utcTimeToLocal(localTimeToUtc('08:30', ref), ref)).toBe('08:30');
  });
});

describe('mediaUrl', () => {
  it('returns undefined for empty paths and passes absolute URLs through', () => {
    expect(mediaUrl(null)).toBeUndefined();
    expect(mediaUrl('https://x/y.png')).toBe('https://x/y.png');
  });

  it('strips the leading slash', () => {
    expect(mediaUrl('/content/a.png')?.endsWith('/content/a.png')).toBe(true);
    expect(mediaUrl('/content/a.png')).not.toContain('//content');
  });
});

describe('backend permission flags', () => {
  it('compares flags above 2^53 as BigInt', () => {
    const granted = [
      { type: PermissionArea.ServiceProvider, permission: '17592186044416' },
      { type: PermissionArea.Company, permission: 256 },
    ];
    expect(
      hasSpPermission(granted, 'delete:service-provider-attachments'),
    ).toBe(true);
    expect(hasSpPermission(granted, 'view:service-provider')).toBe(false);
  });
});
