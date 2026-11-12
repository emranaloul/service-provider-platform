import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { FileText, FolderOpen, Trash2, Upload } from 'lucide-react';
import { AttachmentCategory } from '@/shared/api/enums';
import { mediaUrl } from '@/shared/api/media';
import { ListError } from '@/shared/components/list-error';
import { SelectField, UploadField } from '@/shared/components/layout/form';
import { IconTile, Panel, PanelHeader } from '@/shared/components/pulse';
import { CardListSkeleton } from '@/shared/components/skeletons';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Form } from '@/shared/components/ui/form';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { confirm } from '@/shared/lib/confirm-controller';
import { formatDate } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import {
  groupAttachments,
  providerAttachmentsQuery,
  useDeleteProviderAttachment,
  useUploadProviderAttachments,
} from '@/modules/profile/api/provider';
import type { ProviderAttachment } from '@/modules/profile/api/types';

/** Folder order and i18n key (`attachments.categories.*`). */
const FOLDERS: { category: AttachmentCategory; key: string }[] = [
  { category: AttachmentCategory.Proposal, key: 'proposal' },
  { category: AttachmentCategory.LegalDocument, key: 'legalDocument' },
  { category: AttachmentCategory.Invoice, key: 'invoice' },
  { category: AttachmentCategory.CustomerSuccess, key: 'customerSuccess' },
];

/**
 * Attachments tab (doc §7): four category folders. Listing needs
 * `view:`, uploading `upload:` and deleting `delete:service-provider-attachments`.
 */
export function ProviderAttachmentsPanel({
  providerId,
}: {
  providerId: number;
}) {
  const { t } = useTranslation('profile');
  const can = useSpPermissionCheck();
  const canView = can('view:service-provider-attachments');
  const canUpload = can('upload:service-provider-attachments');
  const canDelete = can('delete:service-provider-attachments');
  const list = useQuery({
    ...providerAttachmentsQuery(providerId),
    enabled: canView,
  });
  const groups = groupAttachments(list.data ?? []);
  const remove = useDeleteProviderAttachment(providerId);

  const onDelete = async (file: ProviderAttachment) => {
    const ok = await confirm({
      title: t('attachments.deleteTitle'),
      description: t('attachments.deleteDesc', {
        name: file.originalFileName,
      }),
      confirmText: t('actions.delete'),
      cancelText: t('actions.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await remove.mutateAsync(file.id);
      notify(t('attachments.deleted'), 'success');
    } catch {
      // Toasted by the global mutation handler.
    }
  };

  return (
    <div className='animate-enter flex flex-col gap-4.5'>
      {canUpload && <UploadPanel providerId={providerId} />}
      {!canView ? (
        <Alert>
          <AlertDescription>{t('attachments.noView')}</AlertDescription>
        </Alert>
      ) : list.isError ? (
        <ListError error={list.error} onRetry={() => void list.refetch()} />
      ) : (
        <div className='grid gap-4.5 lg:grid-cols-2'>
          {FOLDERS.map(({ category, key }) => {
            const files = groups.get(category) ?? [];
            return (
              <Panel key={category} aria-busy={list.isPending}>
                <PanelHeader
                  icon={
                    <IconTile tone='accent'>
                      <FolderOpen />
                    </IconTile>
                  }
                  title={t(`attachments.categories.${key}`)}
                  actions={
                    !list.isPending && (
                      <span className='num text-ink-2 text-sm'>
                        {files.length}
                      </span>
                    )
                  }
                />
                <div className='px-5 pb-5'>
                  {list.isPending ? (
                    <CardListSkeleton count={2} itemClassName='h-14' />
                  ) : files.length === 0 ? (
                    <p className='text-ink-2 text-sm'>
                      {t('attachments.empty')}
                    </p>
                  ) : (
                    <ul className='flex flex-col gap-2'>
                      {files.map((file) => (
                        <FileRow
                          key={file.id}
                          file={file}
                          onDelete={
                            canDelete ? () => void onDelete(file) : undefined
                          }
                          deleting={remove.isPending}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FileRow({
  file,
  onDelete,
  deleting,
}: {
  file: ProviderAttachment;
  onDelete?: () => void;
  deleting: boolean;
}) {
  const { t } = useTranslation('profile');
  const lang = useUiLang();
  return (
    <li className='border-line flex items-center gap-3 rounded-xl border p-2.5'>
      <IconTile>
        <FileText />
      </IconTile>
      <div className='flex min-w-0 flex-1 flex-col'>
        <a
          href={mediaUrl(file.relativePath)}
          target='_blank'
          rel='noreferrer'
          className='text-ink hover:text-brand truncate font-bold'
        >
          {file.originalFileName}
        </a>
        {file.createdDateUtc && (
          <span className='text-ink-3 num text-xs'>
            {formatDate(file.createdDateUtc, lang)}
          </span>
        )}
      </div>
      {onDelete && (
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={t('attachments.deleteLabel', {
            name: file.originalFileName,
          })}
          disabled={deleting}
          className='text-ink-2 hover:text-down'
          onClick={onDelete}
        >
          <Trash2 />
        </Button>
      )}
    </li>
  );
}

function UploadPanel({ providerId }: { providerId: number }) {
  const { t } = useTranslation('profile');
  const upload = useUploadProviderAttachments(providerId);
  const schema = useMemo(
    () =>
      z.object({
        category: z.string().min(1, t('validation.required')),
        files: z.array(z.instanceof(File)).min(1, t('attachments.pickFiles')),
      }),
    [t],
  );
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    // §7.3: the default folder is Proposal.
    defaultValues: {
      category: String(AttachmentCategory.Proposal),
      files: [],
    },
  });

  const onSubmit = form.handleSubmit(async ({ category, files }) => {
    try {
      await upload.mutateAsync({
        category: Number(category) as AttachmentCategory,
        files,
      });
      notify(t('attachments.uploaded', { count: files.length }), 'success');
      form.reset({ category, files: [] });
    } catch {
      // Toasted by the global mutation handler.
    }
  });

  return (
    <Panel>
      <PanelHeader
        icon={
          <IconTile>
            <Upload />
          </IconTile>
        }
        title={t('attachments.upload')}
        description={t('attachments.description')}
      />
      <Form {...form}>
        <form
          onSubmit={onSubmit}
          className='grid items-start gap-4 px-5 pb-5 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]'
          noValidate
        >
          <SelectField
            name='category'
            label={t('attachments.folder')}
            options={FOLDERS.map(({ category, key }) => ({
              value: String(category),
              label: t(`attachments.categories.${key}`),
            }))}
            required
          />
          <UploadField
            name='files'
            label={t('attachments.files')}
            removeLabel={t('form.removeFile')}
            multiple
            isFile
            required
          />
          <div className='flex justify-end sm:col-span-2'>
            <Button type='submit' variant='brand' disabled={upload.isPending}>
              <Upload />
              {upload.isPending
                ? t('attachments.uploading')
                : t('attachments.upload')}
            </Button>
          </div>
        </form>
      </Form>
    </Panel>
  );
}
