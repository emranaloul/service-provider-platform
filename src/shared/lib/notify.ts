import { toast, type ExternalToast } from 'sonner';

export type NotifyType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast helper preserving the legacy `CustomToast(title, type, ...opts)` call
 * shape from the Mwafq guide (§5.3), backed by sonner. Pass user-facing text
 * already translated via `t()` — this helper does no i18n itself.
 *
 * @example notify(t('common.saved'), 'success')
 */
export function notify(
  title: string,
  type: NotifyType = 'info',
  opts?: ExternalToast,
) {
  return toast[type](title, opts);
}

export { toast };
