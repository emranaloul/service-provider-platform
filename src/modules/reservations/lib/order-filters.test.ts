import { describe, expect, it } from 'vitest';
import {
  OrderStatus,
  RequestChannel,
  RequestFunding,
} from '@/shared/api/enums';
import {
  clearFiltersPatch,
  countActiveFilters,
  dayRangeToUtc,
  digitsOnly,
  excludedStatuses,
  MORE_FILTER_PARAMS,
  ORDER_FILTER_PARAMS,
  parseChannel,
  parseDayParam,
  parseExcludedStatus,
  parseFunding,
  toggleExcludedStatus,
} from '@/modules/reservations/lib/order-filters';

describe('parseChannel / parseFunding', () => {
  it('reads known values', () => {
    expect(parseChannel('5')).toBe(RequestChannel.App);
    expect(parseFunding('6')).toBe(RequestFunding.Unfunded);
  });

  it('treats missing, unknown and junk values as all', () => {
    expect(parseChannel(null)).toBeUndefined();
    expect(parseChannel('')).toBeUndefined();
    expect(parseChannel('0')).toBeUndefined();
    expect(parseChannel('9')).toBeUndefined();
    expect(parseFunding('abc')).toBeUndefined();
    expect(parseFunding('1.5')).toBeUndefined();
  });
});

describe('digitsOnly', () => {
  it('keeps digits only', () => {
    expect(digitsOnly(' 10a2-3 4 ')).toBe('10234');
    expect(digitsOnly('abc')).toBe('');
  });
});

describe('countActiveFilters', () => {
  it('counts set params and ignores empty / all / others', () => {
    const params = new URLSearchParams(
      'funding=2&idn=&city=all&view=board&branch=3',
    );
    expect(countActiveFilters(params, MORE_FILTER_PARAMS)).toBe(1);
    expect(countActiveFilters(params, ORDER_FILTER_PARAMS)).toBe(2);
  });
});

describe('clearFiltersPatch', () => {
  it('nulls every filter param and nothing else', () => {
    const patch = clearFiltersPatch();
    expect(Object.keys(patch).sort()).toEqual([...ORDER_FILTER_PARAMS].sort());
    expect(Object.values(patch).every((v) => v === null)).toBe(true);
    expect(patch).not.toHaveProperty('view');
    expect(patch).not.toHaveProperty('order');
  });
});

describe('more filters include phone, range and excluded statuses', () => {
  it('counts them', () => {
    const params = new URLSearchParams(
      'phone=05&from=2026-01-01&to=2026-01-31&excl=132',
    );
    expect(countActiveFilters(params, MORE_FILTER_PARAMS)).toBe(4);
    expect(clearFiltersPatch()).toMatchObject({
      phone: null,
      from: null,
      to: null,
      excl: null,
    });
  });
});

describe('parseExcludedStatus', () => {
  it('keeps known bits only', () => {
    expect(parseExcludedStatus('132')).toBe(132);
    expect(parseExcludedStatus(String(132 + 1024))).toBe(132);
  });

  it('treats missing, zero and junk as unset', () => {
    expect(parseExcludedStatus(null)).toBeUndefined();
    expect(parseExcludedStatus('')).toBeUndefined();
    expect(parseExcludedStatus('0')).toBeUndefined();
    expect(parseExcludedStatus('1024')).toBeUndefined();
    expect(parseExcludedStatus('-4')).toBeUndefined();
    expect(parseExcludedStatus('4.5')).toBeUndefined();
    expect(parseExcludedStatus('abc')).toBeUndefined();
  });
});

describe('excludedStatuses / toggleExcludedStatus', () => {
  it('splits a mask in bit order', () => {
    expect(excludedStatuses(132)).toEqual([
      OrderStatus.Cancel,
      OrderStatus.NoShow,
    ]);
    expect(excludedStatuses(undefined)).toEqual([]);
  });

  it('adds and removes bits, dropping the param when empty', () => {
    expect(toggleExcludedStatus(undefined, OrderStatus.Cancel, true)).toBe('4');
    expect(toggleExcludedStatus(4, OrderStatus.NoShow, true)).toBe('132');
    expect(toggleExcludedStatus(4, OrderStatus.Cancel, true)).toBe('4');
    expect(toggleExcludedStatus(132, OrderStatus.Cancel, false)).toBe('128');
    expect(toggleExcludedStatus(4, OrderStatus.Cancel, false)).toBeNull();
  });
});

describe('parseDayParam / dayRangeToUtc', () => {
  it('accepts yyyy-MM-dd only', () => {
    expect(parseDayParam('2026-03-09')).toBe('2026-03-09');
    expect(parseDayParam('2026-13-01')).toBeUndefined();
    expect(parseDayParam('soon')).toBeUndefined();
    expect(parseDayParam(null)).toBeUndefined();
  });

  it('spans local start of the first day to local end of the last', () => {
    expect(dayRangeToUtc('2026-03-09', '2026-03-10')).toEqual({
      from: new Date(2026, 2, 9).toISOString(),
      to: new Date(2026, 2, 10, 23, 59, 59, 999).toISOString(),
    });
    expect(dayRangeToUtc(undefined, undefined)).toEqual({
      from: undefined,
      to: undefined,
    });
  });
});
