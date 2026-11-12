import { afterEach, describe, expect, it, vi } from 'vitest';
import { http } from '@/shared/api/http-client';
import {
  fetchServiceGroupServiceIds,
  priceFor,
  servicesQuery,
  vaccinesQuery,
} from '@/shared/api/lookups';

const ok = (value: unknown) =>
  Promise.resolve({ data: { isSuccess: true, isFailure: false, value } });

const run = <T>(q: { queryFn?: unknown }) =>
  (q.queryFn as (ctx: unknown) => Promise<T>)({});

describe('lookups (lookup-endpoints reference)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('lists a group as its serviceGroupServices, skipping removed links', async () => {
    const get = vi.spyOn(http, 'get').mockImplementation(() =>
      ok({
        id: 7,
        serviceGroupServices: [
          { id: 1, serviceGroupId: 7, serviceId: 31, isDeleted: false },
          { id: 2, serviceGroupId: 7, serviceId: 32, isDeleted: true },
          { id: 3, serviceGroupId: 7, serviceId: 33, isDeleted: false },
        ],
      }),
    );
    await expect(fetchServiceGroupServiceIds(7)).resolves.toEqual([31, 33]);
    expect(get.mock.calls[0][0]).toBe('Service/ServiceGroup/GetById');
  });

  it('calls Vaccine/List with the city, and active services only', async () => {
    const get = vi
      .spyOn(http, 'get')
      .mockImplementation(() =>
        ok({ data: [{ id: 1, translations: [{ langId: 1, name: 'Flu' }] }] }),
      );
    await run(vaccinesQuery(12));
    await run(servicesQuery());
    const [vaccine, services] = get.mock.calls;
    expect(vaccine[0]).toBe('Vaccine/List?');
    expect(vaccine[1]?.params).toMatchObject({ CityId: 12 });
    expect(services[0]).toBe('Service/Service/List?');
    expect(services[1]?.params).toMatchObject({ status: true });
  });

  it('defaults the price from the branch classification, else 0', () => {
    const pricing = [
      { serviceProviderClassificationId: 1, price: 80 },
      { serviceProviderClassificationId: 2, price: 120 },
    ];
    expect(priceFor(pricing, 2)).toBe(120);
    expect(priceFor(pricing, 9)).toBe(0);
  });

  it('prefers the B2C row of a group, whatever the row order', () => {
    const pricing = [
      { serviceProviderClassificationId: 2, price: 90, isB2CPrice: false },
      { serviceProviderClassificationId: 2, price: 150, isB2CPrice: true },
    ];
    expect(priceFor(pricing, 2)).toBe(150);
    expect(priceFor([pricing[0]], 2)).toBe(90);
  });
});
