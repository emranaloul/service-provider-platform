import { useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { FileText, Settings2, Trash2 } from 'lucide-react';
import { WEEK_DAYS } from '@/shared/api/enums';
import { useTags } from '@/shared/api/use-tags';
import { mediaUrl } from '@/shared/api/media';
import {
  CheckboxGroupField,
  DateMultipleField,
  FormFooter,
  SelectField,
  SwitchField,
  TextField,
  UploadField,
} from '@/shared/components/layout/form';
import { toDateOnly } from '@/shared/components/layout/form/date-utils';
import { IconTile, Panel, PanelHeader } from '@/shared/components/pulse';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/ui/form';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import {
  useDeleteProviderImage,
  useSaveProvider,
} from '@/modules/profile/api/provider';
import type { ServiceProvider } from '@/modules/profile/api/types';
import { providerReasonRequired } from '@/modules/profile/lib/provider-payload';
import {
  providerFormDefaults,
  providerFormSchema,
  toProviderValues,
  type ProviderFormInput,
  type ProviderFormOutput,
} from '@/modules/profile/_components/provider-form-schema';
import {
  useCategoryOptions,
  WEEKDAY_KEY,
} from '@/modules/profile/_components/provider-shared';

/**
 * Settings tab (doc §6.4–§6.6, §17.2): edit the provider. Viewing needs
 * `view:service-provider-settings`; saving and deleting the icon /
 * attachment need `update:service-provider-settings`.
 */
export function ProviderSettingsForm({
  provider,
}: {
  provider: ServiceProvider;
}) {
  const { t } = useTranslation('profile');
  const can = useSpPermissionCheck();
  const canUpdate = can('update:service-provider-settings');
  const schema = useMemo(() => providerFormSchema(t, provider), [t, provider]);
  const form = useForm<ProviderFormInput, unknown, ProviderFormOutput>({
    resolver: zodResolver(schema),
    defaultValues: providerFormDefaults(provider),
  });
  const save = useSaveProvider();
  const deleteImage = useDeleteProviderImage();
  const categories = useCategoryOptions();
  const tags = useTags();

  const closingDates = useWatch({
    control: form.control,
    name: 'closingDates',
  });
  const reasonRequired = providerReasonRequired(
    { closingDates: closingDates.map(toDateOnly) },
    provider,
  );
  const currentIcon = mediaUrl(provider.icon);
  const currentAttachment = mediaUrl(provider.attachment);

  const dayOptions = WEEK_DAYS.map((d) => ({
    value: String(d),
    label: t(`weekdays.${WEEKDAY_KEY[d]}`),
  }));
  const tagOptions = (tags.data ?? []).map((o) => ({
    value: String(o.id),
    label: o.name,
  }));

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ values: toProviderValues(values), provider });
      notify(t('toast.saved'), 'success');
      // Keep what was saved, but drop the picked files and the used reason
      // so a second save does not upload them again.
      form.reset({
        ...form.getValues(),
        icon: null,
        attachment: null,
        reason: '',
      });
    } catch {
      // The global mutation handler already showed the error.
    }
  });

  const removeFile = async (which: 'icon' | 'attachment') => {
    const ok = await confirm({
      title:
        which === 'icon'
          ? t('form.deleteIconConfirm')
          : t('form.deleteAttachmentConfirm'),
      description: t('form.deleteFileDesc'),
      confirmText: t('actions.delete'),
      cancelText: t('actions.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteImage.mutateAsync({ id: provider.id, which });
      notify(
        which === 'icon' ? t('form.iconDeleted') : t('form.attachmentDeleted'),
        'success',
      );
    } catch {
      // Toasted by the global mutation handler.
    }
  };

  return (
    <Panel className='animate-enter'>
      <PanelHeader
        icon={
          <IconTile>
            <Settings2 />
          </IconTile>
        }
        title={t('tabs.settings')}
      />
      <Form {...form}>
        <form onSubmit={onSubmit} className='px-5 pb-6' noValidate>
          {!canUpdate && (
            <Alert className='mb-5'>
              <AlertDescription>{t('form.readOnly')}</AlertDescription>
            </Alert>
          )}
          <fieldset
            disabled={!canUpdate}
            className='flex flex-col gap-7 disabled:opacity-90'
          >
            <fieldset className='flex flex-col gap-4'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.names')}
              </legend>
              <div className='grid gap-4 sm:grid-cols-2'>
                <TextField name='nameEn' label={t('form.nameEn')} required />
                <TextField
                  name='nameAr'
                  label={t('form.nameAr')}
                  description={t('form.arabicHint')}
                  dir='rtl'
                />
              </div>
            </fieldset>

            <fieldset className='flex flex-col gap-4'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.company')}
              </legend>
              <div className='grid gap-4 sm:grid-cols-2'>
                <TextField
                  name='companyName'
                  label={t('form.companyName')}
                  required
                />
                <TextField
                  name='crNumber'
                  label={t('form.crNumber')}
                  dir='ltr'
                  className='num'
                  required
                />
                <TextField
                  name='vatNumber'
                  label={t('form.vatNumber')}
                  inputMode='numeric'
                  dir='ltr'
                  className='num'
                />
                <TextField
                  name='bankDetails'
                  label={t('form.bankDetails')}
                  required
                />
              </div>
            </fieldset>

            <fieldset className='flex flex-col gap-4'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.contact')}
              </legend>
              <div className='grid gap-4 sm:grid-cols-2'>
                <TextField
                  name='firstName'
                  label={t('form.firstName')}
                  required
                />
                <TextField
                  name='lastName'
                  label={t('form.lastName')}
                  required
                />
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

            <fieldset className='flex flex-col gap-4'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.details')}
              </legend>
              <div className='grid items-start gap-4 sm:grid-cols-2'>
                <SelectField
                  name='categoryId'
                  label={t('form.category')}
                  placeholder={t('form.select')}
                  options={categories.options}
                  disabled={!canUpdate}
                  required
                />
                <SwitchField
                  name='status'
                  label={t('form.status')}
                  description={t('form.statusHint')}
                  disabled={!canUpdate}
                />
              </div>
              {tagOptions.length > 0 && (
                <CheckboxGroupField
                  name='tagIds'
                  label={t('form.tags')}
                  options={tagOptions}
                  orientation='horizontal'
                  disabled={!canUpdate}
                />
              )}
            </fieldset>

            <fieldset className='flex flex-col gap-4'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.closing')}
              </legend>
              <CheckboxGroupField
                name='closingDays'
                label={t('form.closingDays')}
                options={dayOptions}
                orientation='horizontal'
                disabled={!canUpdate}
              />
              <DateMultipleField
                name='closingDates'
                label={t('form.closingDates')}
                placeholder={t('form.closingDatesHint')}
                description={t('form.closingDatesHint')}
                disabled={!canUpdate}
              />
              {reasonRequired && (
                <TextField
                  name='reason'
                  as='textarea'
                  label={t('form.reason')}
                  description={t('form.reasonHint')}
                  required
                />
              )}
            </fieldset>

            <fieldset className='flex flex-col gap-5'>
              <legend className='text-ink-2 mb-3 text-sm font-bold'>
                {t('form.files')}
              </legend>
              <div className='flex items-start gap-4'>
                {currentIcon && (
                  <div className='flex shrink-0 flex-col items-center gap-2'>
                    <img
                      src={currentIcon}
                      alt=''
                      className='border-line size-16 rounded-xl border object-cover'
                    />
                    {canUpdate && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-down'
                        disabled={deleteImage.isPending}
                        onClick={() => void removeFile('icon')}
                      >
                        <Trash2 />
                        {t('form.deleteIcon')}
                      </Button>
                    )}
                  </div>
                )}
                <UploadField
                  name='icon'
                  accept='image/*'
                  label={t('form.icon')}
                  description={t('form.iconHint')}
                  removeLabel={t('form.removeFile')}
                  disabled={!canUpdate}
                  className='flex-1'
                />
              </div>
              <div className='flex flex-col gap-3'>
                {currentAttachment && (
                  <div className='border-line flex flex-wrap items-center gap-3 rounded-xl border p-3'>
                    <IconTile>
                      <FileText />
                    </IconTile>
                    <a
                      href={currentAttachment}
                      target='_blank'
                      rel='noreferrer'
                      className='text-brand min-w-0 flex-1 truncate font-bold'
                    >
                      {t('form.currentAttachment')}
                    </a>
                    {canUpdate && (
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        className='text-down'
                        disabled={deleteImage.isPending}
                        onClick={() => void removeFile('attachment')}
                      >
                        <Trash2 />
                        {t('form.deleteAttachment')}
                      </Button>
                    )}
                  </div>
                )}
                <UploadField
                  name='attachment'
                  label={t('form.attachment')}
                  description={t('form.attachmentHint')}
                  removeLabel={t('form.removeFile')}
                  disabled={!canUpdate}
                  isFile
                />
              </div>
            </fieldset>
          </fieldset>

          {canUpdate && (
            <FormFooter
              className='mt-6'
              isPending={save.isPending}
              saveLabel={t('actions.save')}
              savingLabel={t('actions.saving')}
            />
          )}
        </form>
      </Form>
    </Panel>
  );
}
