import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Undo2 } from 'lucide-react';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import { FieldsSkeleton } from '@/shared/components/skeletons';
import { StatusBadge } from '@/shared/components/status-badge';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Spinner } from '@/shared/components/ui/spinner';
import { formatMoney } from '@/shared/lib/format';
import { notify } from '@/shared/lib/notify';
import { cn } from '@/shared/lib/utils';
import {
  allowedVaccinesQuery,
  orderVaccinesError,
  orderVaccinesPayload,
  useUpdateOrderVaccines,
  vaccineSlotTimesQuery,
  type AllowedVaccines,
  type NewVaccineRow,
} from '@/modules/reservations/api/order-vaccines';
import type { ReservationDetails } from '@/modules/reservations/api/types';
import { useOrderActions } from '@/modules/reservations/lib/use-order-actions';

/** `08:00:00` → `08:00`. */
const hhmm = (time?: string | null) => (time ? time.slice(0, 5) : '');

/** A new row with a stable React key. */
interface DraftRow extends NewVaccineRow {
  key: number;
}

/**
 * Edit the vaccines on a reservation (`?dialog=vaccines`): mark existing
 * ones for removal, add new ones with a slot time (missing items §5).
 */
export function OrderVaccinesDialog({
  order,
  open,
  onClose,
}: {
  order: ReservationDetails;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('reservations');
  const actions = useOrderActions(order);
  const allowed = open && actions.updateVaccines && actions.viewVaccines;
  return (
    <EntityFormDialog
      open={allowed}
      onOpenChange={(o) => !o && onClose()}
      title={t('vaccines.title', { id: order.id })}
      contentClassName='lg:max-w-2xl'
    >
      {allowed && <VaccinesForm order={order} onDone={onClose} />}
    </EntityFormDialog>
  );
}

function VaccinesForm({
  order,
  onDone,
}: {
  order: ReservationDetails;
  onDone: () => void;
}) {
  const { t } = useTranslation('reservations');
  const options = useQuery(allowedVaccinesQuery(order.id));
  const update = useUpdateOrderVaccines();
  const [removedIds, setRemovedIds] = useState<number[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [nextKey, setNextKey] = useState(1);

  const edit = { removedIds, added: rows };
  const error = orderVaccinesError(order, edit);
  const existing = order.reservationVaccines ?? [];

  const toggleRemoved = (id: number) =>
    setRemovedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  const patchRow = (key: number, patch: Partial<NewVaccineRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = () => {
    setRows((rs) => [
      ...rs,
      { key: nextKey, vaccineId: null, slotTimeId: null },
    ]);
    setNextKey((k) => k + 1);
  };

  const submit = async () => {
    if (error) return;
    if (!orderVaccinesPayload(order.id, edit)) {
      notify(t('vaccines.noChanges'), 'info');
      return onDone();
    }
    try {
      await update.mutateAsync({ reservationId: order.id, edit });
      notify(t('vaccines.saved'), 'success');
      onDone();
    } catch {
      // Toasted globally.
    }
  };

  return (
    <div className='flex flex-col gap-5 py-2'>
      <section className='flex flex-col gap-2'>
        <h3 className='text-ink-2 text-sm font-bold'>
          {t('vaccines.current')}
        </h3>
        {existing.length === 0 ? (
          <p className='text-ink-3'>{t('vaccines.none')}</p>
        ) : (
          <ul className='flex flex-col gap-1.5'>
            {existing.map((v) => {
              const removed = removedIds.includes(v.id);
              const name = v.vaccineName ?? `#${v.vaccineId}`;
              return (
                <li
                  key={v.id}
                  className={cn(
                    'border-line flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
                    removed && 'bg-sunken',
                  )}
                >
                  <span
                    className={cn(
                      'min-w-0 flex-1 font-semibold',
                      removed && 'text-ink-3 line-through',
                    )}
                  >
                    {name}
                    {v.from && (
                      <span className='num text-ink-3 ms-2 font-normal'>
                        {hhmm(v.from)}–{hhmm(v.to)}
                      </span>
                    )}
                  </span>
                  {removed && (
                    <StatusBadge
                      variant='down'
                      label={t('vaccines.willRemove')}
                    />
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleRemoved(v.id)}
                    aria-label={t(
                      removed ? 'vaccines.undoRemoveOf' : 'vaccines.removeOf',
                      { name },
                    )}
                  >
                    {removed ? <Undo2 /> : <Trash2 />}
                    {t(removed ? 'vaccines.undo' : 'vaccines.remove')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className='flex flex-col gap-2'>
        <h3 className='text-ink-2 text-sm font-bold'>{t('vaccines.add')}</h3>
        {options.isPending ? (
          <FieldsSkeleton count={2} />
        ) : options.isError ? (
          <p role='alert' className='text-down text-small'>
            {t('vaccines.optionsError')}
          </p>
        ) : (
          <>
            {rows.length > 0 && (
              <ul className='flex flex-col gap-2'>
                {rows.map((row, i) => (
                  <NewRow
                    key={row.key}
                    index={i}
                    row={row}
                    branchId={order.serviceProviderBranchId}
                    vaccines={options.data?.vaccines ?? []}
                    onChange={(patch) => patchRow(row.key, patch)}
                    onRemove={() =>
                      setRows((rs) => rs.filter((r) => r.key !== row.key))
                    }
                  />
                ))}
              </ul>
            )}
            {(options.data?.vaccines.length ?? 0) === 0 ? (
              <p className='text-ink-3'>{t('vaccines.noOptions')}</p>
            ) : (
              <Button variant='outline' className='w-fit' onClick={addRow}>
                <Plus />
                {t('vaccines.addRow')}
              </Button>
            )}
            {rows.some(
              (r) => r.vaccineId === null || r.slotTimeId === null,
            ) && (
              <p className='text-ink-3 text-small'>
                {t('vaccines.incompleteHint')}
              </p>
            )}
          </>
        )}
      </section>

      {error === 'lastItem' && (
        <p role='alert' className='text-down text-small'>
          {t('vaccines.lastItem')}
        </p>
      )}

      <div className='border-line flex justify-end gap-2.5 border-t pt-4'>
        <Button
          variant='secondary'
          onClick={onDone}
          disabled={update.isPending}
        >
          {t('vaccines.discard')}
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={update.isPending || error !== null}
        >
          {update.isPending && <Spinner />}
          {t('vaccines.save')}
        </Button>
      </div>
    </div>
  );
}

function NewRow({
  index,
  row,
  branchId,
  vaccines,
  onChange,
  onRemove,
}: {
  index: number;
  row: NewVaccineRow;
  branchId: number;
  vaccines: AllowedVaccines['vaccines'];
  onChange: (patch: Partial<NewVaccineRow>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('reservations');
  const slots = useQuery(vaccineSlotTimesQuery(branchId, row.vaccineId));
  const n = index + 1;

  return (
    <li className='border-line flex flex-wrap items-center gap-2 rounded-lg border p-2'>
      <Select
        value={row.vaccineId === null ? '' : String(row.vaccineId)}
        // A new vaccine means new slot times: clear the old choice.
        onValueChange={(v) =>
          onChange({ vaccineId: Number(v), slotTimeId: null })
        }
      >
        <SelectTrigger
          className='min-w-48 flex-1'
          aria-label={t('vaccines.vaccineOf', { n })}
        >
          <SelectValue placeholder={t('vaccines.pickVaccine')} />
        </SelectTrigger>
        <SelectContent>
          {vaccines.map((v) => (
            <SelectItem key={v.id} value={String(v.id)}>
              {v.name}{' '}
              <span className='num text-ink-3'>
                · {formatMoney(v.price)} {t('sar')}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={row.slotTimeId === null ? '' : String(row.slotTimeId)}
        onValueChange={(v) => onChange({ slotTimeId: Number(v) })}
        disabled={row.vaccineId === null || slots.isPending}
      >
        <SelectTrigger
          className='min-w-40'
          aria-label={t('vaccines.slotOf', { n })}
        >
          <SelectValue
            placeholder={
              row.vaccineId !== null && slots.isPending
                ? t('vaccines.loadingSlots')
                : t('vaccines.pickSlot')
            }
          />
        </SelectTrigger>
        <SelectContent>
          {(slots.data ?? []).length === 0 ? (
            <SelectItem value='none' disabled>
              {t('vaccines.noSlots')}
            </SelectItem>
          ) : (
            slots.data?.map((s) => (
              <SelectItem key={s.value} value={String(s.value)}>
                <span className='num'>
                  {hhmm(s.from)}–{hhmm(s.to)}
                </span>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      <Button
        variant='ghost'
        size='icon-sm'
        aria-label={t('vaccines.removeRow', { n })}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
