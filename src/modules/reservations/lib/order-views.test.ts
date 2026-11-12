import { describe, expect, it } from 'vitest';
import { OrderStatus } from '@/shared/api/enums';
import { toDateOnly } from '@/shared/components/layout/form/date-utils';
import type { Order } from '@/modules/reservations/api/types';
import {
  fitParam,
  groupByBoardColumn,
  groupByLocalDay,
  parseFitFilter,
  parseOrderView,
  parseWeekParam,
  weekDays,
  weekRange,
} from '@/modules/reservations/lib/order-views';

const order = (id: string, status: OrderStatus, dateChosen: string) =>
  ({ id, status, dateChosen }) as Order;

describe('order views', () => {
  it('parses view and fit params with safe defaults', () => {
    expect(parseOrderView('board')).toBe('board');
    expect(parseOrderView('nope')).toBe('table');
    expect(parseOrderView(null)).toBe('table');
    expect(parseFitFilter('unfit')).toBe('unfit');
    expect(parseFitFilter('x')).toBe('all');
    expect(fitParam('all')).toBeUndefined();
    expect(fitParam('fit')).toBe(true);
    expect(fitParam('unfit')).toBe(false);
  });

  it('starts weeks on Saturday', () => {
    // 2026-11-12 is a Thursday.
    expect(toDateOnly(parseWeekParam('2026-11-12'))).toBe('2026-11-07');
    expect(toDateOnly(parseWeekParam('2026-11-07'))).toBe('2026-11-07');
    expect(toDateOnly(parseWeekParam('bad', new Date(2026, 10, 13)))).toBe(
      '2026-11-07',
    );
    const days = weekDays(parseWeekParam('2026-11-07')).map(toDateOnly);
    expect(days).toHaveLength(7);
    expect(days[6]).toBe('2026-11-13');
  });

  it('spans the whole local week', () => {
    const start = parseWeekParam('2026-11-07');
    const { from, to } = weekRange(start);
    expect(new Date(from).getTime()).toBe(start.getTime());
    expect(new Date(to).getTime() - new Date(from).getTime()).toBe(
      7 * 86_400_000 - 1,
    );
  });

  it('groups by board column in time order, dropping other statuses', () => {
    const cols = groupByBoardColumn([
      order('b', OrderStatus.Accept, '2026-11-10T10:00:00'),
      order('a', OrderStatus.Accept, '2026-11-10T08:00:00'),
      order('c', OrderStatus.Reject, '2026-11-10T08:00:00'),
      order('d', OrderStatus.Delayed, '2026-11-01T08:00:00'),
    ]);
    expect(cols.accepted.map((o) => o.id)).toEqual(['a', 'b']);
    expect(cols.delayed.map((o) => o.id)).toEqual(['d']);
    expect(Object.values(cols).flat()).toHaveLength(3);
  });

  it('groups by local appointment day (UTC input)', () => {
    const utc = '2026-11-10T12:00:00';
    const map = groupByLocalDay([order('a', OrderStatus.Accept, utc)]);
    const localDay = toDateOnly(new Date(`${utc}Z`));
    expect(map.get(localDay)?.map((o) => o.id)).toEqual(['a']);
  });
});
