import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Trash2 } from 'lucide-react';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { Textarea } from '@/shared/components/ui/textarea';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { formatMoney } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import type { Order } from '@/modules/reservations/api/types';
import { useClaimOrders } from '@/modules/ledgers/api/ledgers';
import { claimSummary } from '@/modules/ledgers/lib/claim';
import { claimTaxTotals } from '@/modules/ledgers/lib/claim-totals';
import { formatPeriod } from '@/modules/ledgers/lib/ledger-status';

/**
 * Claim the selected orders (doc §14.2): a required note and optional files.
 * `onClaimed` gets the claimed period so the page can show its ledgers.
 */
export function ClaimDialog({
  orders,
  context,
  open,
  onClose,
  onClaimed,
}: {
  orders: readonly Order[];
  context: Record<string, number | undefined>;
  open: boolean;
  onClose: () => void;
  onClaimed: (period: { from: string | null; to: string | null }) => void;
}) {
  const { t } = useTranslation('ledgers');
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={t('claim.dialog.title', { count: orders.length })}
      contentClassName='lg:max-w-xl'
    >
      {open && (
        <ClaimForm
          orders={orders}
          context={context}
          onCancel={onClose}
          onClaimed={onClaimed}
        />
      )}
    </EntityFormDialog>
  );
}

function ClaimForm({
  orders,
  context,
  onCancel,
  onClaimed,
}: {
  orders: readonly Order[];
  context: Record<string, number | undefined>;
  onCancel: () => void;
  onClaimed: (period: { from: string | null; to: string | null }) => void;
}) {
  const { t } = useTranslation('ledgers');
  const lang = useUiLang();
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const claim = useClaimOrders();
  const summary = claimSummary(orders);
  const taxTotals = claimTaxTotals(orders);
  const noteMissing = note.trim() === '';

  const submit = async () => {
    setSubmitted(true);
    if (noteMissing || orders.length === 0) return;
    try {
      await claim.mutateAsync({ input: { orders, note, files }, context });
      notify(t('claim.dialog.done'), 'success');
      onClaimed({ from: summary.from, to: summary.to });
    } catch {
      // Toasted globally.
    }
  };

  return (
    <div className='flex flex-col gap-5 py-2'>
      <dl className='bg-sunken grid grid-cols-2 gap-3 rounded-xl p-4'>
        <div className='flex flex-col gap-0.5'>
          <dt className='text-ink-3 text-xs font-bold'>
            {t('claim.summary.cost')}
          </dt>
          <dd className='num text-ink font-bold'>
            {formatMoney(summary.cost)} {t('sar')}
          </dd>
        </div>
        <div className='flex flex-col gap-0.5'>
          <dt className='text-ink-3 text-xs font-bold'>
            {t('claim.summary.costWithTax')}
          </dt>
          <dd className='num text-ink font-bold'>
            {formatMoney(taxTotals.costWithTax)} {t('sar')}
          </dd>
        </div>
        <div className='flex flex-col gap-0.5'>
          <dt className='text-ink-3 text-xs font-bold'>
            {t('claim.summary.sellPrice')}
          </dt>
          <dd className='num text-ink font-bold'>
            {formatMoney(summary.sellPrice)} {t('sar')}
          </dd>
        </div>
        <div className='flex flex-col gap-0.5'>
          <dt className='text-ink-3 text-xs font-bold'>
            {t('claim.summary.sellPriceWithTax')}
          </dt>
          <dd className='num text-ink font-bold'>
            {formatMoney(taxTotals.sellPriceWithTax)} {t('sar')}
          </dd>
        </div>
        <div className='col-span-2 flex flex-col gap-0.5'>
          <dt className='text-ink-3 text-xs font-bold'>
            {t('claim.summary.period')}
          </dt>
          <dd className='num text-ink font-bold'>
            {formatPeriod(summary.from, summary.to, lang)}
          </dd>
        </div>
      </dl>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='claim-note'>
          {t('claim.dialog.note')}
          <span className='text-down'>*</span>
        </Label>
        <Textarea
          id='claim-note'
          value={note}
          placeholder={t('claim.dialog.notePlaceholder')}
          aria-invalid={submitted && noteMissing}
          onChange={(e) => setNote(e.target.value)}
        />
        {submitted && noteMissing && (
          <p role='alert' className='text-down text-small'>
            {t('claim.dialog.noteRequired')}
          </p>
        )}
      </div>

      <div className='flex flex-col gap-2'>
        <Label htmlFor='claim-files'>{t('claim.dialog.files')}</Label>
        <Input
          id='claim-files'
          type='file'
          multiple
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles((f) => [...f, ...picked]);
            e.target.value = '';
          }}
        />
        {files.length > 0 && (
          <ul className='flex flex-col gap-1.5'>
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className='border-line flex items-center gap-2 rounded-lg border px-3 py-2'
              >
                <FileText className='text-ink-2 size-4 shrink-0' />
                <span className='min-w-0 flex-1 truncate'>{f.name}</span>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  aria-label={t('claim.dialog.removeFile', { name: f.name })}
                  onClick={() =>
                    setFiles((all) => all.filter((_, j) => j !== i))
                  }
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
        <Button
          variant='secondary'
          onClick={onCancel}
          disabled={claim.isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button
          variant='brand'
          onClick={() => void submit()}
          disabled={claim.isPending}
        >
          {claim.isPending && <Spinner />}
          {claim.isPending
            ? t('claim.dialog.submitting')
            : t('claim.dialog.submit')}
        </Button>
      </div>
    </div>
  );
}
