import { LangId } from '@/shared/api/enums';
import type { Lang } from '@/shared/types/lang';

/** UI language → backend `langId`. */
export const langIdOf = (lang: Lang): LangId =>
  lang === 'en' ? LangId.En : LangId.Ar;

/**
 * The translation row for the UI language, falling back to the first row
 * (doc §6.2: "Fall back to the first translation").
 */
export function pickTranslation<T extends { langId: number }>(
  translations: readonly T[] | null | undefined,
  lang: Lang,
): T | undefined {
  if (!translations?.length) return undefined;
  return (
    translations.find((t) => t.langId === langIdOf(lang)) ?? translations[0]
  );
}

/** The row for one language, if the entity has it. */
export const translationFor = <T extends { langId: number }>(
  translations: readonly T[] | null | undefined,
  langId: LangId,
): T | undefined => translations?.find((t) => t.langId === langId);
