import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/api/api-error';
import { citiesQuery, countriesQuery, type Option } from '@/shared/api/lookups';
import { useTags } from '@/shared/api/use-tags';
import { mediaUrl } from '@/shared/api/media';
import {
  CheckboxGroupField,
  DateField,
  FormFooter,
  SelectField,
  SwitchField,
  TextField,
  UploadField,
} from '@/shared/components/layout/form';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Form } from '@/shared/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';
import { pickTranslation } from '@/shared/lib/translation';
import { branchListQuery } from '@/modules/branches/api/branches';
import {
  isUserExistsError,
  providerRolesQuery,
  userQuery,
  useSaveUser,
} from '@/modules/team/api/users';
import type { ProviderUser } from '@/modules/team/api/types';
import type { UserFormValues } from '@/modules/team/lib/user-payload';
import {
  userFormDefaults,
  userFormSchema,
  type UserFormInput,
} from '@/modules/team/_components/user-form-schema';

const toOptions = (list: Option[] | undefined) =>
  (list ?? []).map((o) => ({ value: String(o.id), label: o.name }));

const EARLIEST_BIRTH = new Date(1920, 0, 1);

/**
 * Add / edit team member drawer (missing items §2.4–§2.6). `userId` is
 * `'new'` to add, a user id to edit, or `null` when closed.
 */
export function UserFormSheet({
  userId,
  serviceProviderId,
  onClose,
}: {
  userId: string | null;
  serviceProviderId: number;
  onClose: () => void;
}) {
  const { t } = useTranslation('team');
  const lang = useUiLang();
  const editId = userId && userId !== 'new' ? userId : '';
  const { data: user, isPending } = useQuery({
    ...userQuery(editId),
    enabled: editId !== '',
  });
  const loading = editId !== '' && isPending;

  return (
    <Sheet open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={lang === 'ar' ? 'left' : 'right'}
        className='w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
      >
        <SheetHeader className='border-line border-b px-6 py-5'>
          <SheetTitle>
            {editId ? t('form.editTitle') : t('form.addTitle')}
          </SheetTitle>
          <SheetDescription>{t('form.description')}</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
          {loading ? (
            <FieldsSkeleton count={10} />
          ) : (
            <UserForm
              // Remount per record so defaults are read once, after load.
              key={user?.id ?? 'new'}
              user={editId ? user : undefined}
              serviceProviderId={serviceProviderId}
              onDone={onClose}
              onCancel={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UserForm({
  user,
  serviceProviderId,
  onDone,
  onCancel,
}: {
  user: ProviderUser | undefined;
  serviceProviderId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('team');
  const lang = useUiLang();
  const schema = useMemo(() => userFormSchema(t), [t]);
  const form = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: userFormDefaults(user),
  });
  const save = useSaveUser(serviceProviderId);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Read once per form mount: date of birth cannot be in the future.
  const [today] = useState(() => new Date());

  const countryId =
    Number(useWatch({ control: form.control, name: 'countryId' })) || undefined;
  const countries = useQuery(countriesQuery());
  const cities = useQuery(citiesQuery(countryId));
  const tags = useTags();
  const roles = useQuery(providerRolesQuery());
  const branches = useQuery(
    branchListQuery({ pageNumber: 1, pageSize: 1000, serviceProviderId }),
  );
  const branchOptions = (branches.data?.data ?? []).map((b) => ({
    value: String(b.id),
    label: pickTranslation(b.translations, lang)?.name ?? `#${b.id}`,
  }));
  const currentPhoto = mediaUrl(user?.img);

  const finish = () => {
    notify(user ? t('toast.updated') : t('toast.created'), 'success');
    onDone();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await save.mutateAsync({ values, user });
      finish();
    } catch (err) {
      if (!isUserExistsError(err)) {
        setSubmitError(errorMessage(err));
        return;
      }
      // §2.4: the username belongs to an existing account — offer to add it.
      const ok = await confirm({
        title: t('exists.title'),
        description: t('exists.description'),
        confirmText: t('exists.confirm'),
        cancelText: t('actions.cancel'),
      });
      if (!ok) return;
      try {
        await save.mutateAsync({ values, user, forceAdd: true });
        finish();
      } catch (retryErr) {
        setSubmitError(errorMessage(retryErr));
      }
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className='flex flex-col gap-6 pt-5' noValidate>
        {submitError && (
          <Alert variant='destructive'>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.account')}
          </legend>
          <TextField
            name='userName'
            type='email'
            label={t('form.userName')}
            description={t('form.userNameHint')}
            dir='ltr'
            required
          />
          <SelectField
            name='roleId'
            label={t('form.role')}
            description={t('form.roleHint')}
            placeholder={t('form.select')}
            options={toOptions(roles.data)}
            required
          />
          {branches.isSuccess && branchOptions.length === 0 ? (
            <Alert>
              <AlertDescription>{t('form.noBranches')}</AlertDescription>
            </Alert>
          ) : (
            <CheckboxGroupField
              name='branchIds'
              label={t('form.branches')}
              description={t('form.branchesHint')}
              options={branchOptions}
              orientation='horizontal'
              required
            />
          )}
          <SwitchField
            name='isActive'
            label={t('form.isActive')}
            description={t('form.isActiveHint')}
          />
        </fieldset>

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.personal')}
          </legend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <TextField name='firstName' label={t('form.firstName')} required />
            <TextField name='lastName' label={t('form.lastName')} required />
            <TextField
              name='phoneNo'
              type='tel'
              label={t('form.phoneNo')}
              dir='ltr'
              className='num'
              required
            />
            <TextField
              name='email'
              type='email'
              label={t('form.email')}
              dir='ltr'
            />
          </div>
          <TextField name='address' label={t('form.address')} required />
          <div className='grid gap-4 sm:grid-cols-2'>
            <SelectField
              name='countryId'
              label={t('form.country')}
              placeholder={t('form.select')}
              options={toOptions(countries.data)}
              // City options depend on the country.
              onValueChange={() => form.setValue('cityId', '')}
              required
            />
            <SelectField
              name='cityId'
              label={t('form.city')}
              placeholder={t('form.select')}
              options={toOptions(cities.data)}
              disabled={!countryId}
              required
            />
            <TextField
              name='postCode'
              label={t('form.postCode')}
              dir='ltr'
              className='num'
            />
            <SelectField
              name='nationalityId'
              label={t('form.nationality')}
              placeholder={t('form.select')}
              options={toOptions(countries.data)}
            />
            <TextField
              name='identityNumber'
              label={t('form.identityNumber')}
              inputMode='numeric'
              dir='ltr'
              className='num'
            />
            <DateField
              name='dateOfBirth'
              label={t('form.dateOfBirth')}
              placeholder={t('form.pickDate')}
              minDate={EARLIEST_BIRTH}
              maxDate={today}
              captionLayout='dropdown'
            />
          </div>
        </fieldset>

        {(tags.data?.length ?? 0) > 0 && (
          <CheckboxGroupField
            name='tagIds'
            label={t('form.tags')}
            options={toOptions(tags.data)}
            orientation='horizontal'
          />
        )}

        <div className='flex items-start gap-4'>
          {currentPhoto && (
            <img
              src={currentPhoto}
              alt=''
              className='border-line size-16 shrink-0 rounded-full border object-cover'
            />
          )}
          <UploadField
            name='img'
            accept='image/*'
            label={t('form.photo')}
            description={t('form.photoHint')}
            removeLabel={t('form.removePhoto')}
            className='flex-1'
          />
        </div>

        <FormFooter
          isPending={save.isPending}
          saveLabel={t('actions.save')}
          savingLabel={t('actions.saving')}
          cancelLabel={t('actions.cancel')}
          onCancel={onCancel}
        />
      </form>
    </Form>
  );
}
