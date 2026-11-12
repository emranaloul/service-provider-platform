import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { BackendModule } from 'i18next';
import { LAZY_NAMESPACES } from '@/shared/i18n/lazy-namespaces';

export const SUPPORTED_LANGUAGES = ['ar', 'en'] as const;
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * The app-shell namespace holds cross-cutting strings (nav, roles, common).
 * It is both the default and the fallback namespace, so any module can use a
 * shell key (e.g. `t('common.back')`) without naming the namespace.
 */
export const SHELL_NS = 'shell';

function applyDocumentDirection(lng: string) {
  document.documentElement.dir = i18n.dir(lng);
  document.documentElement.lang = lng;
}

i18n.on('languageChanged', applyDocumentDirection);

/**
 * Loads a feature module's strings the first time a screen asks for its
 * namespace — `useTranslation('<ns>')` suspends until then. A namespace
 * already registered (shell, auth) is served as-is.
 */
const lazyModuleBackend: BackendModule = {
  type: 'backend',
  init: () => {},
  read: (lng, ns, callback) => {
    const loaded = i18n.getResourceBundle(lng, ns);
    if (loaded) return callback(null, loaded);
    const load = LAZY_NAMESPACES[ns];
    if (!load) {
      if (import.meta.env.DEV) {
        console.warn(
          `[i18n] No loader for namespace "${ns}" — add it to LAZY_NAMESPACES.`,
        );
      }
      return callback(null, {});
    }
    load().then(
      () => callback(null, i18n.getResourceBundle(lng, ns) ?? {}),
      (err: unknown) => callback(err as Error, false),
    );
  },
};

const initPromise = i18n
  .use(lazyModuleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    partialBundledLanguages: true,
    ns: [SHELL_NS],
    defaultNS: SHELL_NS,
    fallbackNS: SHELL_NS,
    fallbackLng: 'ar',
    supportedLngs: SUPPORTED_LANGUAGES,
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    // Re-render on a lazily added namespace — the Topbar reads the screen's
    // title namespace without suspending on it.
    react: { bindI18nStore: 'added' },
    detection: {
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'sp-lang',
      // A browser reports a region tag (`en-US`, `ar-SA`); the app — and
      // every `language === 'en'` check in it — works on the bare code.
      convertDetectedLanguage: (lng: string) => lng.split('-')[0],
    },
  });

// `languageChanged` only fires on a *later* explicit change — the language
// LanguageDetector resolves during this initial `init()` doesn't count as a
// "change", so `dir`/`lang` must be applied once explicitly after init too.
applyDocumentDirection(i18n.language ?? 'ar');
void initPromise.then(() => applyDocumentDirection(i18n.language ?? 'ar'));

export default i18n;
