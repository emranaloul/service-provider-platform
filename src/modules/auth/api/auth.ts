import { useMutation } from '@tanstack/react-query';
import { apiPost, apiPut } from '@/shared/api/http-client';
import type { UserModel } from '@/shared/session/types';

/**
 * `Authenticate` service (auth doc §2). Bodies are JSON. Key casing differs
 * per endpoint and must be sent exactly (quirk 2): `username` for Login and
 * UpdatePassword, `userName` for VerifyOTP and Resend.
 */
export const AUTH_PATHS = {
  login: 'Authenticate/Auth/Login',
  verifyOtp: 'Authenticate/Auth/VerifyOTP',
  resend: 'Authenticate/Auth/Resend',
  getUserByToken: 'Authenticate/Auth/getUserByToken',
  updatePassword: 'Authenticate/Auth/UpdatePassword',
} as const;

/** Step 1: checks the password and sends an OTP. The response is ignored (§3.1). */
export const login = (username: string, password: string) =>
  apiPost<unknown>(
    AUTH_PATHS.login,
    { username, password },
    { authless: true },
  ).then(() => undefined);

/** Returns the JWT as a plain string (§4). */
export const verifyOtp = (userName: string, otp: string) =>
  apiPost<string>(AUTH_PATHS.verifyOtp, { userName, otp }, { authless: true });

/** Re-sends the login OTP, and starts the forgot-password flow (§5). */
export const resendOtp = (userName: string) =>
  apiPost<unknown>(AUTH_PATHS.resend, { userName }, { authless: true }).then(
    () => undefined,
  );

/** The current user from the session token; no body (§6). */
export const getUserByToken = () =>
  apiPost<UserModel>(AUTH_PATHS.getUserByToken);

/** Forgot-password step 3, authorised by the in-memory OTP token (§7.3). */
export const updatePassword = (
  username: string,
  password: string,
  otpToken: string,
) =>
  apiPut<unknown>(
    AUTH_PATHS.updatePassword,
    { username, password },
    { bearer: otpToken },
  );

/**
 * Change password while signed in (missing items §6). JSON body; `id` is the
 * signed-in user's id as a string. A wrong old password comes back as a 600
 * with a `message` — show it on the current-password field.
 */
export const changePassword = (
  id: string | number,
  oldPassword: string,
  newPassword: string,
) =>
  apiPut<unknown>('Authenticate/Auth/ChangePassword', {
    id: String(id),
    oldPassword,
    newPassword,
  });

export const useChangePassword = () =>
  useMutation({
    mutationFn: (v: {
      id: string | number;
      oldPassword: string;
      newPassword: string;
    }) => changePassword(v.id, v.oldPassword, v.newPassword),
    meta: { silentError: true },
  });

// Auth screens show their own errors, so the global error toast is off.
const silent = { meta: { silentError: true } } as const;

export const useLogin = () =>
  useMutation({
    mutationFn: (v: { username: string; password: string }) =>
      login(v.username, v.password),
    ...silent,
  });

export const useVerifyOtp = () =>
  useMutation({
    mutationFn: (v: { userName: string; otp: string }) =>
      verifyOtp(v.userName, v.otp),
    ...silent,
  });

export const useResendOtp = () =>
  useMutation({ mutationFn: resendOtp, ...silent });

export const useUpdatePassword = () =>
  useMutation({
    mutationFn: (v: { username: string; password: string; token: string }) =>
      updatePassword(v.username, v.password, v.token),
    ...silent,
  });
