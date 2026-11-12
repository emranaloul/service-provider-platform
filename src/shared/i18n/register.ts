import i18n from './index';

export type LocaleTree = Record<string, unknown>;

/**
 * Register one feature module's translations under its own i18next namespace.
 *
 * Each module owns `src/modules/<name>/i18n/{ar,en,index}.ts`; its `index.ts`
 * calls this so the module's strings live entirely within its own directory
 * and never collide with other modules' keys.
 */
export function registerModule(
  namespace: string,
  resources: { ar: LocaleTree; en: LocaleTree },
) {
  // (lng, ns, resources, deep, overwrite)
  i18n.addResourceBundle('ar', namespace, resources.ar, true, true);
  i18n.addResourceBundle('en', namespace, resources.en, true, true);
}
