import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { toApiError } from '@/shared/api/api-error';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/shared/components/ui/input-otp';
import { Spinner } from '@/shared/components/ui/spinner';
import { notify } from '@/shared/lib/notify';
import { useResendOtp, useVerifyOtp } from '@/modules/auth/api/auth';
import {
  OTP_LENGTH,
  RESEND_COOLDOWN_S,
  sanitizeOtp,
} from '@/modules/auth/lib/auth-rules';

/**
 * OTP step shared by login and forgot-password (auth doc §4, §5): 4 digits,
 * verified as soon as the last one is entered, resend after a 60 s cooldown.
 * `onVerified` receives the token; what to do with it is the flow's call.
 */
export function OtpStep({
  userName,
  onVerified,
  onBack,
}: {
  userName: string;
  onVerified: (token: string) => Promise<void> | void;
  onBack: () => void;
}) {
  const { t } = useTranslation('auth');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [finishing, setFinishing] = useState(false);
  const verify = useVerifyOtp();
  const resend = useResendOtp();

  // The cooldown starts when the step opens and restarts after a resend.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const submit = async (code: string) => {
    setError(null);
    try {
      const token = await verify.mutateAsync({ userName, otp: code });
      if (typeof token !== 'string' || !token) throw new Error('no token');
      setFinishing(true);
      await onVerified(token);
    } catch (err) {
      setFinishing(false);
      setError(toApiError(err).message || t('otp.verifyFailed'));
    }
  };

  const onResend = async () => {
    try {
      await resend.mutateAsync(userName);
      setCooldown(RESEND_COOLDOWN_S);
      setOtp('');
      setError(null);
      notify(t('otp.resent'), 'success');
    } catch {
      setError(t('otp.resendFailed'));
    }
  };

  const busy = verify.isPending || finishing;

  return (
    <div className='flex flex-col gap-5'>
      <div className='flex flex-col gap-1'>
        <h2 className='hd text-h2 font-bold'>{t('otp.title')}</h2>
        <p className='text-ink-2'>
          {t('otp.description', { count: OTP_LENGTH })}{' '}
          <span dir='ltr' className='text-ink font-semibold'>
            {userName}
          </span>
        </p>
      </div>

      <div dir='ltr' className='flex items-center justify-center gap-3'>
        <InputOTP
          maxLength={OTP_LENGTH}
          value={otp}
          autoFocus
          disabled={busy}
          inputMode='numeric'
          aria-label={t('otp.label')}
          onChange={(value) => {
            setOtp(sanitizeOtp(value));
            if (error) setError(null);
          }}
          onComplete={(value: string) => void submit(sanitizeOtp(value))}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} aria-invalid={!!error} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {busy && <Spinner aria-label={t('otp.verifying')} />}
      </div>

      {error && (
        <Alert variant='destructive'>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Button variant='ghost' onClick={onBack} disabled={busy}>
          <ArrowRight className='ltr:rotate-180' />
          {t('otp.back')}
        </Button>
        {cooldown > 0 ? (
          <span className='text-ink-2 text-small' aria-live='polite'>
            {t('otp.resendIn', { seconds: cooldown })}
          </span>
        ) : (
          <Button
            variant='outline'
            onClick={() => void onResend()}
            disabled={resend.isPending || busy}
          >
            {resend.isPending && <Spinner />}
            {t('otp.resend')}
          </Button>
        )}
      </div>
    </div>
  );
}
