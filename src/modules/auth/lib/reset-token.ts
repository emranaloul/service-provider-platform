/**
 * The forgot-password OTP token (auth doc §7.2): memory only, never stored.
 * A refresh between "verify" and "new password" loses it on purpose and the
 * user starts over (quirk 5).
 */
let held: { userName: string; token: string } | null = null;

export const resetToken = {
  hold: (userName: string, token: string) => {
    held = { userName, token };
  },
  /** The token, only if it was issued for this username. */
  for: (userName: string): string | null =>
    held && held.userName === userName ? held.token : null,
  clear: () => {
    held = null;
  },
};
