import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/api/api-error';
import { endSession } from '@/shared/api/session';
import { FormFooter, TextField } from '@/shared/components/layout/form';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Form } from '@/shared/components/ui/form';
import { notify } from '@/shared/lib/notify';
import { useUpdatePassword } from '@/modules/auth/api/auth';
import { AuthLayout } from '@/modules/auth/_components/auth-layout';
import {
  newPasswordSchema,
  normalizeUsername,
  type NewPasswordValues,
} from '@/modules/auth/lib/auth-rules';
import { resetToken } from '@/modules/auth/lib/reset-token';

/**
 * Forgot password, step 3 (auth doc §7.3). Without the in-memory OTP token
 * (refresh, direct link) the user goes back to the start.
 */
export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const userName = normalizeUsername(useParams().userName ?? '');
  const [token] = useState(() => resetToken.for(userName));
  const [error, setError] = useState<string | null>(null);
  const update = useUpdatePassword();

  const schema = useMemo(() => newPasswordSchema(t), [t]);
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  if (!token) return <Navigate to='/auth/forgot-password' replace />;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      // `confirmPassword` is checked here only; it is never sent.
      await update.mutateAsync({ username: userName, password, token });
      resetToken.clear();
      // Log out completely, then sign in with the new password.
      endSession();
      notify(t('reset.done'), 'success');
      navigate(`/auth/login?identifier=${encodeURIComponent(userName)}`, {
        replace: true,
      });
    } catch (err) {
      setError(errorMessage(err));
    }
  });

  return (
    <AuthLayout>
      <Form {...form}>
        <form onSubmit={onSubmit} className='flex flex-col gap-5' noValidate>
          <div className='flex flex-col gap-1'>
            <h1 className='hd text-h1 font-bold'>{t('reset.title')}</h1>
            <p className='text-ink-2'>
              {t('reset.description')}{' '}
              <span dir='ltr' className='text-ink font-semibold'>
                {userName}
              </span>
            </p>
          </div>
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <TextField
            name='password'
            type='password'
            label={t('reset.password')}
            description={t('reset.rules')}
            autoComplete='new-password'
            dir='ltr'
            toggleShowPassword
            autoFocus
            required
          />
          <TextField
            name='confirmPassword'
            type='password'
            label={t('reset.confirm')}
            autoComplete='new-password'
            dir='ltr'
            toggleShowPassword
            required
          />
          <FormFooter
            isPending={update.isPending}
            saveLabel={t('reset.submit')}
            savingLabel={t('reset.submitting')}
          />
        </form>
      </Form>
    </AuthLayout>
  );
}
