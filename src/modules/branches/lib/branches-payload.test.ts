import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import { WeekDay } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import type {
  Branch,
  BranchService,
  BranchVaccine,
  Slot,
} from '@/modules/branches/api/types';
import {
  branchFormDefaults,
  branchFormSchema,
  branchPayload,
} from '@/modules/branches/lib/branch-form';
import {
  branchServiceCreatePayload,
  branchServiceUpdatePayload,
  offeringFormSchema,
  vaccineCreatePayload,
  vaccineUpdatePayload,
  type OfferingFormValues,
} from '@/modules/branches/lib/offering-form';
import {
  buildSchedule,
  openDays,
  setSchedulePayload,
  validateSchedule,
  vaccineLinkChanges,
} from '@/modules/branches/lib/slot-schedule';

const t = ((key: string) => key) as unknown as TFunction<'branches'>;
const entries = (body: Record<string, unknown>) =>
  Object.fromEntries(
    [...toFormData(body as never).entries()].map(([k, v]) => [k, String(v)]),
  );

const BRANCH: Branch = {
  id: 12,
  email: 'a@b.co',
  phone: '0551234567',
  firstName: 'A',
  lastName: 'B',
  logo: null,
  latitude: 24.7,
  longitude: 46.6,
  countryId: 14,
  countryName: 'SA',
  cityId: 12,
  cityName: 'Riyadh',
  serviceProviderId: 4,
  serviceProvider: 'P',
  serviceProviderClosingDay: WeekDay.Friday | WeekDay.Saturday,
  serviceProviderClassificationId: 2,
  status: true,
  tags: [{ id: 90, tagId: 3, tagName: 'x' }],
  translations: [
    {
      id: 17,
      serviceProviderBranchId: 12,
      langId: 1,
      name: 'Olaya',
      address: 'St',
    },
  ],
};

describe('branch form (§8)', () => {
  it('requires the Arabic address once an Arabic name is given', () => {
    const values = { ...branchFormDefaults(BRANCH, 4), nameAr: 'العليا' };
    const result = branchFormSchema(t).safeParse(values);
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.path.join('.'))).toContain(
      'addressAr',
    );
  });

  it('accepts +966 phones (§18.6) and strips spaces', () => {
    const parsed = branchFormSchema(t).parse({
      ...branchFormDefaults(BRANCH, 4),
      phone: '+966 55 123 4567',
    });
    expect(parsed.phone).toBe('+966551234567');
  });

  it('builds the update payload with translation ids and a tag diff', () => {
    const values = branchFormSchema(t).parse({
      ...branchFormDefaults(BRANCH, 4),
      nameAr: 'العليا',
      addressAr: 'شارع',
      tagIds: ['7'],
    });
    expect(entries(branchPayload(values, BRANCH))).toMatchObject({
      Id: '12',
      ServiceProviderId: '4',
      ServiceProviderClassificationId: '2',
      'Translations[0].id': '17',
      'Translations[0].serviceProviderBranchId': '12',
      'Translations[0].langId': '1',
      'Translations[1].id': '0',
      'Translations[1].langId': '2',
      'Translations[1].name': 'العليا',
      'Tags[0].id': '90',
      'Tags[0].tagsId': '3',
      'Tags[0].isDeleted': 'true',
      'Tags[1].id': '0',
      'Tags[1].tagsId': '7',
      'Tags[1].isDeleted': 'false',
    });
  });

  it('leaves the logo out when no new file was picked', () => {
    const values = branchFormSchema(t).parse(branchFormDefaults(BRANCH, 4));
    expect(entries(branchPayload(values, BRANCH))).not.toHaveProperty('Logo');
  });
});

const offering = (patch: Partial<OfferingFormValues>): OfferingFormValues => ({
  kind: 'service',
  itemId: '31',
  cost: '150',
  b2cPrice: '200',
  b2cDiscount: '0',
  b2bPrice: '',
  offDates: [],
  reason: '',
  slotTimeIds: [],
  ...patch,
});

describe('offering form (§10, §11)', () => {
  it('rejects a customer price below cost, and B2B below cost for vaccines', () => {
    const schema = offeringFormSchema(t, null);
    expect(schema.safeParse(offering({ b2cPrice: '100' })).success).toBe(false);
    expect(
      schema.safeParse(offering({ kind: 'vaccine', b2bPrice: '10' })).success,
    ).toBe(false);
    expect(
      schema.safeParse(offering({ kind: 'vaccine', b2bPrice: '150' })).success,
    ).toBe(true);
  });

  it('accepts decimal money (§18.3)', () => {
    expect(
      offeringFormSchema(t, null).safeParse(
        offering({ cost: '10.5', b2cPrice: '12.75' }),
      ).success,
    ).toBe(true);
  });

  it('requires a reason only when unavailable dates change', () => {
    const schema = offeringFormSchema(t, ['2026-12-01']);
    const same = offering({ offDates: [new Date(2026, 11, 1)] });
    expect(schema.safeParse(same).success).toBe(true);
    const changed = offering({ offDates: [new Date(2026, 11, 2)] });
    expect(schema.safeParse(changed).success).toBe(false);
    expect(schema.safeParse({ ...changed, reason: 'Holiday' }).success).toBe(
      true,
    );
  });

  it('sends every service of a group, tagged with the group id', () => {
    const body = branchServiceCreatePayload(
      offering({ kind: 'group', itemId: '7' }),
      12,
      [31, 32],
    );
    expect(entries(body)).toMatchObject({
      B2BPrice: '0',
      'Services[0].serviceId': '31',
      'Services[0].groupedId': '7',
      'Services[1].serviceId': '32',
      'Services[1].groupedId': '7',
    });
  });

  it('update uses serviceProviderBranchServiceId and never "null" (§18.7, §18.8)', () => {
    const s: BranchService = {
      id: 51,
      serviceProviderBranchId: 12,
      serviceProviderBranch: '',
      cost: 1,
      b2CPrice: 2,
      b2BPrice: 0,
      b2CDiscount: 0,
      services: null,
      scheduleOffs: [
        {
          id: 5,
          serviceProviderBranchServiceId: 51,
          date: '2026-12-01T00:00:00',
          isDeleted: false,
        },
      ],
    };
    const fields = entries(
      branchServiceUpdatePayload(offering({ reason: 'x' }), s),
    );
    expect(fields).toMatchObject({
      'Services[0].id': '0',
      'Services[0].serviceProviderBranchServiceId': '51',
      'Services[0].serviceId': '31',
      'ScheduleOffs[0].id': '5',
      'ScheduleOffs[0].isDeleted': 'true',
      'Reason.Reason': 'x',
    });
    expect(Object.values(fields)).not.toContain('null');
  });

  it('vaccine create sends picked slot times as repeated SlotTimeIds (§11.3)', () => {
    const v = offering({
      kind: 'vaccine',
      itemId: '3',
      cost: '40',
      b2cPrice: '60',
      b2bPrice: '55',
      slotTimeIds: ['71', '72'],
    });
    const fd = toFormData(vaccineCreatePayload(v, 12, [71, 72]));
    expect(fd.getAll('SlotTimeIds')).toEqual(['71', '72']);
    expect(entries(vaccineCreatePayload(v, 12, [71, 72]))).toMatchObject({
      ServiceProviderBranchId: '12',
      VaccineId: '3',
      Cost: '40',
      B2CPrice: '60',
      B2BPrice: '55',
    });
    // Without slot times the key is left out entirely.
    expect(toFormData(vaccineCreatePayload(v, 12)).has('SlotTimeIds')).toBe(
      false,
    );
  });

  it('vaccine update resends the original vaccine and branch', () => {
    const v: BranchVaccine = {
      id: 9,
      serviceProviderBranchId: 12,
      vaccineId: 3,
      cost: 1,
      b2CPrice: 1,
      b2BPrice: 1,
    };
    expect(
      vaccineUpdatePayload(
        offering({
          kind: 'vaccine',
          itemId: '99',
          cost: '40',
          b2cPrice: '60',
          b2bPrice: '55',
        }),
        v,
      ),
    ).toEqual({
      id: 9,
      serviceProviderBranchId: 12,
      vaccineId: 3,
      cost: 40,
      b2CPrice: 60,
      b2BPrice: 55,
    });
  });
});

describe('slot schedule (§9)', () => {
  // A fixed reference date, so local↔UTC conversion is the same both ways.
  const ref = new Date(2026, 10, 12);
  const SLOTS: Slot[] = [
    {
      id: 1,
      serviceProviderBranchId: 12,
      serviceProviderBranch: '',
      day: WeekDay.Monday,
      maxOccupancyPerDay: 30,
      slotTimes: [
        {
          id: 101,
          branchServiceSlotId: 1,
          from: '05:00:00',
          to: '07:00:00',
          slotServices: [
            {
              id: 900,
              branchServiceSlotId: 1,
              serviceProviderBranchServiceId: 51,
            },
          ],
        },
      ],
    },
  ];
  const VACCINES: BranchVaccine[] = [
    {
      id: 9,
      serviceProviderBranchId: 12,
      vaccineId: 3,
      cost: 0,
      b2CPrice: 0,
      b2BPrice: 0,
      slotTimes: [{ id: 700, serviceProviderBranchSlotTimeId: 101 }],
    },
  ];

  it('opens every weekday except the provider closing days', () => {
    expect(openDays(WeekDay.Friday | WeekDay.Saturday)).toEqual([
      WeekDay.Sunday,
      WeekDay.Monday,
      WeekDay.Tuesday,
      WeekDay.Wednesday,
      WeekDay.Thursday,
    ]);
  });

  it('starts unsaved days with capacity 1 and one empty time', () => {
    const { days } = buildSchedule(SLOTS, 65, VACCINES, ref);
    const sunday = days.find((d) => d.day === WeekDay.Sunday);
    expect(sunday).toMatchObject({ id: 0, maxOccupancyPerDay: '1' });
    expect(sunday?.times).toHaveLength(1);
    expect(validateSchedule(days).some((e) => e.day === WeekDay.Sunday)).toBe(
      true,
    );
  });

  it('round-trips times and diffs services per slot time', () => {
    const { days, origin } = buildSchedule(SLOTS, 65, VACCINES, ref);
    const monday = days.find((d) => d.day === WeekDay.Monday)!;
    expect(monday.times[0].vaccineIds).toEqual([9]);
    monday.times[0].serviceIds = [52];
    const only = days.map((d) => (d === monday ? d : { ...d, enabled: false }));
    const fields = entries(setSchedulePayload(only, origin, 12, ref));
    expect(fields).toMatchObject({
      'requests[0].id': '1',
      'requests[0].day': '4',
      'requests[0].maxOccupancyPerDay': '30',
      'requests[0].times[0].id': '101',
      'requests[0].times[0].from': '05:00',
      'requests[0].times[0].to': '07:00',
      'requests[0].times[0].services[0].id': '900',
      'requests[0].times[0].services[0].isDeleted': 'true',
      'requests[0].times[0].services[1].id': '0',
      'requests[0].times[0].services[1].serviceProviderBranchServiceId': '52',
    });
    expect(fields).not.toHaveProperty('requests[1].day');
  });

  it('resolves new slot-time ids by (day, UTC from, UTC to) for vaccine links', () => {
    const { days, origin } = buildSchedule(SLOTS, 65, VACCINES, ref);
    const monday = days.find((d) => d.day === WeekDay.Monday)!;
    monday.times[0].vaccineIds = []; // unlink vaccine 9 from 101
    const fresh = { ...monday.times[0], key: 'n', id: 0, vaccineIds: [9] };
    fresh.from = monday.times[0].to;
    fresh.to = '23:00';
    monday.times.push(fresh);

    const saved: Slot[] = [
      {
        ...SLOTS[0],
        slotTimes: [
          ...(SLOTS[0].slotTimes ?? []),
          {
            id: 102,
            branchServiceSlotId: 1,
            from: `${'07:00'}:00`,
            to: '',
            slotServices: [],
          },
        ],
      },
    ];
    // Fill the saved UTC end from the same conversion the payload used.
    const body = setSchedulePayload(days, origin, 12, ref) as {
      requests: { day: number; times: { from: string; to: string }[] }[];
    };
    const sent = body.requests.find((r) => r.day === WeekDay.Monday)!.times[1];
    saved[0].slotTimes![1].from = `${sent.from}:00`;
    saved[0].slotTimes![1].to = `${sent.to}:00`;

    const changes = vaccineLinkChanges(days, origin, saved, ref);
    expect(changes.remove).toEqual([700]);
    expect([...changes.add]).toEqual([[9, [102]]]);
    expect(changes.unresolved).toBe(0);
  });
});
