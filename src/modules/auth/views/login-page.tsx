import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/api/api-error';
import { endSession, takeSessionExpiredFlag } from '@/shared/api/session';
import { tokenStore } from '@/shared/api/token-store';
import { FormFooter, TextField } from '@/shared/components/layout/form';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Form } from '@/shared/components/ui/form';
import { useLogin } from '@/modules/auth/api/auth';
import { AuthLayout } from '@/modules/auth/_components/auth-layout';
import { OtpStep } from '@/modules/auth/_components/otp-step';
import {
  loginSchema,
  type LoginInput,
  type LoginValues,
} from '@/modules/auth/lib/auth-rules';
import { loadCurrentUser } from '@/modules/auth/lib/session';

/**
 * Sign-in, two steps (auth doc §3): username + password sends an OTP; the
 * verified OTP gives the token, which is stored before the user is loaded.
 */
export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [userName, setUserName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired] = useState(takeSessionExpiredFlag);
  const login = useLogin();

  const schema = useMemo(() => loginSchema(t), [t]);
  const form = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: params.get('identifier') ?? '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    setError(null);
    try {
      await login.mutateAsync(v);
      setUserName(v.username);
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  const onVerified = async (token: string) => {
    tokenStore.set(token);
    try {
      await loadCurrentUser();
      navigate('/today', { replace: true });
    } catch (err) {
      endSession();
      setUserName(null);
      setError(errorMessage(err));
    }
  };

  return (
    <AuthLayout>
      {userName ? (
        <OtpStep
          userName={userName}
          onVerified={onVerified}
          onBack={() => setUserName(null)}
        />
      ) : (
        <Form {...form}>
          <form onSubmit={onSubmit} className='flex flex-col gap-5' noValidate>
            <div className='flex flex-col gap-1'>
              <h1 className='hd text-h1 font-bold'>{t('login.title')}</h1>
              <p className='text-ink-2'>{t('login.description')}</p>
            </div>
            {expired && !error && (
              <Alert>
                <AlertDescription>{t('login.expired')}</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <TextField
              name='username'
              label={t('login.username')}
              autoComplete='username'
              dir='ltr'
              autoFocus
              required
            />
            <TextField
              name='password'
              type='password'
              label={t('login.password')}
              autoComplete='current-password'
              dir='ltr'
              toggleShowPassword
              required
            />
            <Link
              to='/auth/forgot-password'
              className='text-brand self-start text-sm font-bold'
            >
              {t('login.forgot')}
            </Link>
            <FormFooter
              isPending={login.isPending}
              saveLabel={t('login.submit')}
              savingLabel={t('login.submitting')}
            />
          </form>
        </Form>
      )}
    </AuthLayout>
  );
}
