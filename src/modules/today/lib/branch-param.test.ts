import { describe, expect, it } from 'vitest';
import {
  formatBranchParam,
  parseBranchParam,
  toggleBranchId,
} from './branch-param';

describe('parseBranchParam', () => {
  it('returns no ids for a missing or empty param', () => {
    expect(parseBranchParam(null)).toEqual([]);
    expect(parseBranchParam(undefined)).toEqual([]);
    expect(parseBranchParam('')).toEqual([]);
  });

  it('reads comma-separated ids, sorted', () => {
    expect(parseBranchParam('7,3')).toEqual([3, 7]);
    expect(parseBranchParam(' 12 , 4 ')).toEqual([4, 12]);
  });

  it('drops junk, zero, negatives, decimals and duplicates', () => {
    expect(parseBranchParam('3,abc,,0,-2,1.5,3,7,7')).toEqual([3, 7]);
    expect(parseBranchParam('99999999999999999999')).toEqual([]);
  });
});

describe('formatBranchParam', () => {
  it('removes the param when nothing is chosen', () => {
    expect(formatBranchParam([])).toBeNull();
    expect(formatBranchParam([0, -1])).toBeNull();
  });

  it('joins sorted, unique ids', () => {
    expect(formatBranchParam([7, 3, 7])).toBe('3,7');
  });

  it('round-trips with parseBranchParam', () => {
    expect(parseBranchParam(formatBranchParam([5, 2, 9]))).toEqual([2, 5, 9]);
  });
});

describe('toggleBranchId', () => {
  it('adds and removes one id', () => {
    expect(toggleBranchId([3], 1, true)).toEqual([1, 3]);
    expect(toggleBranchId([1, 3], 3, false)).toEqual([1]);
  });

  it('does not duplicate an id already chosen', () => {
    expect(toggleBranchId([3], 3, true)).toEqual([3]);
  });
});
