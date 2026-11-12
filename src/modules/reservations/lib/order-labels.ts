import {
  RequestChannel,
  RequestFunding,
  RequestServiceFlags,
  ReservationFundingType,
} from '@/shared/api/enums';
import { splitFlags } from '@/shared/lib/bit-flags';
import type { Order } from '@/modules/reservations/api/types';

const known = <T extends Record<string, number>>(
  e: T,
  v: number | null | undefined,
) =>
  v != null && (Object.values(e) as number[]).includes(v)
    ? (v as T[keyof T])
    : null;

/**
 * Channel shown in lists: `requestFlow.channel`, else `requestChannel`. The
 * plain `channel` field is legacy and never shown (missing items §7).
 */
export const orderChannel = (
  o: Pick<Order, 'requestFlow' | 'requestChannel'>,
): RequestChannel | null =>
  known(RequestChannel, o.requestFlow?.channel ?? o.requestChannel);

/** `null` (show nothing) when absent or unknown. */
export const orderFunding = (
  o: Pick<Order, 'requestFlow' | 'requestFunding'>,
): RequestFunding | null =>
  known(RequestFunding, o.requestFlow?.funding ?? o.requestFunding);

/** `null` (show nothing) when absent or unknown. */
export const orderFundingType = (
  o: Pick<Order, 'fundingType'>,
): ReservationFundingType | null =>
  known(ReservationFundingType, o.fundingType);

/** What the request covers, from the `requestFlow.services` bitmask. */
export const orderServiceKinds = (o: Pick<Order, 'requestFlow'>) =>
  splitFlags(o.requestFlow?.services ?? 0, Object.values(RequestServiceFlags));

/** i18n key suffixes, e.g. `t(\`channel.${CHANNEL_KEY[c]}\`)`. */
export const CHANNEL_KEY: Record<RequestChannel, string> = {
  1: 'academy',
  2: 'osh',
  3: 'site',
  4: 'examination',
  5: 'app',
};
export const FUNDING_KEY: Record<RequestFunding, string> = {
  1: 'cash',
  2: 'pos',
  3: 'wallet',
  4: 'package',
  5: 'paymentGateway',
  6: 'unfunded',
};
export const FUNDING_TYPE_KEY: Record<ReservationFundingType, string> = {
  1: 'b2c',
  2: 'companyPackage',
  4: 'companyWallet',
};
