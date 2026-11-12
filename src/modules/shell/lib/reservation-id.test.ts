import { describe, expect, it } from 'vitest';
import {
  isPaletteShortcut,
  isTypingTarget,
  paletteReservationId,
  reservationIdFrom,
} from '@/modules/shell/lib/reservation-id';

const LINK = 'https://app.example.com/public/orderscantoverify/abc123/1';

describe('reservationIdFrom (check-in)', () => {
  it('reads the id from a verification link', () => {
    expect(reservationIdFrom(LINK)).toBe('abc123');
  });
  it('accepts a bare token', () => {
    expect(reservationIdFrom('  r1 ')).toBe('r1');
  });
  it('rejects empty text and text with spaces or slashes', () => {
    expect(reservationIdFrom('   ')).toBeNull();
    expect(reservationIdFrom('two words')).toBeNull();
    expect(reservationIdFrom('a/b')).toBeNull();
  });
});

describe('paletteReservationId', () => {
  it('reads the id from a verification link', () => {
    expect(paletteReservationId(` ${LINK} `)).toBe('abc123');
  });
  it('accepts a GUID', () => {
    const guid = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
    expect(paletteReservationId(guid)).toBe(guid);
  });
  it('accepts an id-like token with a digit', () => {
    expect(paletteReservationId('RSV-1042')).toBe('RSV-1042');
    expect(paletteReservationId('10425')).toBe('10425');
  });
  it('ignores names, short tokens and free text', () => {
    expect(paletteReservationId('')).toBeNull();
    expect(paletteReservationId('Ahmed')).toBeNull();
    expect(paletteReservationId('أحمد')).toBeNull();
    expect(paletteReservationId('a1')).toBeNull();
    expect(paletteReservationId('Ahmed 12345')).toBeNull();
  });
});

describe('isTypingTarget', () => {
  it('is true for text fields', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true);
    expect(isTypingTarget(document.createElement('textarea'))).toBe(true);
    expect(isTypingTarget(document.createElement('select'))).toBe(true);
  });
  it('is false for other elements and non-elements', () => {
    expect(isTypingTarget(document.createElement('button'))).toBe(false);
    expect(isTypingTarget(document.body)).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
    expect(isTypingTarget(window)).toBe(false);
  });
});

describe('isPaletteShortcut', () => {
  const base = {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
  };
  it('matches Ctrl K and ⌘K', () => {
    expect(isPaletteShortcut({ ...base, key: 'k', ctrlKey: true })).toBe(true);
    expect(isPaletteShortcut({ ...base, key: 'K', metaKey: true })).toBe(true);
    expect(
      isPaletteShortcut({ ...base, key: 'ن', code: 'KeyK', ctrlKey: true }),
    ).toBe(true);
  });
  it('ignores K alone and other combos', () => {
    expect(isPaletteShortcut({ ...base, key: 'k' })).toBe(false);
    expect(
      isPaletteShortcut({ ...base, key: 'k', ctrlKey: true, shiftKey: true }),
    ).toBe(false);
    expect(isPaletteShortcut({ ...base, key: 'j', ctrlKey: true })).toBe(false);
  });
});
