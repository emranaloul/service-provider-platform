import { useId, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal } from 'lucide-react';
import type {
  OrderStatus,
  RequestChannel,
  RequestFunding,
} from '@/shared/api/enums';
import { citiesQuery } from '@/shared/api/lookups';
import {
  DateRangeFilter,
  type DateRange,
} from '@/shared/components/date-range-filter';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { statusKeyOf } from '@/shared/lib/reservation-status';
import { useCurrentUser } from '@/shared/session/current-user';
import { branchListQuery } from '@/modules/branches/api/branches';
import {
  CHANNELS,
  digitsOnly,
  excludedStatuses,
  FUNDINGS,
  ORDER_STATUSES,
  parseChannel,
  parseFunding,
} from '@/modules/reservations/lib/order-filters';
import {
  CHANNEL_KEY,
  FUNDING_KEY,
} from '@/modules/reservations/lib/order-labels';
import {
  FIT_FILTERS,
  type FitFilter,
} from '@/modules/reservations/lib/order-views';

/** Branch picker for the reservations filters (doc §13.2). */
export function BranchFilter({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const { t } = useTranslation('reservations');
  const { serviceProviderId } = useCurrentUser();
  const branches = useQuery(
    branchListQuery({
      pageNumber: 1,
      pageSize: 1000,
      serviceProviderId: serviceProviderId ?? undefined,
    }),
  );
  const list = branches.data?.data ?? [];

  return (
    <Select
      value={value === undefined ? 'all' : String(value)}
      onValueChange={(v) => onChange(v === 'all' ? undefined : Number(v))}
    >
      <SelectTrigger className='min-w-40' aria-label={t('filters.branch')}>
        <SelectValue placeholder={t('filters.branch')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>{t('filters.allBranches')}</SelectItem>
        {/* Keep the chosen branch selectable while the list loads. */}
        {value !== undefined && !list.some((b) => b.id === value) && (
          <SelectItem value={String(value)}>#{value}</SelectItem>
        )}
        {list.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {`${b.firstName} ${b.lastName ?? ''}`.trim()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Result filter: all / fit / unfit. */
export function FitFilterSelect({
  value,
  onChange,
}: {
  value: FitFilter;
  onChange: (value: FitFilter) => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(FIT_FILTERS.find((f) => f === v) ?? 'all')}
    >
      <SelectTrigger className='min-w-36' aria-label={t('filters.fit')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {FIT_FILTERS.map((f) => (
          <SelectItem key={f} value={f}>
            {t(`filters.fitOptions.${f}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Request channel filter (`RequestChannel`). */
export function ChannelFilter({
  value,
  onChange,
}: {
  value: RequestChannel | undefined;
  onChange: (value: RequestChannel | undefined) => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <Select
      value={value === undefined ? 'all' : String(value)}
      onValueChange={(v) => onChange(parseChannel(v))}
    >
      <SelectTrigger className='min-w-36' aria-label={t('filters.channel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>{t('filters.allChannels')}</SelectItem>
        {CHANNELS.map((c) => (
          <SelectItem key={c} value={String(c)}>
            {t(`channel.${CHANNEL_KEY[c]}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Request funding filter (`RequestFunding`); labelled by its field. */
function FundingFilter({
  id,
  value,
  onChange,
}: {
  id: string;
  value: RequestFunding | undefined;
  onChange: (value: RequestFunding | undefined) => void;
}) {
  const { t } = useTranslation('reservations');
  return (
    <Select
      value={value === undefined ? 'all' : String(value)}
      onValueChange={(v) => onChange(parseFunding(v))}
    >
      <SelectTrigger id={id} className='w-full'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>{t('filters.allFunding')}</SelectItem>
        {FUNDINGS.map((f) => (
          <SelectItem key={f} value={String(f)}>
            {t(`funding.${FUNDING_KEY[f]}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Saudi Arabia — the country whose cities the city filter lists. */
const CITY_COUNTRY_ID = 14;

/** City filter, from the Saudi cities lookup; labelled by its field. */
function CityFilter({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  const { t } = useTranslation('reservations');
  const cities = useQuery(citiesQuery(CITY_COUNTRY_ID));
  const list = cities.data ?? [];

  return (
    <Select
      value={value === undefined ? 'all' : String(value)}
      onValueChange={(v) => onChange(v === 'all' ? undefined : Number(v))}
    >
      <SelectTrigger id={id} className='w-full'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value='all'>{t('filters.allCities')}</SelectItem>
        {/* Keep the chosen city selectable while the list loads. */}
        {value !== undefined && !list.some((c) => c.id === value) && (
          <SelectItem value={String(value)}>#{value}</SelectItem>
        )}
        {list.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/** A labelled group for controls that are not one input (`role=group`). */
function Group({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div
      role='group'
      aria-labelledby={`${id}-label`}
      aria-describedby={hint ? `${id}-hint` : undefined}
      className='flex flex-col gap-2'
    >
      <span id={`${id}-label`} className='text-sm leading-none font-medium'>
        {label}
      </span>
      {children}
      {hint && (
        <p id={`${id}-hint`} className='text-ink-3 text-xs'>
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Excluded statuses (`ExcludedStatus`): ticked statuses are left out of the
 * list; the value is the sum of their bits.
 */
function ExcludedStatusFilter({
  id,
  value,
  onToggle,
}: {
  id: string;
  value: number | undefined;
  onToggle: (status: OrderStatus, on: boolean) => void;
}) {
  const { t } = useTranslation('reservations');
  const chosen = excludedStatuses(value);
  return (
    <Group
      id={id}
      label={t('filters.excluded')}
      hint={t('filters.excludedHint')}
    >
      <div className='grid grid-cols-2 gap-x-3 gap-y-2'>
        {ORDER_STATUSES.map((s) => (
          <div key={s} className='flex items-center gap-2'>
            <Checkbox
              id={`${id}-${s}`}
              checked={chosen.includes(s)}
              onCheckedChange={(c) => onToggle(s, c === true)}
            />
            <Label htmlFor={`${id}-${s}`} className='font-normal'>
              {t(`reservationStatus.${statusKeyOf(s)}`, { ns: 'shell' })}
            </Label>
          </div>
        ))}
      </div>
    </Group>
  );
}

/**
 * The less-used filters (funding, ID number, phone, city, date range,
 * excluded statuses) behind one button that shows how many of them are
 * set, plus "Clear filters" for every filter.
 */
export function MoreFilters({
  funding,
  onFundingChange,
  idNumber,
  onIdNumberChange,
  city,
  onCityChange,
  phone,
  onPhoneChange,
  range,
  onRangeChange,
  showRange,
  rangeOverridden,
  excluded,
  onExcludedToggle,
  activeCount,
  canClear,
  onClear,
}: {
  funding: RequestFunding | undefined;
  onFundingChange: (value: RequestFunding | undefined) => void;
  idNumber: string;
  onIdNumberChange: (value: string) => void;
  city: number | undefined;
  onCityChange: (value: number | undefined) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  /** `from` / `to` appointment range (`yyyy-MM-dd` days). */
  range: DateRange | undefined;
  onRangeChange: (value: DateRange | undefined) => void;
  /** False in the calendar view, where the week drives the range. */
  showRange: boolean;
  /** Set when a single appointment date overrides the range. */
  rangeOverridden: boolean;
  excluded: number | undefined;
  onExcludedToggle: (status: OrderStatus, on: boolean) => void;
  /** How many filters inside this popover are set. */
  activeCount: number;
  /** Any filter on the page is set. */
  canClear: boolean;
  onClear: () => void;
}) {
  const { t } = useTranslation('reservations');
  const id = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={activeCount > 0 ? 'tint' : 'outline'}
          aria-label={
            activeCount > 0
              ? t('filters.moreActive', { count: activeCount })
              : undefined
          }
        >
          <SlidersHorizontal aria-hidden />
          {t('filters.more')}
          {activeCount > 0 && (
            <span
              aria-hidden
              className='bg-brand text-on-brand num inline-flex size-5 items-center justify-center rounded-full text-xs'
            >
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='end'
        className='flex max-h-[var(--radix-popover-content-available-height)] w-80 flex-col gap-4 overflow-y-auto'
      >
        <Field id={`${id}-funding`} label={t('filters.funding')}>
          <FundingFilter
            id={`${id}-funding`}
            value={funding}
            onChange={onFundingChange}
          />
        </Field>
        <Field id={`${id}-idn`} label={t('filters.idNumber')}>
          <Input
            id={`${id}-idn`}
            value={idNumber}
            onChange={(e) => onIdNumberChange(digitsOnly(e.target.value))}
            inputMode='numeric'
            autoComplete='off'
            placeholder={t('filters.idNumberPlaceholder')}
            className='num'
          />
        </Field>
        <Field id={`${id}-phone`} label={t('filters.phone')}>
          <Input
            id={`${id}-phone`}
            type='tel'
            dir='ltr'
            value={phone}
            onChange={(e) => onPhoneChange(digitsOnly(e.target.value))}
            inputMode='numeric'
            autoComplete='off'
            placeholder={t('filters.idNumberPlaceholder')}
            className='num'
          />
        </Field>
        <Field id={`${id}-city`} label={t('filters.city')}>
          <CityFilter id={`${id}-city`} value={city} onChange={onCityChange} />
        </Field>
        {showRange && (
          <Group
            id={`${id}-range`}
            label={t('filters.range')}
            hint={rangeOverridden ? t('filters.rangeOverridden') : undefined}
          >
            <DateRangeFilter
              value={range}
              onChange={onRangeChange}
              fromPlaceholder={t('filters.from')}
              toPlaceholder={t('filters.to')}
            />
          </Group>
        )}
        <ExcludedStatusFilter
          id={`${id}-excl`}
          value={excluded}
          onToggle={onExcludedToggle}
        />
        <div className='border-line flex justify-end border-t pt-3'>
          <Button
            variant='ghost'
            size='sm'
            disabled={!canClear}
            onClick={onClear}
          >
            {t('filters.clear')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
