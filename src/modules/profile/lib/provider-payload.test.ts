import { describe, expect, it } from 'vitest';
import { AttachmentCategory, WeekDay } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import type { ServiceProvider } from '@/modules/profile/api/types';
import {
  providerPayload,
  providerReasonRequired,
  type ProviderFormValues,
} from '@/modules/profile/lib/provider-payload';
import { canOpenProvider } from '@/modules/profile/lib/provider-access';
import {
  taxonomyErrors,
  taxonomyPayload,
} from '@/modules/settings/api/taxonomy';

const fields = (body: Record<string, unknown>) =>
  [...toFormData(body as never).entries()].map(([k, v]) => [
    k,
    typeof v === 'string' ? v : 'FILE',
  ]);
const asMap = (body: Record<string, unknown>) =>
  Object.fromEntries(fields(body));

const VALUES: ProviderFormValues = {
  nameEn: 'Al Noor',
  nameAr: '',
  email: 'a@b.co',
  phone: '0551234567',
  firstName: 'A',
  lastName: 'B',
  companyName: 'Al Noor LLC',
  crNumber: '1',
  vatNumber: '2',
  bankDetails: 'IBAN',
  status: true,
  categoryId: 3,
  closingDays: [WeekDay.Friday, WeekDay.Saturday],
  closingDates: [],
  reason: '',
  tagIds: [5],
  icon: null,
  attachment: null,
};

const PROVIDER: ServiceProvider = {
  id: 4,
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
  companyName: '',
  crNumber: '',
  vatNumber: '',
  bankDetails: '',
  icon: null,
  attachment: null,
  closingDay: 65,
  status: false,
  categoryId: 3,
  tags: [{ id: 70, tagId: 5, tagName: 'x' }],
  translations: [{ id: 17, serviceProviderId: 4, name: 'Al Noor', langId: 1 }],
  dates: [{ id: 9, closingDate: '2026-12-01T00:00:00', serviceProviderId: 4 }],
  schaduleOffReasons: [],
};

describe('provider payload (§6)', () => {
  it('create: closing-day bitmask, zeroed tags, category file lists', () => {
    const file = new File(['x'], 'p.pdf');
    const body = providerPayload({
      ...VALUES,
      closingDates: ['2026-12-25'],
      reason: 'Holiday',
      files: { [AttachmentCategory.Proposal]: [file, file] },
    });
    const map = asMap(body);
    expect(map).toMatchObject({
      Id: '0',
      ClosingDay: '65',
      'Tags[0].id': '0',
      'Tags[0].serviceProviderId': '0',
      'Tags[0].tagsId': '5',
      'ScheduleOffs[0].closingDate': '2026-12-25',
      'Reason.Reason': 'Holiday',
      'Translations[0].langId': '1',
      'Translations[0].Name': 'Al Noor',
    });
    expect(map).not.toHaveProperty('StatusChanged');
    expect(fields(body).filter(([k]) => k === 'ProposalFiles')).toHaveLength(2);
  });

  it('update: StatusChanged, tag + date diffs, translation ids', () => {
    const map = asMap(
      providerPayload(
        { ...VALUES, closingDates: ['2026-12-02'], reason: 'Moved' },
        PROVIDER,
      ),
    );
    expect(map).toMatchObject({
      Id: '4',
      StatusChanged: 'true',
      'Tags[0].Id': '70',
      'Tags[0].isDeleted': 'false',
      'ScheduleOffs[0].id': '9',
      'ScheduleOffs[0].isDeleted': 'true',
      'ScheduleOffs[1].id': '0',
      'ScheduleOffs[1].closingDate': '2026-12-02',
      'Reason.Reason': 'Moved',
      'Translations[0].id': '17',
      'Translations[0].serviceProviderId': '4',
    });
    expect(map).not.toHaveProperty('Icon');
  });

  it('asks for a reason only when the one-off dates change', () => {
    expect(providerReasonRequired({ closingDates: [] })).toBe(false);
    expect(
      providerReasonRequired({ closingDates: ['2026-12-01'] }, PROVIDER),
    ).toBe(false);
    expect(providerReasonRequired({ closingDates: [] }, PROVIDER)).toBe(true);
  });

  it('only admins or the own provider may open a provider workspace (§17.1)', () => {
    expect(canOpenProvider({ groupId: 3, serviceProviderId: 4 }, 4)).toBe(true);
    expect(canOpenProvider({ groupId: 3, serviceProviderId: 4 }, 5)).toBe(
      false,
    );
    expect(canOpenProvider({ groupId: 1, serviceProviderId: null }, 5)).toBe(
      true,
    );
  });
});

describe('category / classification (§4, §5)', () => {
  const v = {
    rank: 100,
    status: true,
    nameEn: 'Hospital',
    descriptionEn: '',
    nameAr: '',
    descriptionAr: 'وصف',
  };

  it('needs the Arabic name once its description is filled', () => {
    expect(taxonomyErrors(v)).toEqual(['nameAr']);
  });

  it('uses the right translation FK per kind on update', () => {
    const existing = {
      id: 5,
      rank: 100,
      status: true,
      translations: [{ id: 3, langId: 1, name: 'H', description: '' }],
    };
    expect(asMap(taxonomyPayload('classification', v, existing))).toMatchObject(
      {
        Id: '5',
        Rank: '100',
        'Translations[0].id': '3',
        'Translations[0].ServiceProviderClassificationID': '5',
        'Translations[0].Name': 'Hospital',
        'Translations[0].Description': '',
      },
    );
  });
});
