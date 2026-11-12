import { parseOrderScanLink } from '@/modules/reservations/api/public-order';

/**
 * The reservation id in a scanned verification link
 * (`…/public/orderscantoverify/{id}/{langId}`) or a bare id, else `null`.
 * Lenient: the check-in dialog only ever receives a link or an id.
 */
export function reservationIdFrom(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const parsed = parseOrderScanLink(value);
  if (parsed) return parsed.reservationId;
  return /^[^\s/?#]+$/.test(value) ? value : null;
}

/**
 * The reservation id the command palette may offer to open for free text:
 * a verification link, or a single token that looks like an id (a GUID, or
 * 4+ letters/digits/dashes with at least one digit). Names and words
 * without digits are search text only, never an id.
 */
export function paletteReservationId(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  const parsed = parseOrderScanLink(value);
  if (parsed) return parsed.reservationId;
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    return value;
  }
  return /^(?=[^\d]*\d)[A-Za-z0-9_-]{4,}$/.test(value) ? value : null;
}

/**
 * True when a keyboard event comes from somewhere the user types
 * (input, textarea, select, contenteditable), so global shortcuts skip it.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * True for the palette shortcut: Ctrl K, or ⌘K on Apple keyboards. Checks
 * the physical key too, so it also works on an Arabic layout (K types ن).
 */
export function isPaletteShortcut(e: {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}): boolean {
  return (
    (e.ctrlKey || e.metaKey) &&
    !e.altKey &&
    !e.shiftKey &&
    (e.key.toLowerCase() === 'k' || e.code === 'KeyK')
  );
}
