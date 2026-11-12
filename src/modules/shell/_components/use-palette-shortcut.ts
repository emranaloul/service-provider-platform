import { useEffect, useEffectEvent } from 'react';
import {
  isPaletteShortcut,
  isTypingTarget,
} from '@/modules/shell/lib/reservation-id';

/**
 * Registers Ctrl K / ⌘K for the command palette while mounted (the app
 * shell only mounts for a signed-in user). Skipped while typing in a field.
 */
export function usePaletteShortcut(onOpen: () => void) {
  const open = useEffectEvent(onOpen);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || !isPaletteShortcut(e)) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
