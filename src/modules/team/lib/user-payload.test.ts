import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { toFormData } from '@/shared/api/form-data';
import { isUserExistsError } from '@/modules/team/api/users';
import type { ProviderUser } from '@/modules/team/api/types';
import {
  userErrors,
  userPayload,
  type UserFormValues,
} from '@/modules/team/lib/user-payload';

const asMap = (body: Record<string, unknown>) =>
  Object.fromEntries(
    [...toFormData(body as never).entries()].map(([k, v]) => [
      k,
      typeof v === 'string' ? v : 'FILE',
    ]),
  );

const V: UserFormValues = {
  userName: 'nurse@clinic.com',
  email: '',
  phoneNo: '0501234567',
  firstName: 'Sara',
  lastName: "O'Neil",
  address: 'Olaya St 12',
  postCode: '',
  countryId: 14,
  cityId: 12,
  nationalityId: null,
  identityNumber: '',
  dateOfBirth: '',
  isActive: true,
  roleId: 7,
  branchIds: [12],
  tagIds: [3],
  img: null,
};

describe('provider user (missing items §2)', () => {
  it('validates the §2.6 rules', () => {
    expect(userErrors(V, '2026-11-12')).toEqual({});
    expect(
      userErrors(
        {
          ...V,
          userName: 'nurse',
          firstName: 'Sara1',
          address: '---',
          branchIds: [],
          roleId: null,
          dateOfBirth: '2027-01-01',
          identityNumber: '12a',
        },
        '2026-11-12',
      ),
    ).toEqual({
      userName: 'email',
      firstName: 'name',
      address: 'address',
      branchIds: 'branches',
      roleId: 'required',
      dateOfBirth: 'futureDate',
      identityNumber: 'digits',
    });
  });

  it('create: provider id in CompanyId, group 3, zeroed links', () => {
    expect(asMap(userPayload(V, 4))).toMatchObject({
      Id: '0',
      UserName: 'nurse@clinic.com',
      GroupId: '3',
      CompanyId: '4',
      RoleId: '7',
      AllCompanyBranchesAccess: 'false',
      'UserServiceProviderBranchRequest[0].id': '0',
      'UserServiceProviderBranchRequest[0].userId': '0',
      'UserServiceProviderBranchRequest[0].serviceProviderBranchId': '12',
      'UserServiceProviderBranchRequest[0].isDeleted': 'false',
      'UserTagsRequest[0].id': '0',
      'UserTagsRequest[0].UserId': '0',
      'UserTagsRequest[0].tagsId': '3',
    });
    expect(asMap(userPayload(V, 4))).not.toHaveProperty('ForceAdd');
    expect(asMap(userPayload(V, 4, undefined, true))).toMatchObject({
      ForceAdd: 'true',
    });
  });

  it('update: diffs branches and tags, always sends PostCode / DateOfBirth', () => {
    const user = {
      id: 'u-1',
      userServiceProviderBranches: [
        {
          id: 50,
          serviceProviderBranchId: 11,
          serviceProviderBranchName: '',
          serviceProviderName: '',
        },
      ],
      userTags: [{ id: 60, tagId: 3, tagName: '' }],
    } as ProviderUser;
    expect(asMap(userPayload(V, 4, user))).toMatchObject({
      Id: 'u-1',
      PostCode: '',
      DateOfBirth: '',
      'UserServiceProviderBranchRequest[0].id': '50',
      'UserServiceProviderBranchRequest[0].isDeleted': 'true',
      'UserServiceProviderBranchRequest[1].id': '0',
      'UserServiceProviderBranchRequest[1].serviceProviderBranchId': '12',
      'UserTagsRequest[0].id': '60',
      'UserTagsRequest[0].UserId': 'u-1',
      'UserTagsRequest[0].isDeleted': 'false',
    });
  });

  it('spots "user already exists": a 600 with an actionCode and no message', () => {
    expect(
      isUserExistsError(
        new ApiError({ kind: 'api', status: 600, actionCode: 12 }),
      ),
    ).toBe(true);
    expect(
      isUserExistsError(
        new ApiError({ kind: 'api', status: 600, message: 'Bad phone' }),
      ),
    ).toBe(false);
  });
});
