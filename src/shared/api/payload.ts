/**
 * Shared payload rules for create/update forms (doc §3.1, §3.2).
 */

// ── Translations (§3.1) ─────────────────────────────────────────────────────

export interface TranslationFormValue<F extends string> {
  langId: number;
  fields: Record<F, string>;
}

export interface TranslationUpdateContext {
  /** Translation rows the server returned for this entity. */
  existing: readonly { id: number; langId: number }[];
  /** The parent FK key, e.g. `serviceProviderId`, `ServiceProviderCategoryID`. */
  parentKey: string;
  parentId: number;
}

/**
 * One entry per language whose name is filled in, ready for `toFormData`
 * (which compacts the indexes). Other fields go as `""` when empty. On update,
 * each entry also carries its row `id` (`0` for a new language) and the parent
 * FK. A language whose name was cleared is left out — the backend cannot
 * delete a translation this way.
 */
export function translationsPayload<F extends string>(
  values: readonly TranslationFormValue<F>[],
  nameField: NoInfer<F>,
  update?: TranslationUpdateContext,
): Record<string, string | number>[] {
  return values
    .filter((v) => (v.fields[nameField] ?? '').trim() !== '')
    .map((v) => {
      const fields: Record<string, string> = {};
      for (const [key, value] of Object.entries<string>(v.fields)) {
        fields[key] = (value ?? '').trim();
      }
      if (!update) return { langId: v.langId, ...fields };
      return {
        id: update.existing.find((e) => e.langId === v.langId)?.id ?? 0,
        [update.parentKey]: update.parentId,
        langId: v.langId,
        ...fields,
      };
    });
}

// ── Child-collection diffing (§3.2) ─────────────────────────────────────────

export interface DiffEntry<K> {
  /** Existing row id, or `0` for a new item. */
  id: number;
  /** The business key (tag id, `YYYY-MM-DD` date, branch-service id). */
  key: K;
  isDeleted: boolean;
}

/**
 * Diffs the selected business keys against what the server returned:
 * kept → `{id, isDeleted:false}`, removed → `{id, isDeleted:true}`,
 * new → `{id:0, isDeleted:false}`. Matching is on the key, not the row id.
 */
export function diffCollection<K extends string | number>(
  existing: readonly { id: number; key: K }[],
  selected: readonly K[],
): DiffEntry<K>[] {
  const chosen = new Set(selected);
  const known = new Set(existing.map((e) => e.key));
  const out: DiffEntry<K>[] = existing.map((e) => ({
    id: e.id,
    key: e.key,
    isDeleted: !chosen.has(e.key),
  }));
  for (const key of chosen) {
    if (!known.has(key)) out.push({ id: 0, key, isDeleted: false });
  }
  return out;
}

/** True when the diff adds or removes anything (e.g. "reason required"). */
export const diffChanged = (
  diff: readonly { id: number; isDeleted: boolean }[],
): boolean => diff.some((d) => d.id === 0 || d.isDeleted);

/**
 * The `YYYY-MM-DD` key of a date-only value the API returns
 * (`2026-10-01T00:00:00` → `2026-10-01`). Use it to diff closing dates and
 * schedule-offs — never the weekday-based key the old client used (§18.2).
 */
export const dateOnlyKey = (value: string): string => value.slice(0, 10);
