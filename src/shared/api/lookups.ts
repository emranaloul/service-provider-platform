import { queryOptions } from '@tanstack/react-query';
import { apiGet, currentCulture } from '@/shared/api/http-client';
import type { PagedResponse } from '@/shared/api/types';
import { pickTranslation } from '@/shared/lib/translation';
import i18n from '@/shared/i18n';

/**
 * Pickers used by the Service Provider forms. Classifications come from
 * doc.md §5.1; the rest from the lookup-endpoints reference (taken from the
 * working client). Every list is paged; the working client sends no
 * `PageSize`, so a large one is sent here to avoid cut-off lists.
 */
export const LOOKUP_PATHS = {
  classifications: 'Provider/ServiceProviderClassfication/List?',
  countries: 'General/Country/List?',
  cities: 'General/City/List?',
  tags: 'General/Tags/List?',
  services: 'Service/Service/List?',
  serviceGroups: 'Service/ServiceGroup/List?',
  serviceGroupById: 'Service/ServiceGroup/GetById',
  /** Order completion questions (doc.md §13.4). */
  serviceQuestions: 'Service/Service/QuestionsList?',
  /** No service prefix — this is what the working client calls. */
  vaccines: 'Vaccine/List?',
} as const;

/** A picker option: id + display name in the UI language. */
export interface Option {
  id: number;
  name: string;
}

/** A catalogue price for one classification (doc §10.4). */
export interface ClassificationPrice {
  serviceProviderClassificationId: number;
  price: number;
  /**
   * Service groups only: one row per (classification, `isB2CPrice`) —
   * `true` is the B2C price, `false` the B2B price.
   */
  isB2CPrice?: boolean;
}

export interface PricedOption extends Option {
  pricing: ClassificationPrice[];
}

interface RawNamed {
  id: number;
  name?: string | null;
  translations?: { langId: number; name?: string | null }[] | null;
}

const ALL = { pageNumber: 1, pageSize: 1000 };

/** Translated name for the UI culture, else `translations[0]`, else plain `name`. */
const nameOf = (item: RawNamed): string =>
  pickTranslation(item.translations, currentCulture())?.name ??
  item.name ??
  `#${item.id}`;

const toOption = (item: RawNamed): Option => ({
  id: item.id,
  name: nameOf(item),
});

/** A-Z §20.4: tags are not translated; a blank name shows "Unnamed Tag". */
export const toTagOption = (item: RawNamed): Option => ({
  id: item.id,
  name: item.name?.trim() || i18n.t('common.unnamedTag'),
});

/** Lists come back paged or as a bare array, depending on the endpoint. */
const rowsOf = <T>(value: PagedResponse<T> | T[] | null): T[] =>
  Array.isArray(value) ? value : (value?.data ?? []);

async function listOptions(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<Option[]> {
  const value = await apiGet<PagedResponse<RawNamed> | RawNamed[] | null>(
    path,
    { params: { ...ALL, ...params } },
  );
  return rowsOf(value).map(toOption);
}

export const lookupKeys = {
  all: ['lookups'] as const,
  of: (name: string, ...args: unknown[]) =>
    [...lookupKeys.all, name, currentCulture(), ...args] as const,
};

const LONG = 10 * 60_000;

export const classificationsQuery = () =>
  queryOptions({
    queryKey: lookupKeys.of('classifications'),
    queryFn: () => listOptions(LOOKUP_PATHS.classifications, { status: true }),
    staleTime: LONG,
  });

export const countriesQuery = () =>
  queryOptions({
    queryKey: lookupKeys.of('countries'),
    queryFn: () => listOptions(LOOKUP_PATHS.countries),
    staleTime: LONG,
  });

export const citiesQuery = (countryId: number | undefined) =>
  queryOptions({
    queryKey: lookupKeys.of('cities', countryId),
    queryFn: () => listOptions(LOOKUP_PATHS.cities, { countryId }),
    enabled: !!countryId,
    staleTime: LONG,
  });

/** Who the tag picker lists tags for (Missing Items §12.2). */
export interface TagScope {
  isAdmin: boolean;
  serviceProviderId: number | null;
}

/**
 * The working client sends `Type=1` for admins and nothing for everyone
 * else, leaving the scope to the token. The portal sends the provider's own
 * id explicitly instead, so a provider only ever picks its own tags.
 */
export const tagParams = (scope: TagScope) =>
  scope.isAdmin
    ? { Type: 1 }
    : { ServiceProviderId: scope.serviceProviderId ?? undefined };

export const tagsQuery = (scope: TagScope) =>
  queryOptions({
    queryKey: lookupKeys.of('tags', scope),
    // Tag names are not translated.
    queryFn: async (): Promise<Option[]> => {
      const value = await apiGet<PagedResponse<RawNamed> | RawNamed[] | null>(
        LOOKUP_PATHS.tags,
        { params: { ...ALL, ...tagParams(scope) } },
      );
      return rowsOf(value).map(toTagOption);
    },
    staleTime: LONG,
  });

interface RawService extends RawNamed {
  pricing?: ClassificationPrice[] | null;
}
interface RawServiceGroup extends RawNamed {
  serviceGroupClassificationPricings?: ClassificationPrice[] | null;
}

export const servicesQuery = () =>
  queryOptions({
    queryKey: lookupKeys.of('services'),
    queryFn: async (): Promise<PricedOption[]> => {
      // Active services only, as the working client asks for.
      const value = await apiGet<PagedResponse<RawService> | RawService[]>(
        LOOKUP_PATHS.services,
        { params: { ...ALL, status: true } },
      );
      return rowsOf(value).map((s) => ({
        ...toOption(s),
        pricing: s.pricing ?? [],
      }));
    },
    staleTime: LONG,
  });

export const serviceGroupsQuery = () =>
  queryOptions({
    queryKey: lookupKeys.of('serviceGroups'),
    queryFn: async (): Promise<PricedOption[]> => {
      const value = await apiGet<
        PagedResponse<RawServiceGroup> | RawServiceGroup[]
      >(LOOKUP_PATHS.serviceGroups, { params: ALL });
      return rowsOf(value).map((g) => ({
        ...toOption(g),
        pricing: g.serviceGroupClassificationPricings ?? [],
      }));
    },
    staleTime: LONG,
  });

/** The vaccines available in one city (doc §11.4) — always pass the city. */
export const vaccinesQuery = (cityId: number | undefined) =>
  queryOptions({
    queryKey: lookupKeys.of('vaccines', cityId),
    queryFn: () => listOptions(LOOKUP_PATHS.vaccines, { CityId: cityId }),
    enabled: !!cityId,
    staleTime: LONG,
  });

/**
 * The service ids inside a service group (doc §10.3: a group is sent as every
 * service it contains), from `serviceGroupServices`, skipping removed links.
 */
export async function fetchServiceGroupServiceIds(
  groupId: number,
): Promise<number[]> {
  const group = await apiGet<{
    serviceGroupServices?:
      { id: number; serviceId: number; isDeleted?: boolean }[] | null;
  }>(LOOKUP_PATHS.serviceGroupById, { params: { id: groupId } });
  return (group.serviceGroupServices ?? [])
    .filter((s) => !s.isDeleted)
    .map((s) => s.serviceId);
}

/**
 * Catalogue price for the branch's classification, or 0 (doc §10.4).
 *
 * A group can have a B2C row and a B2B row for the same classification.
 * Branch services are priced for customers (their B2B price is always 0),
 * so the B2C row (`isB2CPrice: true`) wins; without one, the first match.
 * The working client took the first row whatever its flag, i.e. depended on
 * row order.
 * TODO(backend): confirm the B2C row is the intended branch default.
 */
export function priceFor(
  pricing: readonly ClassificationPrice[],
  classificationId: number | undefined,
): number {
  const rows = pricing.filter(
    (p) => p.serviceProviderClassificationId === classificationId,
  );
  return (rows.find((p) => p.isB2CPrice === true) ?? rows[0])?.price ?? 0;
}

/** id → name map of a loaded option list. */
export const namesById = (options: readonly Option[] | undefined) =>
  new Map((options ?? []).map((o) => [o.id, o.name]));
