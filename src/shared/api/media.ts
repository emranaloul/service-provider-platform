/** Origin static files (icons, logos, attachments) are served from (doc §1.1). */
export const MEDIA_URL: string = import.meta.env.VITE_MEDIA_BASE_URL ?? '';

/**
 * The full URL of a relative media path the API returned, or `undefined` when
 * there is none. Already-absolute URLs pass through.
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('blob:')) return path;
  const base = MEDIA_URL.endsWith('/') ? MEDIA_URL : `${MEDIA_URL}/`;
  return `${base}${path.replace(/^\/+/, '')}`;
}
