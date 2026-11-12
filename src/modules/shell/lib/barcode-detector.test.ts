import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cameraErrorOf,
  createQrDetector,
  isQrScanSupported,
} from '@/modules/shell/lib/barcode-detector';

describe('cameraErrorOf', () => {
  it('maps permission errors to denied', () => {
    expect(cameraErrorOf(new DOMException('x', 'NotAllowedError'))).toBe(
      'denied',
    );
    expect(cameraErrorOf(new DOMException('x', 'SecurityError'))).toBe(
      'denied',
    );
  });
  it('maps a missing camera to noCamera', () => {
    expect(cameraErrorOf(new DOMException('x', 'NotFoundError'))).toBe(
      'noCamera',
    );
  });
  it('maps anything else to failed', () => {
    expect(cameraErrorOf(new DOMException('x', 'NotReadableError'))).toBe(
      'failed',
    );
    expect(cameraErrorOf(new Error('boom'))).toBe('failed');
    expect(cameraErrorOf(undefined)).toBe('failed');
  });
});

describe('QR support detection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is unsupported without BarcodeDetector', async () => {
    expect('BarcodeDetector' in window).toBe(false);
    expect(createQrDetector()).toBeNull();
    await expect(isQrScanSupported()).resolves.toBe(false);
  });

  it('needs qr_code among the supported formats and a camera API', async () => {
    let formats = ['ean_13'];
    class FakeDetector {
      static getSupportedFormats = () => Promise.resolve(formats);
      detect = () => Promise.resolve([]);
    }
    vi.stubGlobal('BarcodeDetector', FakeDetector);
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: () => Promise.reject(new Error('x')) },
    });
    await expect(isQrScanSupported()).resolves.toBe(false);
    formats = ['ean_13', 'qr_code'];
    await expect(isQrScanSupported()).resolves.toBe(true);
    expect(createQrDetector()).toBeInstanceOf(FakeDetector);
  });
});
