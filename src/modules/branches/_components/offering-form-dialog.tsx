import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  fetchServiceGroupServiceIds,
  priceFor,
  serviceGroupsQuery,
  servicesQuery,
  vaccinesQuery,
  type Option,
  type PricedOption,
} from '@/shared/api/lookups';
import { EntityFormDialog } from '@/shared/components/layout/entity-form-dialog';
import {
  CheckboxGroupField,
  DateMultipleField,
  FormFooter,
  RadioField,
  SelectField,
  TextField,
} from '@/shared/components/layout/form';
import { Form } from '@/shared/components/ui/form';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { WEEK_DAYS } from '@/shared/api/enums';
import { notify } from '@/shared/lib/notify';
import { utcTimeToLocal } from '@/shared/lib/utc-time';
import {
  useServicePermission,
  useSpPermissionCheck,
} from '@/shared/permissions';
import {
  slotsQuery,
  useSaveBranchService,
  useSaveBranchVaccine,
} from '@/modules/branches/api/branches';
import {
  branchServiceName,
  branchVaccineName,
  type Branch,
  type BranchService,
  type BranchVaccine,
  type Slot,
} from '@/modules/branches/api/types';
import {
  branchServiceCreatePayload,
  branchServiceUpdatePayload,
  EMPTY_OFFERING,
  offDateKeys,
  offeringFormSchema,
  serviceFormDefaults,
  vaccineCreatePayload,
  vaccineFormDefaults,
  vaccineUpdatePayload,
  type OfferingFormInput,
  type OfferingFormValues,
  type OfferingKind,
} from '@/modules/branches/lib/offering-form';

/** What the dialog edits; `null` with `open` = add. */
export type OfferingTarget =
  | { kind: 'service'; item: BranchService }
  | { kind: 'vaccine'; item: BranchVaccine };

export function OfferingFormDialog({
  branch,
  target,
  open,
  onClose,
}: {
  branch: Branch;
  target: OfferingTarget | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('branches');
  const title = !target
    ? t('offerings.addTitle')
    : t('offerings.editTitle', {
        name:
          target.kind === 'service'
            ? branchServiceName(target.item)
            : branchVaccineName(target.item),
      });
  return (
    <EntityFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={title}
    >
      {open && (
        <OfferingForm
          key={target ? `${target.kind}-${target.item.id}` : 'new'}
          branch={branch}
          target={target}
          onDone={onClose}
        />
      )}
    </EntityFormDialog>
  );
}

const toOptions = (list: Option[] | undefined) =>
  (list ?? []).map((o) => ({ value: String(o.id), label: o.name }));

/** The branch's slot times per weekday, week order, times in local time. */
function slotTimeGroups(slots: readonly Slot[]) {
  return WEEK_DAYS.map((day) => ({
    day,
    options: slots
      .filter((s) => s.day === day)
      .flatMap((s) => s.slotTimes ?? [])
      .map((time) => ({
        from: utcTimeToLocal(time.from),
        to: utcTimeToLocal(time.to),
        value: String(time.id),
      }))
      .sort((a, b) => a.from.localeCompare(b.from))
      .map(({ from, to, value }) => ({
        value,
        label: (
          <span dir='ltr' className='num'>
            {from}–{to}
          </span>
        ),
      })),
  })).filter((g) => g.options.length > 0);
}

function OfferingForm({
  branch,
  target,
  onDone,
}: {
  branch: Branch;
  target: OfferingTarget | null;
  onDone: () => void;
}) {
  const { t } = useTranslation('branches');
  const can = useSpPermissionCheck();
  const canViewVaccineCatalogue = useServicePermission('view:vaccine');
  const isEdit = target !== null;
  // Linking slot times while adding a vaccine (§11.3) needs the same right as
  // linking them from the schedule; without it the add flow sends none.
  const canLinkSlots =
    !isEdit && can('update:service-provider-branch-vaccine-slots');
  const [today] = useState(() => new Date());
  const editedService = target?.kind === 'service' ? target.item : undefined;
  const editedVaccine = target?.kind === 'vaccine' ? target.item : undefined;

  // Only the types this user may create. Adding a vaccine also lists the
  // vaccine catalogue, which needs the Service-area `view:vaccine`.
  const allowedKinds: OfferingKind[] = [
    ...(can('create:branch-services') ? (['service', 'group'] as const) : []),
    ...(can('create:branch-vaccines') && canViewVaccineCatalogue
      ? (['vaccine'] as const)
      : []),
  ];
  const kindOptions = allowedKinds.map((kind) => ({
    value: kind,
    label: t(`offerings.types.${kind}`),
  }));

  const schema = useMemo(
    () =>
      offeringFormSchema(t, editedService ? offDateKeys(editedService) : null),
    [t, editedService],
  );
  const form = useForm<OfferingFormInput, unknown, OfferingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: editedService
      ? serviceFormDefaults(editedService)
      : editedVaccine
        ? vaccineFormDefaults(editedVaccine)
        : { ...EMPTY_OFFERING, kind: allowedKinds[0] ?? 'service' },
  });

  // Changing the type clears every value that belonged to the old type, so
  // stale selections are never sent (§10.4).
  useEffect(
    () =>
      form.subscribe({
        name: 'kind',
        formState: { values: true },
        exact: true,
        callback: () => {
          for (const field of [
            'itemId',
            'cost',
            'b2cPrice',
            'b2bPrice',
          ] as const) {
            form.setValue(field, '');
          }
          form.setValue('offDates', []);
          form.setValue('slotTimeIds', []);
          form.clearErrors();
        },
      }),
    [form],
  );

  const kind = useWatch({ control: form.control, name: 'kind' });
  const offDates = useWatch({ control: form.control, name: 'offDates' });
  const services = useQuery({
    ...servicesQuery(),
    enabled: kind === 'service',
  });
  const groups = useQuery({
    ...serviceGroupsQuery(),
    enabled: kind === 'group',
  });
  const vaccines = useQuery({
    ...vaccinesQuery(branch.cityId),
    enabled: kind === 'vaccine',
  });
  const slots = useQuery({
    ...slotsQuery(branch.id),
    enabled: kind === 'vaccine' && canLinkSlots,
  });
  const slotGroups = useMemo(
    () => slotTimeGroups(slots.data ?? []),
    [slots.data],
  );
  const saveService = useSaveBranchService(branch.id);
  const saveVaccine = useSaveBranchVaccine(branch.id);

  const priced: PricedOption[] | undefined =
    kind === 'service'
      ? services.data
      : kind === 'group'
        ? groups.data
        : undefined;
  const itemOptions = toOptions(kind === 'vaccine' ? vaccines.data : priced);
  // Editing keeps the original item even if the catalogue no longer lists it.
  if (
    isEdit &&
    !itemOptions.some((o) => o.value === form.getValues('itemId'))
  ) {
    itemOptions.push({
      value: form.getValues('itemId'),
      label: editedService
        ? branchServiceName(editedService)
        : editedVaccine
          ? branchVaccineName(editedVaccine)
          : '',
    });
  }

  /** Cost and customer price default to the catalogue price (§10.4). */
  const prefillPrice = (itemId: string) => {
    const option = priced?.find((o) => String(o.id) === itemId);
    if (!option) return;
    const price = String(
      priceFor(option.pricing, branch.serviceProviderClassificationId),
    );
    form.setValue('cost', price);
    form.setValue('b2cPrice', price);
  };

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      if (editedVaccine) {
        await saveVaccine.mutateAsync({
          id: editedVaccine.id,
          body: vaccineUpdatePayload(v, editedVaccine),
        });
      } else if (editedService) {
        await saveService.mutateAsync({
          id: editedService.id,
          body: branchServiceUpdatePayload(v, editedService),
        });
      } else if (v.kind === 'vaccine') {
        await saveVaccine.mutateAsync({
          body: vaccineCreatePayload(
            v,
            branch.id,
            canLinkSlots ? v.slotTimeIds.map(Number) : [],
          ),
        });
      } else {
        const groupServiceIds =
          v.kind === 'group'
            ? await fetchServiceGroupServiceIds(Number(v.itemId))
            : [];
        await saveService.mutateAsync({
          body: branchServiceCreatePayload(v, branch.id, groupServiceIds),
        });
      }
      notify(
        isEdit ? t('offerings.updated') : t('offerings.created'),
        'success',
      );
      onDone();
    } catch {
      // Toasted by the global mutation handler.
    }
  });

  const itemLabel =
    kind === 'vaccine'
      ? t('offerings.vaccine')
      : kind === 'group'
        ? t('offerings.group')
        : t('offerings.service');

  return (
    <Form {...form}>
      <form
        onSubmit={onSubmit}
        className='flex flex-col gap-4.5 py-2'
        noValidate
      >
        {!isEdit && (
          <RadioField
            name='kind'
            label={t('offerings.kind')}
            options={kindOptions}
            variant='segmented'
            orientation='horizontal'
          />
        )}

        <SelectField
          name='itemId'
          label={itemLabel}
          placeholder={t('form.select')}
          options={itemOptions}
          disabled={isEdit}
          onValueChange={prefillPrice}
          description={
            kind === 'vaccine'
              ? vaccines.data?.length === 0
                ? t('offerings.noVaccines')
                : t('offerings.vaccineHint', { city: branch.cityName })
              : isEdit
                ? undefined
                : t('offerings.defaultPrice')
          }
          required
        />

        <div className='grid gap-4 sm:grid-cols-2'>
          <TextField
            name='cost'
            label={t('offerings.cost')}
            description={t('offerings.costHint')}
            inputMode='decimal'
            dir='ltr'
            className='num'
            required
          />
          <TextField
            name='b2cPrice'
            label={t('offerings.b2cPrice')}
            inputMode='decimal'
            dir='ltr'
            className='num'
            required
          />
          {kind === 'vaccine' ? (
            <TextField
              name='b2bPrice'
              label={t('offerings.b2bPrice')}
              inputMode='decimal'
              dir='ltr'
              className='num'
              required
            />
          ) : (
            <TextField
              name='b2cDiscount'
              label={t('offerings.b2cDiscount')}
              inputMode='decimal'
              dir='ltr'
              className='num'
              required
            />
          )}
        </div>

        {kind !== 'vaccine' && (
          <>
            <DateMultipleField
              name='offDates'
              label={t('offerings.offDates')}
              placeholder={t('offerings.offDatesHint')}
              description={t('offerings.offDatesHint')}
              minDate={today}
            />
            {(offDates.length > 0 ||
              (editedService && offDateKeys(editedService).length > 0)) && (
              <TextField
                name='reason'
                as='textarea'
                label={t('offerings.reason')}
              />
            )}
          </>
        )}

        {kind === 'vaccine' &&
          !isEdit &&
          (!canLinkSlots || slots.isError ? (
            <p className='text-ink-2 text-small'>{t('offerings.linkLater')}</p>
          ) : slots.isPending ? (
            <div className='flex flex-col gap-2.5'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-48' />
              <Skeleton className='h-4 w-40' />
            </div>
          ) : slotGroups.length === 0 ? (
            <p className='text-ink-2 text-small'>
              {t('offerings.noSlotTimes')}
            </p>
          ) : (
            <fieldset className='flex flex-col gap-3'>
              <legend className='text-ink mb-1 font-bold'>
                {t('offerings.slotTimes')}
              </legend>
              <p className='text-ink-2 text-small'>
                {t('offerings.slotTimesHint')}
              </p>
              {slotGroups.map((g) => (
                <CheckboxGroupField
                  key={g.day}
                  name='slotTimeIds'
                  label={t(`days.${g.day}`)}
                  options={g.options}
                  orientation='horizontal'
                />
              ))}
            </fieldset>
          ))}

        <FormFooter
          isPending={form.formState.isSubmitting}
          saveLabel={t('actions.save')}
          savingLabel={t('actions.saving')}
          cancelLabel={t('actions.cancel')}
          onCancel={onDone}
        />
      </form>
    </Form>
  );
}
