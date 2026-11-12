import { describe, expect, it } from 'vitest';
import { OrderStatus } from '@/shared/api/enums';
import { toTagOption } from '@/shared/api/lookups';
import { statusTargets } from '@/modules/reservations/lib/order-rules';
import { normalizeUsername } from '@/modules/auth/lib/auth-rules';

/** Rules from the A-to-Z reference that the portal must follow exactly. */
describe('A-Z reference', () => {
  it('§13.4 offers Check-in and In progress while the order is changeable', () => {
    expect(statusTargets(OrderStatus.New)).toEqual([
      OrderStatus.CheckIn,
      OrderStatus.InProgress,
    ]);
    expect(statusTargets(OrderStatus.Accept)).toEqual([
      OrderStatus.CheckIn,
      OrderStatus.InProgress,
    ]);
    expect(statusTargets(OrderStatus.CheckIn)).toEqual([
      OrderStatus.InProgress,
    ]);
    expect(statusTargets(OrderStatus.InProgress)).toEqual([
      OrderStatus.CheckIn,
    ]);
    expect(statusTargets(OrderStatus.Complete)).toEqual([]);
    expect(statusTargets(OrderStatus.Delayed)).toEqual([]);
  });

  it('§20.4 a tag without a name is "Unnamed Tag"', () => {
    expect(toTagOption({ id: 3, name: 'VIP' }).name).toBe('VIP');
    expect(toTagOption({ id: 4, name: '  ' }).name).not.toBe('  ');
    expect(toTagOption({ id: 5, name: null }).name).not.toBe('#5');
  });

  it('§19.7.1 the forgot-password username is trimmed and lower-cased', () => {
    expect(normalizeUsername(' Nurse@Clinic.COM ')).toBe('nurse@clinic.com');
  });
});
