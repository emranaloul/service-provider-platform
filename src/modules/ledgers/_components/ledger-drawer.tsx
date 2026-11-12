import { useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, FileText, Paperclip } from 'lucide-react';
import { LedgerStatus, UserType } from '@/shared/api/enums';
import { mediaUrl } from '@/shared/api/media';
import { ListError } from '@/shared/components/list-error';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { Spinner } from '@/shared/components/ui/spinner';
import { Switch } from '@/shared/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { Textarea } from '@/shared/components/ui/textarea';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { confirm } from '@/shared/lib/confirm-controller';
import { formatLocalDateTime, formatMoney } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { useSpPermissionCheck } from '@/shared/permissions';
import { useCurrentUser } from '@/shared/session/current-user';
import {
  downloadLedgerAttachments,
  exportLedgerToExcel,
  ledgerDetailsQuery,
  useAddLedgerAttachments,
  useSetLedgerAdminNote,
  useUpdateLedgerStatus,
} from '@/modules/ledgers/api/ledgers';
import type { Ledger, LedgerDetails } from '@/modules/ledgers/api/types';
import {
  formatPeriod,
  LEDGER_STATUS,
} from '@/modules/ledgers/lib/ledger-status';
import { LedgerStatusBadge } from '@/modules/ledgers/_components/ledger-status-badge';

/**
 * Ledger report and actions (doc §15). `ledger` is the list row when it is
 * on the current page — it carries status, period, tax and the admin note,
 * which the details endpoint does not return.
 */
export function LedgerDrawer({
  ledgerId,
  ledger,
  onClose,
}: {
  ledgerId: number | null;
  ledger: Ledger | undefined;
  onClose: () => void;
}) {
  const { t } = useTranslation('ledgers');
  const lang = useUiLang();
  const details = useQuery({
    ...ledgerDetailsQuery(ledgerId ?? 0),
    enabled: ledgerId !== null,
  });

  return (
    <Sheet open={ledgerId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={lang === 'ar' ? 'left' : 'right'}
        className='w-full data-[side=left]:sm:max-w-2xl data-[side=right]:sm:max-w-2xl'
      >
        <SheetHeader className='border-line border-b px-6 py-5'>
          <SheetTitle>{t('drawer.title', { id: ledgerId ?? '' })}</SheetTitle>
          <SheetDescription asChild>
            <div className='flex flex-wrap items-center gap-2'>
              {ledger && <LedgerStatusBadge status={ledger.status} />}
              {details.data && (
                <span className='num'>
                  {formatLocalDateTime(details.data.claimedDate, lang)}
                </span>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
          {details.isPending ? (
            <FieldsSkeleton count={6} />
          ) : details.isError ? (
            <div className='pt-5'>
              <ListError
                error={details.error}
                onRetry={() => void details.refetch()}
              />
            </div>
          ) : (
            <LedgerBody details={details.data} ledger={ledger} />
          )}
        </div>
        {ledgerId !== null && <LedgerActionsBar ledgerId={ledgerId} />}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='border-line flex flex-col gap-3 border-b py-5 last:border-b-0'>
      <h3 className='text-ink-2 text-sm font-bold'>{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='grid grid-cols-[minmax(100px,140px)_minmax(0,1fr)] gap-3'>
      <dt className='text-ink-2'>{label}</dt>
      <dd className='font-semibold'>{value || '—'}</dd>
    </div>
  );
}

function Money({ value }: { value: number }) {
  const { t } = useTranslation('ledgers');
  return (
    <span className='num whitespace-nowrap'>
      {formatMoney(value)} {t('sar')}
    </span>
  );
}

function LedgerBody({
  details: d,
  ledger,
}: {
  details: LedgerDetails;
  ledger: Ledger | undefined;
}) {
  const { t } = useTranslation('ledgers');
  const lang = useUiLang();
  const { groupId } = useCurrentUser();

  return (
    <>
      <Section title={t('drawer.totals')}>
        <dl className='flex flex-col gap-2'>
          <Row label={t('drawer.claimedBy')} value={d.claimedBy} />
          <Row
            label={t('drawer.claimedDate')}
            value={
              <span className='num'>
                {formatLocalDateTime(d.claimedDate, lang)}
              </span>
            }
          />
          {ledger && (
            <Row
              label={t('drawer.period')}
              value={
                <span className='num'>
                  {formatPeriod(ledger.claimedFrom, ledger.claimedTo, lang)}
                </span>
              }
            />
          )}
          <Row
            label={t('drawer.reservations')}
            value={<span className='num'>{d.reservationIds.length}</span>}
          />
          <Row label={t('drawer.cost')} value={<Money value={d.cost} />} />
          {ledger && (
            <>
              <Row
                label={t('drawer.total')}
                value={<Money value={ledger.total} />}
              />
              <Row
                label={t('drawer.tax')}
                value={<Money value={ledger.tax} />}
              />
            </>
          )}
        </dl>
        {ledger && groupId === UserType.Admin && (
          <StatusSwitch ledger={ledger} />
        )}
      </Section>

      <Section title={`${t('drawer.services')} (${d.servicesCount})`}>
        <LineTable
          lines={d.services.map((s) => ({
            key: `s-${s.serviceId}`,
            name: s.serviceName,
            ...s,
          }))}
        />
      </Section>

      <Section title={`${t('drawer.serviceGroups')} (${d.serviceGroupsCount})`}>
        <LineTable
          lines={d.serviceGroups.flatMap((g) => [
            {
              key: `g-${g.serviceGroupId}`,
              name: g.serviceGroupName,
              count: g.count,
              cost: g.cost,
              sellPrice: g.sellPrice,
            },
            ...g.services.map((s) => ({
              key: `g-${g.serviceGroupId}-s-${s.serviceId}`,
              name: s.serviceName,
              count: s.count,
              cost: s.cost,
              sellPrice: s.sellPrice,
              nested: true,
            })),
          ])}
        />
      </Section>

      <Section title={`${t('drawer.vaccines')} (${d.vaccinesCount})`}>
        <LineTable
          lines={d.vaccines.map((v) => ({
            key: `v-${v.vaccineId}`,
            name: v.vaccineName,
            ...v,
          }))}
        />
      </Section>

      <Section title={t('drawer.notes')}>
        <dl className='flex flex-col gap-2'>
          <Row label={t('drawer.note')} value={d.note} />
        </dl>
        {ledger && <AdminNote key={ledger.id} ledger={ledger} />}
      </Section>

      <Attachments ledgerId={d.id} attachment={d.attachment} />
    </>
  );
}

interface Line {
  key: string;
  name: string;
  count: number;
  cost: number;
  sellPrice: number;
  nested?: boolean;
}

function LineTable({ lines }: { lines: Line[] }) {
  const { t } = useTranslation('ledgers');
  if (lines.length === 0) {
    return <p className='text-ink-3'>{t('drawer.none')}</p>;
  }
  return (
    <div className='border-line overflow-hidden rounded-xl border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('drawer.name')}</TableHead>
            <TableHead className='text-end'>{t('drawer.count')}</TableHead>
            <TableHead className='text-end'>{t('drawer.cost')}</TableHead>
            <TableHead className='text-end'>{t('drawer.sellPrice')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((l) => (
            <TableRow key={l.key}>
              <TableCell
                className={
                  l.nested ? 'text-ink-2 ps-8' : 'text-ink font-semibold'
                }
              >
                {l.name}
              </TableCell>
              <TableCell className='num text-end'>{l.count}</TableCell>
              <TableCell className='text-end'>
                <Money value={l.cost} />
              </TableCell>
              <TableCell className='text-end'>
                <Money value={l.sellPrice} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Paid / Unpaid — Admin users only (`groupId = 1`, doc §15.3). */
function StatusSwitch({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('ledgers');
  const update = useUpdateLedgerStatus();
  const paid = ledger.status === LedgerStatus.Paid;

  const change = async (checked: boolean) => {
    const status = checked ? LedgerStatus.Paid : LedgerStatus.UnPaid;
    const ok = await confirm({
      title: t('drawer.statusTitle', { id: ledger.id }),
      description: t('drawer.statusDesc', {
        status: t(`status.${LEDGER_STATUS[status].key}`),
      }),
    });
    if (!ok) return;
    try {
      await update.mutateAsync({ id: ledger.id, status });
      notify(t('drawer.statusChanged'), 'success');
    } catch {
      // Toasted globally.
    }
  };

  return (
    <div className='flex items-center gap-2.5'>
      <Switch
        id='ledger-paid'
        checked={paid}
        disabled={update.isPending}
        onCheckedChange={(c) => void change(c)}
      />
      <Label htmlFor='ledger-paid'>{t('drawer.statusLabel')}</Label>
    </div>
  );
}

/** Read-only for everyone; editable with the admin-note permission. */
function AdminNote({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation('ledgers');
  const can = useSpPermissionCheck();
  const save = useSetLedgerAdminNote();
  const [note, setNote] = useState(ledger.adminNote ?? '');

  if (!can('update:service-provider-ledgers-admin-note')) {
    return (
      <dl className='flex flex-col gap-2'>
        <Row label={t('drawer.adminNote')} value={ledger.adminNote} />
      </dl>
    );
  }

  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor='ledger-admin-note'>{t('drawer.adminNote')}</Label>
      <Textarea
        id='ledger-admin-note'
        value={note}
        placeholder={t('drawer.adminNotePlaceholder')}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button
        variant='outline'
        className='self-end'
        disabled={save.isPending || note === (ledger.adminNote ?? '')}
        onClick={async () => {
          try {
            await save.mutateAsync({ id: ledger.id, note: note.trim() });
            notify(t('drawer.noteSaved'), 'success');
          } catch {
            // Toasted globally.
          }
        }}
      >
        {save.isPending && <Spinner />}
        {t('drawer.saveNote')}
      </Button>
    </div>
  );
}

function Attachments({
  ledgerId,
  attachment,
}: {
  ledgerId: number;
  attachment: string;
}) {
  const { t } = useTranslation('ledgers');
  const add = useAddLedgerAttachments();
  const href = mediaUrl(attachment);
  const name = attachment ? (attachment.split('/').pop() ?? attachment) : '';

  return (
    <Section title={t('drawer.attachments')}>
      {href ? (
        <a
          href={href}
          target='_blank'
          rel='noreferrer'
          className='border-line text-brand flex items-center gap-2 rounded-lg border px-3 py-2 font-semibold'
        >
          <FileText className='text-ink-2 size-4 shrink-0' />
          <span className='min-w-0 flex-1 truncate'>{name}</span>
        </a>
      ) : (
        <p className='text-ink-3'>{t('drawer.noAttachment')}</p>
      )}
      <Label className='flex flex-col items-start gap-1.5'>
        <span className='flex items-center gap-1.5 text-sm font-bold'>
          <Paperclip className='size-4' />
          {t('drawer.addFiles')}
        </span>
        <Input
          type='file'
          multiple
          disabled={add.isPending}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (!files.length) return;
            try {
              await add.mutateAsync({ id: ledgerId, files });
              notify(t('drawer.filesAdded'), 'success');
            } catch {
              // Toasted globally.
            }
          }}
        />
      </Label>
    </Section>
  );
}

function LedgerActionsBar({ ledgerId }: { ledgerId: number }) {
  const { t } = useTranslation('ledgers');
  const exportExcel = useMutation({ mutationFn: exportLedgerToExcel });
  const downloadAll = useMutation({ mutationFn: downloadLedgerAttachments });

  return (
    <div className='border-line flex flex-wrap justify-end gap-2.5 border-t px-6 py-4'>
      <Button
        variant='outline'
        disabled={downloadAll.isPending}
        onClick={() => downloadAll.mutate(ledgerId)}
      >
        {downloadAll.isPending ? <Spinner /> : <Download />}
        {t('drawer.downloadAll')}
      </Button>
      <Button
        variant='brand'
        disabled={exportExcel.isPending}
        onClick={() => exportExcel.mutate(ledgerId)}
      >
        {exportExcel.isPending ? <Spinner /> : <FileSpreadsheet />}
        {t('drawer.export')}
      </Button>
    </div>
  );
}
