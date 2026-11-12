import { describe, expect, it } from 'vitest';
import {
  claimContext,
  claimedLedgersUrl,
  claimParamKeys,
  clearClaimParams,
  formatIdList,
  parseId,
  parseIdList,
  toggleId,
} from '@/modules/ledgers/lib/claim-filters';

describe('parseIdList', () => {
  it('is empty for a missing or empty param', () => {
    expect(parseIdList(null)).toEqual([]);
    expect(parseIdList(undefined)).toEqual([]);
    expect(parseIdList('')).toEqual([]);
  });

  it('reads positive integer ids, deduped, in order', () => {
    expect(parseIdList('7,3, 7,12')).toEqual([7, 3, 12]);
  });

  it('skips junk, zero, negatives and decimals', () => {
    expect(parseIdList('a,0,-4,2.5,,9')).toEqual([9]);
  });
});

describe('formatIdList', () => {
  it('joins ids, or null when none', () => {
    expect(formatIdList([3, 7])).toBe('3,7');
    expect(formatIdList([])).toBeNull();
  });

  it('round-trips with parseIdList', () => {
    expect(parseIdList(formatIdList([5, 1, 9]))).toEqual([5, 1, 9]);
  });
});

describe('toggleId', () => {
  it('adds once and removes', () => {
    expect(toggleId([1, 2], 3, true)).toEqual([1, 2, 3]);
    expect(toggleId([1, 2], 2, true)).toEqual([1, 2]);
    expect(toggleId([1, 2, 3], 2, false)).toEqual([1, 3]);
  });
});

describe('parseId', () => {
  it('reads a positive integer, else undefined', () => {
    expect(parseId('12')).toBe(12);
    expect(parseId('0')).toBeUndefined();
    expect(parseId('x')).toBeUndefined();
    expect(parseId(null)).toBeUndefined();
  });
});

describe('claimParamKeys', () => {
  it('uses plain names without a prefix', () => {
    expect(claimParamKeys()).toMatchObject({ q: 'q', page: 'page' });
  });

  it('prefixes every key when embedded', () => {
    expect(claimParamKeys('claim')).toEqual({
      q: 'claimQ',
      from: 'claimFrom',
      to: 'claimTo',
      dialog: 'claimDialog',
      page: 'claimPage',
      branch: 'claimBranch',
      services: 'claimServices',
      groups: 'claimGroups',
    });
  });

  it('clears every key', () => {
    expect(clearClaimParams('claim')).toMatchObject({
      claimQ: null,
      claimGroups: null,
    });
  });
});

describe('claimContext', () => {
  it('is the provider without a branch', () => {
    expect(claimContext(4)).toEqual({ ServiceProviderId: 4 });
  });

  it('is the branch when one is fixed', () => {
    expect(claimContext(4, 12)).toEqual({ ServiceProviderBranchId: 12 });
  });
});

describe('claimedLedgersUrl', () => {
  it('opens the Ledgers tab, without dates when the period is unknown', () => {
    expect(claimedLedgersUrl({ from: null, to: null })).toBe(
      '/ledgers?tab=ledgers',
    );
  });

  it('carries the claimed period as local days', () => {
    const url = new URL(
      claimedLedgersUrl({
        from: '2026-03-10T12:00:00Z',
        to: '2026-03-20T12:00:00Z',
      }),
      'http://x',
    );
    expect(url.searchParams.get('from')).toBe('2026-03-10');
    expect(url.searchParams.get('to')).toBe('2026-03-20');
  });
});
