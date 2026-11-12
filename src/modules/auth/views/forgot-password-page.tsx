import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FormFooter } from '@/shared/components/layout/form';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { useResendOtp } from '@/modules/auth/api/auth';
import { AuthLayout } from '@/modules/auth/_components/auth-layout';
import { OtpStep } from '@/modules/auth/_components/otp-step';
import {
  normalizeUsername,
  usernameSchema,
  type UsernameInput,
  type UsernameValues,
} from '@/modules/auth/lib/auth-rules';
import { resetToken } from '@/modules/auth/lib/reset-token';

/**
 * Forgot password, steps 1–2 (auth doc §7.1–7.2): `Resend` sends the OTP,
 * and the verified OTP token is held in memory for the next screen.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const request = useResendOtp();

  const schema = useMemo(() => usernameSchema(t), [t]);
  const form = useForm<UsernameInput, unknown, UsernameValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '' },
  });

  const onSubmit = form.handleSubmit(async ({ username }) => {
    setError(false);
    try {
      await request.mutateAsync(username);
      setUserName(username);
    } catch {
      setError(true);
    }
  });

  return (
    <AuthLayout>
      {userName ? (
        <OtpStep
          userName={userName}
          onVerified={(token) => {
            resetToken.hold(userName, token);
            navigate(
              `/auth/forgot-password-form/${encodeURIComponent(userName)}`,
            );
          }}
          onBack={() => setUserName(null)}
        />
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className='flex flex-col gap-5' noValidate>
            <div className='flex flex-col gap-1'>
              <h1 className='hd text-h1 font-bold'>{t('forgot.title')}</h1>
              <p className='text-ink-2'>{t('forgot.description')}</p>
            </div>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{t('forgot.failed')}</AlertDescription>
              </Alert>
            )}
            {/* A-Z §19.7.1: trimmed and lower-cased as it is typed. */}
            <FormField
              control={form.control}
              name='username'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('login.username')}
                    <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      autoComplete='username'
                      dir='ltr'
                      autoFocus
                      onChange={(e) =>
                        field.onChange(normalizeUsername(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormFooter
              isPending={request.isPending}
              saveLabel={t('forgot.submit')}
              savingLabel={t('forgot.submitting')}
            />
            <Link
              to='/auth/login'
              className='text-brand self-center text-sm font-bold'
            >
              {t('forgot.backToLogin')}
            </Link>
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
