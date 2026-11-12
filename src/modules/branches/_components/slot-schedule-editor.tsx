import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clock, Plus, Trash2 } from 'lucide-react';
import { WEEK_DAYS, type WeekDay } from '@/shared/api/enums';
import { ListError } from '@/shared/components/list-error';
import { IconTile, Panel, PanelHeader } from '@/shared/components/pulse';
import { CardListSkeleton } from '@/shared/components/skeletons';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { hasFlag } from '@/shared/lib/bit-flags';
import { confirm } from '@/shared/lib/confirm-controller';
import { notify } from '@/shared/lib/notify';
import { cn } from '@/shared/lib/utils';
import { useSpPermissionCheck } from '@/shared/permissions';
import {
  branchServicesQuery,
  branchVaccinesQuery,
  slotsQuery,
  useDeleteSlotTime,
  useSaveSchedule,
} from '@/modules/branches/api/branches';
import {
  branchServiceName,
  branchVaccineName,
  type Branch,
} from '@/modules/branches/api/types';
import {
  buildSchedule,
  emptyTime,
  validateSchedule,
  type EditorDay,
  type EditorTime,
  type ScheduleError,
  type ScheduleOrigin,
} from '@/modules/branches/lib/slot-schedule';

interface ItemOption {
  id: number;
  name: string;
}

/** The weekly slot schedule of one branch (doc §9). */
export function SlotScheduleEditor({ branch }: { branch: Branch }) {
  const { t } = useTranslation('branches');
  const can = useSpPermissionCheck();
  const showVaccines = can('view:service-provider-branch-vaccine-slots');
  const slots = useQuery(slotsQuery(branch.id));
  const services = useQuery(branchServicesQuery(branch.id));
  const vaccines = useQuery(branchVaccinesQuery(branch.id, showVaccines));
  // Bumped after a save / discard: rebuilds the editor from fresh data.
  const [version, setVersion] = useState(0);

  const loading =
    slots.isPending ||
    services.isPending ||
    (showVaccines && vaccines.isPending);
  const error = slots.error ?? services.error ?? vaccines.error;

  return (
    <Panel className='animate-enter overflow-hidden'>
      <PanelHeader
        icon={
          <IconTile>
            <Clock />
          </IconTile>
        }
        title={t('slots.title')}
        description={t('slots.description')}
      />
      {error ? (
        <div className='p-5'>
          <ListError
            error={error}
            onRetry={() => {
              void slots.refetch();
              void services.refetch();
              if (showVaccines) void vaccines.refetch();
            }}
          />
        </div>
      ) : loading ? (
        <div className='px-5 pb-5'>
          <CardListSkeleton count={5} itemClassName='h-24' />
        </div>
      ) : (
        <ScheduleForm
          key={version}
          branch={branch}
          {...buildSchedule(
            slots.data ?? [],
            branch.serviceProviderClosingDay,
            showVaccines ? (vaccines.data ?? []) : [],
          )}
          serviceOptions={(services.data ?? []).map((s) => ({
            id: s.id,
            name: branchServiceName(s),
          }))}
          vaccineOptions={
            showVaccines
              ? (vaccines.data ?? []).map((v) => ({
                  id: v.id,
                  name: branchVaccineName(v),
                }))
              : null
          }
          canEditVaccines={can('update:service-provider-branch-vaccine-slots')}
          onReset={() => setVersion((v) => v + 1)}
        />
      )}
    </Panel>
  );
}

function ScheduleForm({
  branch,
  days: initialDays,
  origin,
  serviceOptions,
  vaccineOptions,
  canEditVaccines,
  onReset,
}: {
  branch: Branch;
  days: EditorDay[];
  origin: ScheduleOrigin;
  serviceOptions: ItemOption[];
  /** `null` = vaccine links are not shown at all. */
  vaccineOptions: ItemOption[] | null;
  canEditVaccines: boolean;
  onReset: () => void;
}) {
  const { t } = useTranslation('branches');
  const [days, setDays] = useState(initialDays);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDays));
  const [showErrors, setShowErrors] = useState(false);
  const save = useSaveSchedule(branch.id);
  const deleteTime = useDeleteSlotTime(branch.id);

  const errors = validateSchedule(days);
  const dirty = JSON.stringify(days) !== baseline;

  const patchDay = (day: WeekDay, patch: (d: EditorDay) => EditorDay) =>
    setDays((all) => all.map((d) => (d.day === day ? patch(d) : d)));
  const patchTime = (day: WeekDay, key: string, patch: Partial<EditorTime>) =>
    patchDay(day, (d) => ({
      ...d,
      times: d.times.map((x) => (x.key === key ? { ...x, ...patch } : x)),
    }));
  /** Applies a server-side delete to both the editor and the dirty baseline. */
  const applySaved = (update: (all: EditorDay[]) => EditorDay[]) => {
    setDays(update);
    setBaseline((b) => JSON.stringify(update(JSON.parse(b) as EditorDay[])));
  };

  const removeTime = async (day: WeekDay, time: EditorTime) => {
    const drop = (all: EditorDay[]) =>
      all.map((d) =>
        d.day === day
          ? { ...d, times: d.times.filter((x) => x.key !== time.key) }
          : d,
      );
    // Unsaved: local only. Saved: deleted on the server right away (§9.6).
    if (!time.id) return setDays(drop);
    const ok = await confirm({
      title: t('slots.deleteTimeTitle'),
      description: t('slots.deleteTimeDesc'),
      confirmText: t('actions.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTime.mutateAsync(time.id);
      applySaved(drop);
      notify(t('common.deleted'), 'success');
    } catch {
      // Toasted globally.
    }
  };

  const onSave = async () => {
    if (errors.length) {
      setShowErrors(true);
      notify(t('slots.invalid'), 'error');
      return;
    }
    try {
      const { unresolved } = await save.mutateAsync({
        days,
        origin,
        linkVaccines: vaccineOptions !== null && canEditVaccines,
      });
      notify(t('slots.saved'), 'success');
      if (unresolved) {
        notify(t('slots.unresolved', { count: unresolved }), 'warning');
      }
      onReset();
    } catch {
      // Toasted globally.
    }
  };

  const closedDays = WEEK_DAYS.filter((d) =>
    hasFlag(branch.serviceProviderClosingDay, d),
  );

  return (
    <div className='flex flex-col'>
      {WEEK_DAYS.map((weekday) => {
        const d = days.find((x) => x.day === weekday);
        if (!d) {
          return closedDays.includes(weekday) ? (
            <div
              key={weekday}
              className='border-line flex flex-wrap items-center gap-4 border-t px-5 py-4'
            >
              <span className='w-24 font-bold'>{t(`days.${weekday}`)}</span>
              <span className='text-ink-2 text-small'>
                {t('slots.providerClosed')}
              </span>
            </div>
          ) : null;
        }
        return (
          <DayRow
            key={weekday}
            d={d}
            errors={showErrors ? errors.filter((e) => e.day === weekday) : []}
            serviceOptions={serviceOptions}
            vaccineOptions={vaccineOptions}
            canEditVaccines={canEditVaccines}
            busy={save.isPending}
            onPatch={(patch) => patchDay(weekday, patch)}
            onPatchTime={(key, patch) => patchTime(weekday, key, patch)}
            onRemoveTime={(time) => void removeTime(weekday, time)}
          />
        );
      })}

      {dirty && (
        <div
          role='region'
          aria-label={t('slots.unsaved')}
          className='bg-ink text-surface sticky bottom-4 m-4 flex flex-wrap items-center gap-3 rounded-full py-2 ps-6 pe-2'
        >
          <span className='flex-1 font-bold'>{t('slots.unsaved')}</span>
          <Button
            variant='ghost'
            className='text-surface hover:bg-surface/10 hover:text-surface'
            disabled={save.isPending}
            onClick={() => {
              setDays(JSON.parse(baseline) as EditorDay[]);
              setShowErrors(false);
            }}
          >
            {t('slots.discard')}
          </Button>
          <Button
            className='bg-surface text-ink hover:bg-surface/90'
            disabled={save.isPending}
            onClick={() => void onSave()}
          >
            {save.isPending && <Spinner />}
            {save.isPending ? t('slots.saving') : t('slots.save')}
          </Button>
        </div>
      )}
    </div>
  );
}

const ERROR_KEY: Record<ScheduleError['field'], string> = {
  capacity: 'slots.errors.capacity',
  noTimes: 'slots.errors.noTimes',
  from: 'slots.errors.from',
  to: 'slots.errors.to',
  order: 'slots.errors.order',
};

function DayRow({
  d,
  errors,
  serviceOptions,
  vaccineOptions,
  canEditVaccines,
  busy,
  onPatch,
  onPatchTime,
  onRemoveTime,
}: {
  d: EditorDay;
  errors: ScheduleError[];
  serviceOptions: ItemOption[];
  vaccineOptions: ItemOption[] | null;
  canEditVaccines: boolean;
  busy: boolean;
  onPatch: (patch: (d: EditorDay) => EditorDay) => void;
  onPatchTime: (key: string, patch: Partial<EditorTime>) => void;
  onRemoveTime: (time: EditorTime) => void;
}) {
  const { t } = useTranslation('branches');
  const dayName = t(`days.${d.day}`);
  const dayErrors = errors.filter((e) => !('time' in e));
  const capacityId = `cap-${d.day}`;

  return (
    <section
      aria-label={dayName}
      className={cn(
        'border-line flex flex-col gap-3 border-t px-5 py-4',
        errors.length > 0 && 'bg-down-soft/40',
      )}
    >
      <div className='flex flex-wrap items-center gap-x-5 gap-y-3'>
        <h3 className='w-24 font-bold'>{dayName}</h3>
        <div className='flex items-center gap-2'>
          <Label htmlFor={capacityId} className='text-ink-2 font-medium'>
            {t('slots.capacity')}
          </Label>
          <Input
            id={capacityId}
            type='number'
            min={1}
            inputMode='numeric'
            dir='ltr'
            className='num w-24'
            value={d.maxOccupancyPerDay}
            disabled={busy}
            onChange={(e) =>
              onPatch((x) => ({ ...x, maxOccupancyPerDay: e.target.value }))
            }
          />
        </div>
      </div>

      {dayErrors.map((e) => (
        <p key={e.field} role='alert' className='text-down text-small'>
          {t(ERROR_KEY[e.field])}
        </p>
      ))}
      {d.times.map((time) => (
        <TimeRow
          key={time.key}
          time={time}
          errors={errors.filter((e) => 'time' in e && e.time === time.key)}
          serviceOptions={serviceOptions}
          vaccineOptions={vaccineOptions}
          canEditVaccines={canEditVaccines}
          busy={busy}
          onPatch={(patch) => onPatchTime(time.key, patch)}
          onRemove={() => onRemoveTime(time)}
        />
      ))}
      <Button
        variant='outline'
        size='sm'
        className='self-start border-dashed'
        disabled={busy}
        onClick={() =>
          onPatch((x) => ({ ...x, times: [...x.times, emptyTime()] }))
        }
      >
        <Plus />
        {t('slots.addTime')}
      </Button>
    </section>
  );
}

function TimeRow({
  time,
  errors,
  serviceOptions,
  vaccineOptions,
  canEditVaccines,
  busy,
  onPatch,
  onRemove,
}: {
  time: EditorTime;
  errors: ScheduleError[];
  serviceOptions: ItemOption[];
  vaccineOptions: ItemOption[] | null;
  canEditVaccines: boolean;
  busy: boolean;
  onPatch: (patch: Partial<EditorTime>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('branches');
  const hasError = (field: string) => errors.some((e) => e.field === field);
  const toggle = (list: number[], id: number, on: boolean) =>
    on ? [...list, id] : list.filter((x) => x !== id);

  return (
    <div className='bg-raised border-line flex flex-col gap-3 rounded-xl border p-4'>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor={`${time.key}-from`} className='text-ink-2 text-xs'>
            {t('slots.from')}
          </Label>
          <Input
            id={`${time.key}-from`}
            type='time'
            dir='ltr'
            className='num w-32'
            value={time.from}
            disabled={busy}
            aria-invalid={hasError('from') || hasError('order')}
            onChange={(e) => onPatch({ from: e.target.value })}
          />
        </div>
        <div className='flex flex-col gap-1.5'>
          <Label htmlFor={`${time.key}-to`} className='text-ink-2 text-xs'>
            {t('slots.to')}
          </Label>
          <Input
            id={`${time.key}-to`}
            type='time'
            dir='ltr'
            className='num w-32'
            value={time.to}
            disabled={busy}
            aria-invalid={hasError('to') || hasError('order')}
            onChange={(e) => onPatch({ to: e.target.value })}
          />
        </div>
        <div className='flex-1' />
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('slots.removeTime')}
          className='text-ink-3 hover:text-down'
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      {errors.map((e) => (
        <p key={e.field} role='alert' className='text-down text-small'>
          {t(ERROR_KEY[e.field])}
        </p>
      ))}

      <ChoiceGroup
        label={t('slots.services')}
        empty={t('slots.noServices')}
        options={serviceOptions}
        selected={time.serviceIds}
        disabled={busy}
        idPrefix={`${time.key}-s`}
        onToggle={(id, on) =>
          onPatch({ serviceIds: toggle(time.serviceIds, id, on) })
        }
      />
      {vaccineOptions && (
        <ChoiceGroup
          label={t('slots.vaccines')}
          empty={t('slots.noVaccines')}
          options={vaccineOptions}
          selected={time.vaccineIds}
          disabled={busy || !canEditVaccines}
          idPrefix={`${time.key}-v`}
          onToggle={(id, on) =>
            onPatch({ vaccineIds: toggle(time.vaccineIds, id, on) })
          }
        />
      )}
    </div>
  );
}

function ChoiceGroup({
  label,
  empty,
  options,
  selected,
  disabled,
  idPrefix,
  onToggle,
}: {
  label: string;
  empty: string;
  options: ItemOption[];
  selected: number[];
  disabled: boolean;
  idPrefix: string;
  onToggle: (id: number, on: boolean) => void;
}) {
  return (
    <fieldset className='flex flex-col gap-2'>
      <legend className='text-ink-2 mb-1 text-xs font-bold'>{label}</legend>
      {options.length === 0 ? (
        <p className='text-ink-3 text-small'>{empty}</p>
      ) : (
        <div className='flex flex-wrap gap-x-5 gap-y-2'>
          {options.map((o) => {
            const id = `${idPrefix}-${o.id}`;
            return (
              <div key={o.id} className='flex items-center gap-2'>
                <Checkbox
                  id={id}
                  checked={selected.includes(o.id)}
                  disabled={disabled}
                  onCheckedChange={(on) => onToggle(o.id, on === true)}
                />
                <Label htmlFor={id} className='font-medium'>
                  {o.name}
                </Label>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}
