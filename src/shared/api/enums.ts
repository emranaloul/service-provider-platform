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

/** Sort direction for server-sorted lists. */
export const SortDirection = { Asc: 1, Desc: 2 } as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];
