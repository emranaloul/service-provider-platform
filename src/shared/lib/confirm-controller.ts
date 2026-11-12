export interface ConfirmOptions {
  /** Dialog heading. Falls back to a translated default. */
  title?: string;
  /** Body text / question. */
  description?: string;
  /** Confirm button label. Defaults to `common.confirm`. */
  confirmText?: string;
  /** Cancel button label. Defaults to `common.cancel`. */
  cancelText?: string;
  /** Style the confirm action as destructive (e.g. delete). */
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

// Minimal external store so `confirm()` can be called imperatively from
// anywhere (event handlers, async flows) and still drive a single mounted
// <ConfirmHost/>. Mirrors the guide's promise-returning `showConfirmationAlert`.
let state: ConfirmState = { open: false };
const listeners = new Set<() => void>();

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return state;
}

/**
 * Imperative confirmation dialog (guide §5.3 `showAreYouSure` /
 * `showConfirmationAlert`). Resolves `true` on confirm, `false` on cancel/dismiss.
 *
 * @example
 * if (await confirm({ description: t('deleteConfirm'), destructive: true })) {
 *   await remove(id);
 * }
 */
export function confirm(options: ConfirmOptions = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    state = { ...options, open: true, resolve };
    emit();
  });
}

export function settle(value: boolean) {
  state.resolve?.(value);
  state = { ...state, open: false, resolve: undefined };
  emit();
}
