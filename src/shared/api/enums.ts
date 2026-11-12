/**
 * Backend enums — `as const` objects + unions (no TS `enum`).
 * TODO: replace / extend with the Service Provider API contract.
 */

export const ActionOutcome = {
  Fetched: 1,
  Listed: 2,
  Created: 3,
  Updated: 4,
  Deleted: 5,
  Executed: 6,
  NotFound: 10,
  ValidationFailed: 11,
  Conflict: 12,
  StateNotAllowed: 13,
  PrerequisiteMissing: 14,
  DependencyInUse: 15,
  Forbidden: 16,
  ExternalFailure: 17,
  ServerError: 18,
} as const;
export type ActionOutcome = (typeof ActionOutcome)[keyof typeof ActionOutcome];

// ── Service Provider contract (doc §2) ──────────────────────────────────────

/** `langId` of a translation row. English is required in every form. */
export const LangId = { En: 1, Ar: 2 } as const;
export type LangId = (typeof LangId)[keyof typeof LangId];

/**
 * Weekdays as bit flags. `ServiceProvider.closingDay` ORs several together;
 * `BranchSlot.day` holds exactly one.
 */
export const WeekDay = {
  Saturday: 1,
  Sunday: 2,
  Monday: 4,
  Tuesday: 8,
  Wednesday: 16,
  Thursday: 32,
  Friday: 64,
} as const;
export type WeekDay = (typeof WeekDay)[keyof typeof WeekDay];
/** Week order, Saturday first (the backend's bit order). */
export const WEEK_DAYS: readonly WeekDay[] = Object.values(WeekDay);

/** Reservation status, bit flags: an "excluded" filter is the sum of its bits. */
export const OrderStatus = {
  New: 1,
  Accept: 2,
  Cancel: 4,
  Reject: 8,
  CheckIn: 16,
  InProgress: 32,
  Complete: 64,
  NoShow: 128,
  Delayed: 256,
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const LedgerStatus = { UnPaid: 1, Paid: 2 } as const;
export type LedgerStatus = (typeof LedgerStatus)[keyof typeof LedgerStatus];

/** Provider attachment folder. Stored as integers — never renumber. */
export const AttachmentCategory = {
  Proposal: 1,
  LegalDocument: 2,
  Invoice: 3,
  CustomerSuccess: 4,
} as const;
export type AttachmentCategory =
  (typeof AttachmentCategory)[keyof typeof AttachmentCategory];

/** Multi-file field per category on the provider *create* form. */
export const ATTACHMENT_CREATE_FIELD: Record<AttachmentCategory, string> = {
  1: 'ProposalFiles',
  2: 'LegalDocumentFiles',
  3: 'InvoiceFiles',
  4: 'CustomerSuccessFiles',
};

/** `groupId` of the signed-in user. */
export const UserType = {
  Admin: 1,
  Client: 2,
  Provider: 3,
  Company: 4,
  CompanyMember: 5,
} as const;
export type UserType = (typeof UserType)[keyof typeof UserType];

// ── Order labels (missing items §7) ─────────────────────────────────────────

/** `requestFlow.channel` / `requestChannel` / filter `RequestChannel`. */
export const RequestChannel = {
  Academy: 1,
  Osh: 2,
  Site: 3,
  Examination: 4,
  App: 5,
} as const;
export type RequestChannel =
  (typeof RequestChannel)[keyof typeof RequestChannel];

/** `requestFlow.funding` / `requestFunding` / filter `RequestFunding`. */
export const RequestFunding = {
  Cash: 1,
  POS: 2,
  Wallet: 3,
  Package: 4,
  PaymentGateway: 5,
  Unfunded: 6,
} as const;
export type RequestFunding =
  (typeof RequestFunding)[keyof typeof RequestFunding];

/** `fundingType`. */
export const ReservationFundingType = {
  B2C: 1,
  CompanyPackage: 2,
  CompanyWallet: 4,
} as const;
export type ReservationFundingType =
  (typeof ReservationFundingType)[keyof typeof ReservationFundingType];

export const PackageType = {
  Examinations: 1,
  AcademyServices: 2,
  Both: 3,
  VaccineOnly: 4,
} as const;
export type PackageType = (typeof PackageType)[keyof typeof PackageType];

/** Only meaningful when `packageType` is `Both`; otherwise `None`. */
export const EnrollmentType = { Enroll: 1, Unenroll: 2, None: 3 } as const;
export type EnrollmentType =
  (typeof EnrollmentType)[keyof typeof EnrollmentType];

/** `requestFlow.services`, a bitmask. */
export const RequestServiceFlags = {
  Examination: 1,
  UserCourse: 2,
  CertifiedExam: 4,
  Sadad: 8,
  Vaccine: 16,
  OshExamination: 32,
} as const;
export type RequestServiceFlag =
  (typeof RequestServiceFlags)[keyof typeof RequestServiceFlags];

/** FAQ audience. */
export const FaqType = { Provider: 1, Company: 2, All: 4 } as const;
export type FaqType = (typeof FaqType)[keyof typeof FaqType];

/** Sort direction for server-sorted lists. */
export const SortDirection = { Asc: 1, Desc: 2 } as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
