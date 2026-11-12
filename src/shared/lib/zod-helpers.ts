import { z } from 'zod';

/**
 * Required free-text field that rejects whitespace-only input (a lone
 * space still satisfies plain `z.string().min(1)`, letting an
 * effectively-empty value slip past validation and reach the API as a
 * blank/whitespace string). Trims before checking length.
 */
export function requiredTrimmedString(requiredMsg: string) {
  return z.string().trim().min(1, requiredMsg);
}

/**
 * A required date for `DateField`, which stores `Date | null`. The field type
 * stays nullable and a refinement rejects the empty case — keeping the
 * schema's input and output types equal, which react-hook-form's resolver
 * typing needs. (Explicit `boolean` return: an inferred type predicate would
 * narrow the output to `Date` and split the two types.)
 */
export function requiredDate(requiredMsg: string) {
  return z
    .date()
    .nullable()
    .refine((v): boolean => v !== null, requiredMsg);
}
