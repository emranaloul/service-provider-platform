import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import {
  useImportUsers,
  type UserImportResult,
} from '@/modules/team/api/users';

/**
 * Bulk import of provider users from a spreadsheet (Missing Items §12.4).
 * Some rows can fail while others succeed: show both the count and the
 * errors. There is no template endpoint for provider users.
 */
export function ImportUsersDialog({
  serviceProviderId,
  open,
  onClose,
}: {
  serviceProviderId: number;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('team');
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('import.title')}
    >
      {open && (
        <ImportForm serviceProviderId={serviceProviderId} onDone={onClose} />
      )}
    </EntityFormDialog>
  );
}

function ImportForm({
  serviceProviderId,
  onDone,
}: {
  serviceProviderId: number;
  onDone: () => void;
}) {
  const { t } = useTranslation('team');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<UserImportResult | null>(null);
  const importUsers = useImportUsers(serviceProviderId);

  const submit = async () => {
    if (!file) return;
    try {
      setResult(await importUsers.mutateAsync(file));
    } catch {
      // Toasted globally.
    }
  };

  if (result) {
    return (
      <div className='flex flex-col gap-4 py-2'>
        <p className='flex items-center gap-2 font-bold'>
          <CheckCircle2 className='text-up size-5' />
          {t('import.success', { count: result.successCount })}
        </p>
        {result.errors.length > 0 && (
          <Alert variant='destructive'>
            <AlertDescription>
              <p className='mb-2 font-bold'>
                {t('import.errors', { count: result.errors.length })}
              </p>
              <ul className='list-disc ps-5'>
                {result.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        <div className='border-line flex justify-end border-t pt-4'>
          <Button onClick={onDone}>{t('import.done')}</Button>
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4 py-2'>
      <p className='text-ink-2'>{t('import.description')}</p>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='import-file'>
          {t('import.file')}
          <span className='text-destructive'>*</span>
        </Label>
        <Input
          id='import-file'
          type='file'
          accept='.xlsx,.xls,.csv'
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file && (
          <span className='text-ink-2 text-small flex items-center gap-1.5'>
            <FileSpreadsheet className='size-4' />
            {file.name}
          </span>
        )}
      </div>
      <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
        <Button
          variant='secondary'
          onClick={onDone}
          disabled={importUsers.isPending}
        >
          {t('actions.cancel')}
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={!file || importUsers.isPending}
        >
          {importUsers.isPending && <Spinner />}
          {t('import.submit')}
        </Button>
      </div>
    </div>
  );
}
