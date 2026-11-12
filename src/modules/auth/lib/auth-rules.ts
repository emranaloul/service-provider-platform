import { z } from 'zod';
import type { TFunction } from 'i18next';

/** Validation rules of the auth doc §10. */

export const OTP_LENGTH = 4;
export const RESEND_COOLDOWN_S = 60;

/**
 * Forgot-password username: trimmed and lower-cased, as the working client
 * does. Login only trims — the backend's username matching is unknown, so
 * login is not lower-cased until the backend confirms (missing items §11.6).
 */
export const normalizeUsername = (value: string) => value.trim().toLowerCase();

/** OTP input: digits only, at most 4 (pasted text included). */
export const sanitizeOtp = (value: string) =>
  value.replace(/\D/g, '').slice(0, OTP_LENGTH);

const NEW_PASSWORD_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

export function loginSchema(t: TFunction<'auth'>) {
  return z.object({
    username: z.string().trim().min(1, t('validation.required')),
    password: z
      .string()
      .min(1, t('validation.required'))
      .min(6, t('validation.passwordLength'))
      .max(50, t('validation.passwordLength'))
      .regex(/[0-9]/, t('validation.passwordDigit'))
      .regex(/[a-z]/, t('validation.passwordLower'))
      .regex(/[A-Z]/, t('validation.passwordUpper'))
      // Any character that is not a letter, digit or `_`.
      .regex(/\W/, t('validation.passwordSymbol')),
  });
}

export function usernameSchema(t: TFunction<'auth'>) {
  return z.object({
    username: z
      .string()
      .transform(normalizeUsername)
      .pipe(z.string().min(1, t('validation.required'))),
  });
}

export function newPasswordSchema(t: TFunction<'auth'>) {
  return z
    .object({
      password: z
        .string()
        .min(1, t('validation.required'))
        .min(6, t('validation.passwordMin'))
        .regex(/[0-9]/, t('validation.passwordDigit'))
        .regex(/[a-z]/, t('validation.passwordLower'))
        .regex(/[A-Z]/, t('validation.passwordUpper'))
        .regex(NEW_PASSWORD_SPECIAL, t('validation.passwordSpecial')),
      confirmPassword: z.string().min(1, t('validation.required')),
    })
    .refine((v) => v.password === v.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordMatch'),
    });
}

/**
 * Change password while signed in (missing items §6): the forgot-password
 * rules for the new one (the working client's 3–50 chars is too weak), plus
 * the current password and a matching confirmation.
 */
export function changePasswordSchema(t: TFunction<'auth'>) {
  return z
    .object({
      oldPassword: z.string().min(1, t('validation.required')),
    })
    .and(newPasswordSchema(t));
}

export type ChangePasswordValues = z.output<
  ReturnType<typeof changePasswordSchema>
>;
export type LoginInput = z.input<ReturnType<typeof loginSchema>>;
export type LoginValues = z.output<ReturnType<typeof loginSchema>>;
export type UsernameInput = z.input<ReturnType<typeof usernameSchema>>;
export type UsernameValues = z.output<ReturnType<typeof usernameSchema>>;
export type NewPasswordValues = z.output<ReturnType<typeof newPasswordSchema>>;
