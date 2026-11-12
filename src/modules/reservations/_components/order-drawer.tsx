import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  ChevronDown,
  Copy,
  FileText,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import { OrderStatus } from '@/shared/api/enums';
import { mediaUrl } from '@/shared/api/media';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { ListError } from '@/shared/components/list-error';
import { ReservationStatusBadge } from '@/shared/components/reservation-status-badge';
import { Tag } from '@/shared/components/pulse';
import { StatusBadge } from '@/shared/components/status-badge';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/shared/components/ui/sheet';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { confirm } from '@/shared/lib/confirm-controller';
import { formatLocalDateTime, formatMoney } from '@/shared/lib/format';
import { useSpPermissionCheck } from '@/shared/permissions';
import { notify } from '@/shared/lib/notify';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import { langIdOf } from '@/shared/lib/translation';
import {
  orderQuery,
  useAddOrderAttachments,
  useChangeOrderStatus,
  useDeleteOrderAttachment,
} from '@/modules/reservations/api/orders';
import type { ReservationDetails } from '@/modules/reservations/api/types';
import {
  CHANNEL_KEY,
  FUNDING_KEY,
  orderChannel,
  orderFunding,
} from '@/modules/reservations/lib/order-labels';
import {
  statusTargets,
  nextStep,
  orderQrLink,
  STEP_STATUS,
} from '@/modules/reservations/lib/order-rules';
import { useOrderActions } from '@/modules/reservations/lib/use-order-actions';

/** Reservation details and actions (doc §13.3, §13.4). */
export function OrderDrawer({
  orderId,
  onClose,
  onComplete,
  onCancel,
  onEditVaccines,
  onUpdateResult,
  onUpdatePrice,
}: {
  orderId: string | null;
  onClose: () => void;
  onComplete: () => void;
  onCancel: () => void;
  /** Opens the vaccines editor (`&dialog=vaccines`). */
  onEditVaccines: () => void;
  /** Opens "Update result" (`&dialog=result`). */
  onUpdateResult: () => void;
  /** Opens "Update price" (`&dialog=price`). */
  onUpdatePrice: () => void;
}) {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const order = useQuery({ ...orderQuery(orderId ?? ''), enabled: !!orderId });

  return (
    <Sheet open={orderId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side={lang === 'ar' ? 'left' : 'right'}
        className='w-full data-[side=left]:sm:max-w-xl data-[side=right]:sm:max-w-xl'
      >
        <SheetHeader className='border-line border-b px-6 py-5'>
          <SheetTitle dir='auto'>
            {t('drawer.title', { id: orderId ?? '' })}
          </SheetTitle>
          <SheetDescription asChild>
            <div className='flex flex-wrap items-center gap-2'>
              {order.data && (
                <>
                  <ReservationStatusBadge
                    status={statusKeyOf(order.data.status)}
                  />
                  <span className='num'>
                    {formatLocalDateTime(order.data.dateChosen, lang)}
                  </span>
                </>
              )}
            </div>
          </SheetDescription>
        </SheetHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 pb-6'>
          {order.isPending ? (
            <FieldsSkeleton count={6} />
          ) : order.isError ? (
            <div className='pt-5'>
              <ListError
                error={order.error}
                onRetry={() => void order.refetch()}
              />
            </div>
          ) : (
            <OrderBody
              order={order.data}
              onEditVaccines={onEditVaccines}
              onUpdateResult={onUpdateResult}
              onUpdatePrice={onUpdatePrice}
            />
          )}
        </div>
        {order.data && (
          <OrderActionsBar
            order={order.data}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        )}
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

function OrderBody({
  order: o,
  onEditVaccines,
  onUpdateResult,
  onUpdatePrice,
}: {
  order: ReservationDetails;
  onEditVaccines: () => void;
  onUpdateResult: () => void;
  onUpdatePrice: () => void;
}) {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const actions = useOrderActions({ ...o });
  const channel = orderChannel(o);
  const funding = orderFunding(o);
  const rs = o.reservationServices;

  return (
    <>
      <Section title={t('drawer.patient')}>
        <dl className='flex flex-col gap-2'>
          <Row label={t('drawer.patient')} value={o.ownerName} />
          <Row
            label={t('drawer.phone')}
            value={
              <span dir='ltr' className='num'>
                {o.ownerPhone}
              </span>
            }
          />
          <Row
            label={t('drawer.identity')}
            value={
              o.identityNumber && (
                <span className='num'>{o.identityNumber}</span>
              )
            }
          />
          <Row
            label={t('drawer.company')}
            value={[o.companyName, o.companyBranchName]
              .filter(Boolean)
              .join(' · ')}
          />
          <Row label={t('drawer.branch')} value={o.serviceProviderBranchName} />
          <Row
            label={t('drawer.createdAt')}
            value={
              <span className='num'>
                {formatLocalDateTime(o.createdAt, lang)}
              </span>
            }
          />
          <Row label={t('drawer.createdBy')} value={o.createdByName} />
          <Row
            label={t('drawer.channel')}
            value={channel && t(`channel.${CHANNEL_KEY[channel]}`)}
          />
          <Row
            label={t('drawer.funding')}
            value={funding && t(`funding.${FUNDING_KEY[funding]}`)}
          />
        </dl>
        {o.isClaimedByProvider && (
          <StatusBadge variant='accent' label={t('drawer.claimed')} />
        )}
      </Section>

      <Section title={t('drawer.services')}>
        {!rs || (rs.services.length === 0 && rs.groupServices.length === 0) ? (
          <p className='text-ink-3'>{t('drawer.noServices')}</p>
        ) : (
          <ul className='flex flex-col gap-2'>
            {rs.groupServices.map((g) => (
              <li
                key={`g-${g.reservationServiceId}`}
                className='flex flex-col gap-1'
              >
                <span className='font-bold'>{g.serviceGroupName}</span>
                <span className='flex flex-wrap gap-1.5'>
                  {g.services.map((s) => (
                    <Tag key={s.reservationServiceId}>{s.serviceName}</Tag>
                  ))}
                </span>
              </li>
            ))}
            {rs.services.map((s) => (
              <li key={`s-${s.reservationServiceId}`} className='font-bold'>
                {s.serviceName}
              </li>
            ))}
          </ul>
        )}
        {actions.viewVaccines && (
          <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between gap-2'>
              <span className='text-ink-2 text-sm font-bold'>
                {t('drawer.vaccines')}
              </span>
              {actions.updateVaccines && (
                <Button variant='ghost' size='sm' onClick={onEditVaccines}>
                  <Pencil />
                  {t('vaccines.edit')}
                </Button>
              )}
            </div>
            {(o.reservationVaccines?.length ?? 0) === 0 ? (
              <p className='text-ink-3'>{t('vaccines.none')}</p>
            ) : (
              <span className='flex flex-wrap gap-1.5'>
                {o.reservationVaccines?.map((v) => (
                  <Tag key={v.id}>{v.vaccineName ?? `#${v.vaccineId}`}</Tag>
                ))}
              </span>
            )}
          </div>
        )}
      </Section>

      <Section title={t('drawer.prices')}>
        {actions.updatePrice && (
          <Button
            variant='ghost'
            size='sm'
            className='self-start'
            onClick={onUpdatePrice}
          >
            <Pencil />
            {t('updatePrice.open')}
          </Button>
        )}
        <dl className='flex flex-col gap-2'>
          <Row
            label={t('drawer.cost')}
            value={
              <span className='num'>
                {formatMoney(o.cost + o.costTax)} {t('sar')}{' '}
                <span className='text-ink-3 font-normal'>
                  ({t('drawer.costTax', { amount: formatMoney(o.costTax) })})
                </span>
              </span>
            }
          />
          <Row
            label={t('drawer.sellPrice')}
            value={
              <span className='num'>
                {formatMoney(o.sellPrice + o.sellPriceTax)} {t('sar')}
              </span>
            }
          />
        </dl>
      </Section>

      {(o.note || o.adminNotes || o.cancelationReason || o.rejectionReason) && (
        <Section title={t('drawer.notes')}>
          <dl className='flex flex-col gap-2'>
            {o.note && <Row label={t('drawer.note')} value={o.note} />}
            {o.adminNotes && (
              <Row label={t('drawer.adminNotes')} value={o.adminNotes} />
            )}
            {o.cancelationReason && (
              <Row
                label={t('drawer.cancelReason')}
                value={o.cancelationReason}
              />
            )}
            {o.rejectionReason && (
              <Row label={t('drawer.rejectReason')} value={o.rejectionReason} />
            )}
          </dl>
        </Section>
      )}

      {(actions.editResult ||
        actions.updateResult ||
        (o.attachments?.length ?? 0) > 0) && (
        <ResultFiles
          order={o}
          canEdit={actions.editResult}
          onUpdateResult={actions.updateResult ? onUpdateResult : undefined}
        />
      )}

      {(o.reservationQuestionAnswers?.length ?? 0) > 0 && (
        <Section title={t('drawer.answers')}>
          <dl className='flex flex-col gap-3'>
            {o.reservationQuestionAnswers?.map((qa) => (
              <div key={qa.id} className='flex flex-col gap-0.5'>
                <dt className='text-ink-2' dir='auto'>
                  {qa.question}
                </dt>
                <dd className='font-semibold' dir='auto'>
                  {qa.answer || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      )}

      {(o.statusLogs?.length ?? 0) > 0 && (
        <Section title={t('drawer.history')}>
          <ol className='flex flex-col gap-2.5'>
            {o.statusLogs?.map((log) => (
              <li key={log.id} className='flex flex-wrap items-center gap-2'>
                <ReservationStatusBadge status={statusKeyOf(log.status)} />
                <span className='num text-ink-2'>
                  {formatLocalDateTime(log.createdAt, lang)}
                </span>
                <span className='text-ink-3'>{log.createdBy}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}
    </>
  );
}

/**
 * Result files of a completed order: add / remove (§13.4). Adding needs the
 * edit-result rule; removing also needs `delete-attachment:service-provider-orders`
 * (§16.2).
 */
function ResultFiles({
  order: o,
  canEdit,
  onUpdateResult,
}: {
  order: ReservationDetails;
  canEdit: boolean;
  /** Set when the user may use "Update result" (Missing Items §12.3). */
  onUpdateResult?: () => void;
}) {
  const { t } = useTranslation('reservations');
  const add = useAddOrderAttachments();
  const remove = useDeleteOrderAttachment();
  const can = useSpPermissionCheck();
  const canDelete = canEdit && can('delete-attachment:service-provider-orders');
  const paths = o.attachments ?? [];

  return (
    <Section title={t('drawer.result')}>
      {o.status === OrderStatus.Complete && (
        <div className='flex flex-wrap items-center gap-2'>
          <StatusBadge
            variant={o.isfit ? 'up' : 'down'}
            label={o.isfit ? t('drawer.fit') : t('drawer.unfit')}
          />
          {onUpdateResult && (
            <Button variant='ghost' size='sm' onClick={onUpdateResult}>
              <Pencil />
              {t('updateResult.open')}
            </Button>
          )}
        </div>
      )}
      {paths.length === 0 ? (
        <p className='text-ink-3'>{t('drawer.noFiles')}</p>
      ) : (
        <ul className='flex flex-col gap-1.5'>
          {paths.map((path, i) => {
            const name = path.split('/').pop() ?? path;
            const href = o.fullPathAttachments?.[i] ?? mediaUrl(path);
            return (
              <li
                key={path}
                className='border-line flex items-center gap-2 rounded-lg border px-3 py-2'
              >
                <FileText className='text-ink-2 size-4 shrink-0' />
                <a
                  href={href}
                  target='_blank'
                  rel='noreferrer'
                  className='text-brand min-w-0 flex-1 truncate font-semibold'
                >
                  {name}
                </a>
                {canDelete && (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label={t('drawer.removeFile', { name })}
                    disabled={remove.isPending}
                    onClick={async () => {
                      const ok = await confirm({
                        title: t('drawer.removeFileTitle'),
                        description: name,
                        destructive: true,
                      });
                      if (!ok) return;
                      try {
                        await remove.mutateAsync({ id: o.id, path });
                      } catch {
                        // Toasted globally.
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canEdit && (
        <label className='flex flex-col gap-1.5'>
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
                await add.mutateAsync({ id: o.id, files });
                notify(t('drawer.fileAdded'), 'success');
              } catch {
                // Toasted globally.
              }
            }}
          />
        </label>
      )}
    </Section>
  );
}

function OrderActionsBar({
  order,
  onComplete,
  onCancel,
}: {
  order: ReservationDetails;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation('reservations');
  const lang = useUiLang();
  const actions = useOrderActions(order);
  const change = useChangeOrderStatus();
  const step = nextStep(order.status, actions);
  // A-Z §13.4: both targets stay reachable; the primary button covers one,
  // the "Change status" menu the rest.
  const otherTargets = actions.changeStatus
    ? statusTargets(order.status).filter(
        (s) => step === 'complete' || !step || s !== STEP_STATUS[step],
      )
    : [];

  const setStatus = async (status: OrderStatus) => {
    try {
      await change.mutateAsync({ id: order.id, status });
      notify(t('actions.statusChanged'), 'success');
    } catch {
      // Toasted globally.
    }
  };

  const runStep = async () => {
    if (!step) return;
    if (step === 'complete') return onComplete();
    await setStatus(STEP_STATUS[step]);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        orderQrLink(order.id, langIdOf(lang)),
      );
      notify(t('actions.copied'), 'success');
    } catch {
      notify(t('common.error'), 'error');
    }
  };

  return (
    <div className='border-line flex flex-wrap items-center gap-2 border-t px-6 py-4'>
      <Button variant='ghost' onClick={() => void copyLink()}>
        <Copy />
        {t('actions.copyLink')}
      </Button>
      <div className='flex-1' />
      {otherTargets.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='outline' disabled={change.isPending}>
              {t('actions.changeStatus')}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            {otherTargets.map((s) => (
              <DropdownMenuItem key={s} onSelect={() => void setStatus(s)}>
                {t(`reservationStatus.${statusKeyOf(s)}`, { ns: 'shell' })}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {actions.cancel && (
        <Button variant='outline' className='text-down' onClick={onCancel}>
          <Ban />
          {t('actions.cancel')}
        </Button>
      )}
      {step && (
        <Button onClick={() => void runStep()} disabled={change.isPending}>
          {t(
            step === 'checkIn'
              ? 'actions.checkIn'
              : step === 'start'
                ? 'actions.start'
                : 'actions.complete',
          )}
        </Button>
      )}
    </div>
  );
}
