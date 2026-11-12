import { describe, expect, it } from 'vitest';
import { OrderStatus, UserType } from '@/shared/api/enums';
import { toFormData } from '@/shared/api/form-data';
import { cleanParams } from '@/shared/api/params';
import { http } from '@/shared/api/http-client';
import { orderListParams } from '@/modules/reservations/api/orders';
import {
  answerKey,
  changeStatusError,
  changeStatusPayload,
  completeErrors,
  completePayload,
  orderActions,
  questionsForOrder,
} from '@/modules/reservations/lib/order-rules';
import {
  claimPayload,
  claimSummary,
  companyBranchScope,
} from '@/modules/ledgers/lib/claim';

const asMap = (body: Record<string, unknown>) =>
  Object.fromEntries(
    [...toFormData(body as never).entries()].map(([k, v]) => [
      k,
      typeof v === 'string' ? v : 'FILE',
    ]),
  );

const ALL = {
  canChangeStatus: true,
  canComplete: true,
  canCancel: true,
  canUpdateVaccines: true,
};

describe('order list query (§13.2)', () => {
  it('provider users: no ServiceProviderId, Cancel+NoShow excluded, newest first', () => {
    const p = orderListParams(
      { pageNumber: 1, pageSize: 10, serviceProviderId: 4 },
      UserType.Provider,
    );
    expect(p).toMatchObject({
      ServiceProviderId: undefined,
      ExcludedStatus: 132,
      OrderDirection: false,
      OrderBy: 'CreatedAt',
    });
  });

  it('admins keep the provider filter and nothing is excluded', () => {
    const p = orderListParams(
      { pageNumber: 1, pageSize: 10, serviceProviderId: 4 },
      UserType.Admin,
    );
    expect(p).toMatchObject({
      ServiceProviderId: 4,
      ExcludedStatus: undefined,
    });
  });

  it('sends arrays as repeated keys (§1.6)', () => {
    const url = http.getUri({
      url: 'x',
      params: cleanParams({ TagIds: [3, 7], empty: [] }),
    });
    expect(url).toContain('TagIds=3&TagIds=7');
    expect(url).not.toContain('empty');
  });
});

describe('order actions (§13.4)', () => {
  const provider = { groupId: UserType.Provider, ...ALL };

  it('follows the status rules', () => {
    const at = (status: OrderStatus, isClaimedByProvider = false) =>
      orderActions({ status, isClaimedByProvider }, provider);
    expect(at(OrderStatus.Accept).changeStatus).toBe(true);
    expect(at(OrderStatus.Complete).changeStatus).toBe(false);
    expect(at(OrderStatus.Delayed).complete).toBe(true);
    expect(at(OrderStatus.Complete).editResult).toBe(true);
    expect(at(OrderStatus.Reject).cancel).toBe(false);
    expect(at(OrderStatus.Complete, true).updateVaccines).toBe(false);
  });

  it('only admins and providers change status, even with the flag', () => {
    const company = { groupId: UserType.Company, ...ALL };
    const a = orderActions(
      { status: OrderStatus.Accept, isClaimedByProvider: false },
      company,
    );
    expect(a.changeStatus).toBe(false);
    expect(a.cancel).toBe(true);
  });

  it('cancel needs a reason and uses the backend spelling', () => {
    expect(changeStatusError({ id: 'r1', status: OrderStatus.Cancel })).toBe(
      'cancelationReason',
    );
    expect(
      asMap(
        changeStatusPayload({
          id: 'r1',
          status: OrderStatus.Cancel,
          cancelationReason: 'No show',
        }),
      ),
    ).toEqual({ Id: 'r1', Status: '4', CancelationReson: 'No show' });
  });
});

describe('complete (§13.4)', () => {
  const order = {
    reservationServices: {
      id: 1,
      services: [
        {
          reservationServiceId: 11,
          id: 31,
          serviceName: 'X-ray',
          from: '',
          to: '',
        },
      ],
      groupServices: [
        {
          reservationServiceId: 12,
          serviceGroupId: 7,
          serviceGroupName: 'G',
          from: '',
          to: '',
          sellPrice: 0,
          costPrice: 0,
          services: [
            {
              reservationServiceId: 13,
              id: 32,
              serviceName: 'CBC',
              from: '',
              to: '',
              sellPrice: 0,
              costPrice: 0,
            },
          ],
        },
      ],
    },
  };
  const questions = questionsForOrder(order, [
    { questionId: 5, question: 'Q1', isRequired: true, serviceId: 31 },
    { questionId: 6, question: 'Q2', isRequired: false, serviceId: 32 },
  ]);

  it('maps questions to their reservation service', () => {
    expect(questions.map((q) => q.reservationServiceId)).toEqual([11, 13]);
  });

  it('requires answers marked required and at least one file', () => {
    const errors = completeErrors(
      { id: 'r1', note: '', isFit: true, answers: {}, files: [] },
      questions,
    );
    expect(errors.unanswered.map((q) => q.questionId)).toEqual([5]);
    expect(errors.noFiles).toBe(true);
  });

  it('groups answers per reservation service', () => {
    const file = new File(['x'], 'r.pdf');
    const map = asMap(
      completePayload(
        {
          id: 'r1',
          note: ' ok ',
          isFit: false,
          answers: {
            [answerKey(questions[0])]: 'Normal',
            [answerKey(questions[1])]: 'Fine',
          },
          files: [file],
        },
        questions,
      ),
    );
    expect(map).toEqual({
      Id: 'r1',
      Note: 'ok',
      IsFit: 'false',
      'ReservationService[0].id': '11',
      'ReservationService[0].reservationServiceAnswer[0].serviceQuestionId':
        '5',
      'ReservationService[0].reservationServiceAnswer[0].answer': 'Normal',
      'ReservationService[1].id': '13',
      'ReservationService[1].reservationServiceAnswer[0].serviceQuestionId':
        '6',
      'ReservationService[1].reservationServiceAnswer[0].answer': 'Fine',
      ResultAttachments: 'FILE',
    });
  });
});

describe('claim (§14)', () => {
  const orders = [
    { id: 'a', cost: 100, sellPrice: 150, dateChosen: '2026-10-20T08:00:00Z' },
    { id: 'b', cost: 50, sellPrice: 80, dateChosen: '2026-10-01T08:00:00Z' },
  ];

  it('sums cost and sell price over the selected period', () => {
    expect(claimSummary(orders)).toEqual({
      cost: 150,
      sellPrice: 230,
      from: '2026-10-01T08:00:00.000Z',
      to: '2026-10-20T08:00:00.000Z',
    });
  });

  it('sends indexed ids, the period and the note', () => {
    expect(asMap(claimPayload({ orders, note: 'Oct', files: [] }))).toEqual({
      'Ids[0]': 'a',
      'Ids[1]': 'b',
      ClaimedFrom: '2026-10-01T08:00:00.000Z',
      ClaimedTo: '2026-10-20T08:00:00.000Z',
      Note: 'Oct',
    });
  });

  it('scopes company users by branch, never provider users', () => {
    expect(companyBranchScope(UserType.Company, [3, 8])).toEqual({
      'CompanyBranchIds[0]': 3,
      'CompanyBranchIds[1]': 8,
    });
    expect(companyBranchScope(UserType.Provider, [3])).toEqual({});
  });
});
