/** Bilingual app language. Mirrors `AppLanguage` in `src/shared/i18n`. */
export type Lang = 'ar' | 'en';

/** A value that differs by language. */
export type LangMap<T> = Record<Lang, T>;
