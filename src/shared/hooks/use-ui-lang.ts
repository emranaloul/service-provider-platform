import { useTranslation } from 'react-i18next';
import type { Lang } from '@/shared/types/lang';

/**
 * Resolves the active UI language as `'ar' | 'en'`, defaulting to `'ar'`.
 *
 * Reads `i18n.language`, not `i18n.resolvedLanguage` — the latter is only
 * (re)computed inside `i18n.init()`/`changeLanguage()` by checking whether
 * the resource store already holds translations for the detected language.
 * On a cold load where the language detector resolves a cached language
 * (e.g. `localStorage`) before any module has registered its resource
 * bundles (`init()` here is called with `resources: {}}`), that check finds
 * nothing and `resolvedLanguage` is left `undefined` for the rest of the
 * session — `language` doesn't have this gap.
 */
export function useUiLang(): Lang {
  const { i18n } = useTranslation();
  return i18n.language === 'en' ? 'en' : 'ar';
}
