import { describe, expect, it } from 'vitest';
import {
  formatTagParam,
  parseTagParam,
  toggleTagId,
} from '@/modules/branches/lib/tag-param';

describe('parseTagParam', () => {
  it('returns no ids for a missing or empty param', () => {
    expect(parseTagParam(null)).toEqual([]);
    expect(parseTagParam(undefined)).toEqual([]);
    expect(parseTagParam('')).toEqual([]);
  });

  it('reads comma-separated ids in order', () => {
    expect(parseTagParam('3,7,1')).toEqual([3, 7, 1]);
    expect(parseTagParam(' 3 , 7 ')).toEqual([3, 7]);
  });

  it('drops invalid, non-positive and duplicate ids', () => {
    expect(parseTagParam('3,,abc,0,-2,1.5,7,3')).toEqual([3, 7]);
    expect(parseTagParam('99999999999999999999')).toEqual([]);
  });
});

describe('formatTagParam', () => {
  it('joins ids, or removes the param when empty', () => {
    expect(formatTagParam([3, 7])).toBe('3,7');
    expect(formatTagParam([])).toBeNull();
  });

  it('round-trips through parseTagParam', () => {
    expect(parseTagParam(formatTagParam([5, 2]))).toEqual([5, 2]);
  });
});

describe('toggleTagId', () => {
  it('adds and removes one id', () => {
    expect(toggleTagId([3], 7, true)).toEqual([3, 7]);
    expect(toggleTagId([3, 7], 3, false)).toEqual([7]);
    expect(toggleTagId([3, 7], 3, true)).toEqual([3, 7]);
    expect(toggleTagId([3], 7, false)).toEqual([3]);
  });
});
