import { useQuery } from '@tanstack/react-query';
import { WeekDay } from '@/shared/api/enums';
import { useUiLang } from '@/shared/hooks/use-ui-lang';
import { pickTranslation } from '@/shared/lib/translation';
import { taxonomyListQuery } from '@/modules/settings/api/taxonomy';

/** i18n key (`profile:weekdays.*`) per weekday flag. */
export const WEEKDAY_KEY: Record<WeekDay, string> = {
  [WeekDay.Saturday]: 'saturday',
  [WeekDay.Sunday]: 'sunday',
  [WeekDay.Monday]: 'monday',
  [WeekDay.Tuesday]: 'tuesday',
  [WeekDay.Wednesday]: 'wednesday',
  [WeekDay.Thursday]: 'thursday',
  [WeekDay.Friday]: 'friday',
};

/**
 * Active provider categories (doc §4) as `{ value, label }`. There is no
 * category lookup in `shared/api/lookups.ts`, so the settings module's list
 * query is read with one big page.
 */
export function useCategoryOptions() {
  const lang = useUiLang();
  const query = useQuery(
    taxonomyListQuery('category', {
      pageNumber: 1,
      pageSize: 1000,
      status: true,
    }),
  );
  const options = (query.data?.data ?? []).map((item) => ({
    value: String(item.id),
    label: pickTranslation(item.translations, lang)?.name ?? `#${item.id}`,
  }));
  return { ...query, options };
}
