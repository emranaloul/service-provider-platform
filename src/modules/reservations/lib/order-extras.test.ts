import { describe, expect, it } from 'vitest';
import { FaqType, RequestChannel, RequestFunding } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import {
  hasAnyAreaPermission,
  PermissionArea,
} from '@/shared/permissions/backend-flags';
import { providerFaqs, type Faq } from '@/modules/profile/api/faqs';
import {
  orderVaccinesError,
  orderVaccinesPayload,
} from '@/modules/reservations/api/order-vaccines';
import { parseOrderScanLink } from '@/modules/reservations/api/public-order';
import {
  orderChannel,
  orderFunding,
} from '@/modules/reservations/lib/order-labels';

const asMap = (body: Record<string, unknown>) =>
  Object.fromEntries(
    [...toFormData(body as never).entries()].map(([k, v]) => [k, String(v)]),
  );

describe('order vaccines (missing items §5)', () => {
  it('sends new complete rows and removals; ignores half-filled rows', () => {
    const body = orderVaccinesPayload('r1', {
      removedIds: [40],
      added: [
        { vaccineId: 3, slotTimeId: 101 },
        { vaccineId: 4, slotTimeId: null },
      ],
    });
    expect(asMap(body!)).toEqual({
      Id: 'r1',
      'ReservationVaccines[0].vaccineId': '3',
      'ReservationVaccines[0].slotTimeId': '101',
      'ReservationVaccines[0].isDeleted': 'false',
      'ReservationVaccines[1].id': '40',
      'ReservationVaccines[1].vaccineId': '0',
      'ReservationVaccines[1].slotTimeId': '0',
      'ReservationVaccines[1].isDeleted': 'true',
      ReservationServices: 'null',
    });
  });

  it('skips the call when nothing changed', () => {
    expect(
      orderVaccinesPayload('r1', {
        removedIds: [],
        added: [{ vaccineId: null, slotTimeId: null }],
      }),
    ).toBeNull();
  });

  it('keeps the last item of a vaccine-only reservation', () => {
    const order = {
      reservationServices: { id: 1, services: [], groupServices: [] },
      reservationVaccines: [{ id: 40, vaccineId: 3, slotTimeId: 101 }],
    };
    expect(orderVaccinesError(order, { removedIds: [40], added: [] })).toBe(
      'lastItem',
    );
    expect(
      orderVaccinesError(order, {
        removedIds: [40],
        added: [{ vaccineId: 5, slotTimeId: 102 }],
      }),
    ).toBeNull();
  });
});

describe('order labels (missing items §7)', () => {
  it('prefers requestFlow, ignores unknown values', () => {
    expect(
      orderChannel({ requestFlow: { channel: 5 }, requestChannel: 3 }),
    ).toBe(RequestChannel.App);
    expect(orderChannel({ requestFlow: null, requestChannel: 3 })).toBe(
      RequestChannel.Site,
    );
    expect(orderFunding({ requestFlow: null, requestFunding: 99 })).toBeNull();
    expect(orderFunding({ requestFlow: { funding: 3 } })).toBe(
      RequestFunding.Wallet,
    );
  });
});

describe('QR link (missing items §8)', () => {
  it('reads the reservation id from a scanned link', () => {
    expect(
      parseOrderScanLink(
        'https://portal.example/public/orderscantoverify/AB12-34/2',
      ),
    ).toEqual({ reservationId: 'AB12-34', langId: 2 });
    expect(parseOrderScanLink('hello')).toBeNull();
  });
});

describe('company-area order bits (missing items §1)', () => {
  it('checks 2^52 and the company-extended area with BigInt', () => {
    const granted = [
      { type: PermissionArea.Company, permission: '4503599627370496' },
      { type: PermissionArea.CompanyExtended, permission: 16 },
    ];
    expect(hasAnyAreaPermission(granted, 'cancel:company-orders')).toBe(true);
    expect(hasAnyAreaPermission(granted, 'complete:company-orders')).toBe(
      false,
    );
    expect(hasAnyAreaPermission(granted, 'update:order-vaccines')).toBe(true);
    expect(hasAnyAreaPermission(granted, 'view:order-vaccines')).toBe(false);
  });
});

describe('FAQs (missing items §4)', () => {
  it('shows active Provider and All items, by rank', () => {
    const faq = (id: number, type: FaqType, rank: number, status = true) =>
      ({ id, type, rank, status, attachments: null, translations: [] }) as Faq;
    expect(
      providerFaqs([
        faq(1, FaqType.All, 3),
        faq(2, FaqType.Company, 1),
        faq(3, FaqType.Provider, 2),
        faq(4, FaqType.Provider, 1, false),
      ]).map((f) => f.id),
    ).toEqual([3, 1]);
  });
});
