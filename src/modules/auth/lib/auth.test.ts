import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { http } from '@/shared/api/http-client';
import {
  isExpired,
  jwtExpiry,
  SESSION_LIFETIME_MS,
  sessionExpiration,
} from '@/shared/api/token-store';
import {
  grantedAreas,
  hasPermission,
} from '@/shared/permissions/has-permission';
import {
  hasSpPermission,
  PermissionArea,
} from '@/shared/permissions/backend-flags';
import {
  login,
  resendOtp,
  updatePassword,
  verifyOtp,
} from '@/modules/auth/api/auth';
import {
  changePasswordSchema,
  loginSchema,
  newPasswordSchema,
  normalizeUsername,
  sanitizeOtp,
} from '@/modules/auth/lib/auth-rules';
import { resetToken } from '@/modules/auth/lib/reset-token';

const t = ((key: string) => key) as unknown as TFunction<'auth'>;

/** A JWT with the given payload (signature irrelevant to the client). */
const jwt = (payload: object) =>
  `x.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.y`;

describe('auth rules (§10)', () => {
  it('forgot-password lower-cases; login only trims (missing items §11.6)', () => {
    expect(normalizeUsername('  User@Example.COM ')).toBe('user@example.com');
    expect(
      loginSchema(t).parse({ username: ' A@B.co ', password: 'Abc12#' })
        .username,
    ).toBe('A@B.co');
  });

  it('change password needs the current one and the new-password rules', () => {
    const parse = (v: object) => changePasswordSchema(t).safeParse(v).success;
    expect(
      parse({
        oldPassword: 'x',
        password: 'Abc12!',
        confirmPassword: 'Abc12!',
      }),
    ).toBe(true);
    expect(
      parse({ oldPassword: '', password: 'Abc12!', confirmPassword: 'Abc12!' }),
    ).toBe(false);
    expect(
      parse({ oldPassword: 'x', password: 'abc', confirmPassword: 'abc' }),
    ).toBe(false);
  });

  it('login password: 6–50 chars, digit, lower, upper, symbol', () => {
    const ok = (password: string) =>
      loginSchema(t).safeParse({ username: 'u', password }).success;
    expect(ok('Abc12#')).toBe(true);
    expect(ok('Abc1#')).toBe(false); // too short
    expect(ok('abc12#')).toBe(false); // no uppercase
    expect(ok('Abc12_')).toBe(false); // `_` is not a symbol
    expect(ok(`A1#${'a'.repeat(48)}`)).toBe(false); // 51 chars
  });

  it('new password needs a listed special character and a matching confirm', () => {
    const parse = (password: string, confirmPassword = password) =>
      newPasswordSchema(t).safeParse({ password, confirmPassword });
    expect(parse('Abc12!').success).toBe(true);
    expect(parse('Abc12~').success).toBe(false); // `~` is not in the list
    expect(parse('Abc12!', 'Abc12?').success).toBe(false);
  });

  it('OTP keeps at most 4 digits, from pasted text too', () => {
    expect(sanitizeOtp(' 4a8-2 1 9')).toBe('4821');
  });
});

describe('session expiry (§8.1, quirk 3)', () => {
  const now = Date.UTC(2026, 10, 12);

  it('is 3 days when the token has no readable exp', () => {
    expect(Date.parse(sessionExpiration('not-a-jwt', now))).toBe(
      now + SESSION_LIFETIME_MS,
    );
  });

  it('uses the JWT exp when it comes first', () => {
    const exp = now / 1000 + 3600;
    expect(jwtExpiry(jwt({ exp }))).toBe(exp * 1000);
    expect(Date.parse(sessionExpiration(jwt({ exp }), now))).toBe(exp * 1000);
  });

  it('is expired at or after the expiration', () => {
    const auth = { token: 't', expiration: new Date(now).toISOString() };
    expect(isExpired(auth, now - 1)).toBe(false);
    expect(isExpired(auth, now)).toBe(true);
  });
});

describe('auth requests (§2, quirk 2)', () => {
  afterEach(() => vi.restoreAllMocks());

  const ok = (value: unknown) =>
    Promise.resolve({ data: { isSuccess: true, isFailure: false, value } });

  it('sends the exact key casing per endpoint, as JSON', async () => {
    const post = vi.spyOn(http, 'post').mockImplementation(() => ok('jwt'));
    const put = vi.spyOn(http, 'put').mockImplementation(() => ok(true));

    await login('u', 'p');
    await expect(verifyOtp('u', '1234')).resolves.toBe('jwt');
    await resendOtp('u');
    await updatePassword('u', 'Newpass#1', 'otp-token');

    expect(post.mock.calls.map((c) => [c[0], c[1]])).toEqual([
      ['Authenticate/Auth/Login', { username: 'u', password: 'p' }],
      ['Authenticate/Auth/VerifyOTP', { userName: 'u', otp: '1234' }],
      ['Authenticate/Auth/Resend', { userName: 'u' }],
    ]);
    expect(put.mock.calls[0][1]).toEqual({
      username: 'u',
      password: 'Newpass#1',
    });
    // The forgot-password call carries the OTP token, not the session's.
    expect(put.mock.calls[0][2]).toMatchObject({
      authless: true,
      headers: { Authorization: 'Bearer otp-token' },
    });
  });
});

describe('permissions from the user (§9)', () => {
  it('fail closed with no permissions', () => {
    expect(hasSpPermission([], 'view:service-provider-branch')).toBe(false);
    const granted = grantedAreas([]);
    expect(hasPermission(granted, ['branches', 'view'])).toBe(false);
    // Today has no flag: open to every signed-in user.
    expect(hasPermission(granted, ['today', 'view'])).toBe(true);
  });

  it('maps backend flags onto app areas; edit implies view', () => {
    const granted = grantedAreas([
      {
        type: PermissionArea.ServiceProvider,
        // view + update branch.
        permission: String(4096 + 16384),
      },
    ]);
    expect(hasPermission(granted, ['branches', 'edit'])).toBe(true);
    expect(hasPermission(granted, ['branches', 'view'])).toBe(true);
    expect(hasPermission(granted, ['ledgers', 'view'])).toBe(false);
  });
});

describe('forgot-password token (§7.2, quirk 5)', () => {
  it('is only handed out for the username it was issued to', () => {
    resetToken.hold('a@b.co', 'tok');
    expect(resetToken.for('a@b.co')).toBe('tok');
    expect(resetToken.for('other@b.co')).toBeNull();
    resetToken.clear();
    expect(resetToken.for('a@b.co')).toBeNull();
  });
});
