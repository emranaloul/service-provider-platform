import type { Lang } from '@/shared/types/lang';

/**
 * A content language's name in the UI language (`ur-PK` → «الأوردية» /
 * "Urdu"). `Language/List` names most languages in English whatever the
 * request culture, so the browser's CLDR names are used instead; an unknown
 * or missing culture keeps the name the API sent.
 */
export function languageDisplayName(
  culture: string | undefined,
  fallback: string,
  uiLang: Lang,
): string {
  const code = culture?.split('-')[0];
  if (!code) return fallback;
  try {
    return (
      new Intl.DisplayNames([uiLang], { type: 'language' }).of(code) ?? fallback
    );
  } catch {
    return fallback;
  }
}
