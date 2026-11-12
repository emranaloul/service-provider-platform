import { Suspense, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { errorMessage, toApiError } from '@/shared/api/api-error';
import { FormFooter, TextField } from '@/shared/components/layout/form';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Form } from '@/shared/components/ui/form';
import { notify } from '@/shared/lib/notify';
import { useCurrentUser } from '@/shared/session/current-user';
import { useChangePassword } from '@/modules/auth/api/auth';
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from '@/modules/auth/lib/auth-rules';

/** Account menu → Change password (current, new, confirm). */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('shell.changePassword.title')}</DialogTitle>
          <DialogDescription>
            {t('shell.changePassword.description')}
          </DialogDescription>
        </DialogHeader>
        {/* The schema's messages live in the lazily loaded `auth` namespace. */}
        <Suspense fallback={<FieldsSkeleton />}>
          <ChangePasswordForm onDone={() => onOpenChange(false)} />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const { t: tAuth } = useTranslation('auth');
  const { user } = useCurrentUser();
  const change = useChangePassword();

  const schema = useMemo(() => changePasswordSchema(tAuth), [tAuth]);
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', password: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ oldPassword, password }) => {
    if (!user) return;
    try {
      await change.mutateAsync({
        id: user.id,
        oldPassword,
        newPassword: password,
      });
      notify(t('shell.changePassword.done'), 'success');
      onDone();
    } catch (err) {
      const apiError = toApiError(err);
      // A business failure (HTTP 600) is about the current password.
      if (apiError.status === 600 && apiError.message) {
        form.setError('oldPassword', { message: errorMessage(err) });
      } else {
        notify(errorMessage(err), 'error');
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className='flex flex-col gap-4' noValidate>
        <TextField
          name='oldPassword'
          type='password'
          label={t('shell.changePassword.current')}
          autoComplete='current-password'
          dir='ltr'
          toggleShowPassword
          autoFocus
          required
        />
        <TextField
          name='password'
          type='password'
          label={t('shell.changePassword.new')}
          description={tAuth('reset.rules')}
          autoComplete='new-password'
          dir='ltr'
          toggleShowPassword
          required
        />
        <TextField
          name='confirmPassword'
          type='password'
          label={t('shell.changePassword.confirm')}
          autoComplete='new-password'
          dir='ltr'
          toggleShowPassword
          required
        />
        <FormFooter
          isPending={change.isPending}
          saveLabel={t('shell.changePassword.submit')}
          savingLabel={t('shell.changePassword.submitting')}
          cancelLabel={t('common.cancel')}
          onCancel={onDone}
        />
      </form>
    </Form>
  );
}
