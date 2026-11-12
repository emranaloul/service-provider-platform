import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  citiesQuery,
  classificationsQuery,
  countriesQuery,
  type Option,
} from '@/shared/api/lookups';
import { useTags } from '@/shared/api/use-tags';
import { mediaUrl } from '@/shared/api/media';
import {
  CheckboxGroupField,
  FormFooter,
  SelectField,
  SwitchField,
  TextField,
  UploadField,
} from '@/shared/components/layout/form';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { Form } from '@/shared/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { notify } from '@/shared/lib/notify';
import { useCurrentUser } from '@/shared/session/current-user';
import { branchQuery, useSaveBranch } from '@/modules/branches/api/branches';
import type { Branch } from '@/modules/branches/api/types';
import {
  branchFormDefaults,
  branchFormSchema,
  branchPayload,
  type BranchFormInput,
  type BranchFormValues,
} from '@/modules/branches/lib/branch-form';

const toOptions = (list: Option[] | undefined) =>
  (list ?? []).map((o) => ({ value: String(o.id), label: o.name }));

/**
 * Add / edit branch drawer (doc §8.3–§8.5). `branchId` is `'new'` to add,
 * a branch id to edit, or `null` when closed.
 */
export function BranchFormSheet({
  branchId,
  onClose,
  onCreated,
}: {
  branchId: number | 'new' | null;
  onClose: () => void;
  /** After a create, e.g. to open the new branch. */
  onCreated?: (branch: Branch) => void;
}) {
  const { t } = useTranslation('branches');
  const lang = useUiLang();
  const editId = typeof branchId === 'number' ? branchId : 0;
  const { data: branch, isPending } = useQuery({
    ...branchQuery(editId),
    enabled: editId > 0,
  });
  const loading = editId > 0 && isPending;

  return (
    <Sheet open={branchId !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side={lang === 'ar' ? 'left' : 'right'}
        className='w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
      >
        <SheetHeader className='border-line border-b px-6 py-5'>
          <SheetTitle>
            {editId ? t('form.editTitle') : t('form.addTitle')}
          </SheetTitle>
          <SheetDescription>{t('subtitle')}</SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
          {loading ? (
            <FieldsSkeleton count={8} />
          ) : (
            <BranchForm
              // Remount per record so defaults are read once, after load.
              key={branch?.id ?? 'new'}
              branch={editId ? branch : undefined}
              onDone={(saved) => {
                onClose();
                if (!editId) onCreated?.(saved);
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BranchForm({
  branch,
  onDone,
  onCancel,
}: {
  branch: Branch | undefined;
  onDone: (saved: Branch) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('branches');
  const { serviceProviderId } = useCurrentUser();
  const schema = useMemo(() => branchFormSchema(t), [t]);
  const form = useForm<BranchFormInput, unknown, BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: branchFormDefaults(branch, serviceProviderId),
  });
  const save = useSaveBranch();

  const countryId =
    Number(useWatch({ control: form.control, name: 'countryId' })) || undefined;
  const classifications = useQuery(classificationsQuery());
  const countries = useQuery(countriesQuery());
  const cities = useQuery(citiesQuery(countryId));
  const tags = useTags();
  const providerError = form.formState.errors.serviceProviderId?.message;
  const currentLogo = mediaUrl(branch?.logo);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync({
        id: branch?.id,
        body: branchPayload(values, branch),
      });
      notify(branch ? t('toast.updated') : t('toast.created'), 'success');
      onDone(saved);
    } catch {
      // The global mutation handler already showed the error.
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className='flex flex-col gap-6 pt-5' noValidate>
        {providerError && (
          <Alert variant='destructive'>
            <AlertDescription>{t('noProvider')}</AlertDescription>
          </Alert>
        )}

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.names')}
          </legend>
          <TextField name='nameEn' label={t('form.nameEn')} required />
          <TextField name='addressEn' label={t('form.addressEn')} required />
          <TextField
            name='nameAr'
            label={t('form.nameAr')}
            description={t('form.arabicHint')}
            dir='rtl'
          />
          <TextField name='addressAr' label={t('form.addressAr')} dir='rtl' />
        </fieldset>

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.details')}
          </legend>
          <SelectField
            name='classificationId'
            label={t('form.classification')}
            description={t('form.classificationHint')}
            placeholder={t('form.select')}
            options={toOptions(classifications.data)}
            required
          />
          <SwitchField
            name='status'
            label={t('form.status')}
            description={t('form.statusHint')}
          />
        </fieldset>

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.location')}
          </legend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <SelectField
              name='countryId'
              label={t('form.country')}
              placeholder={t('form.select')}
              options={toOptions(countries.data)}
              // City options depend on the country (§8.5).
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
              name='latitude'
              label={t('form.latitude')}
              inputMode='decimal'
              dir='ltr'
              className='num'
              required
            />
            <TextField
              name='longitude'
              label={t('form.longitude')}
              inputMode='decimal'
              dir='ltr'
              className='num'
              required
            />
          </div>
        </fieldset>

        <fieldset className='flex flex-col gap-4'>
          <legend className='text-ink-2 mb-3 text-sm font-bold'>
            {t('form.contact')}
          </legend>
          <div className='grid gap-4 sm:grid-cols-2'>
            <TextField name='firstName' label={t('form.firstName')} required />
            <TextField name='lastName' label={t('form.lastName')} required />
            <TextField
              name='email'
              type='email'
              label={t('form.email')}
              dir='ltr'
              required
            />
            <TextField
              name='phone'
              type='tel'
              label={t('form.phone')}
              dir='ltr'
              className='num'
              required
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
          {currentLogo && (
            <img
              src={currentLogo}
              alt=''
              className='border-line size-16 shrink-0 rounded-xl border object-cover'
            />
          )}
          <UploadField
            name='logo'
            accept='image/*'
            label={t('form.logo')}
            description={t('form.logoHint')}
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
