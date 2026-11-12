/**
 * The parts of the browser's Shape Detection `BarcodeDetector` the check-in
 * scanner uses (not in TypeScript's DOM lib yet). Chromium on Android,
 * ChromeOS and macOS ships it; Firefox and most desktop builds do not.
 */
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats(): Promise<string[]>;
}

export type QrDetector = BarcodeDetectorInstance;

function barcodeDetectorClass(): BarcodeDetectorConstructor | null {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
    return null;
  }
  const { BarcodeDetector } = window as Window & {
    BarcodeDetector?: BarcodeDetectorConstructor;
  };
  return BarcodeDetector ?? null;
}

/** True when this browser can read QR codes from the camera. */
export async function isQrScanSupported(): Promise<boolean> {
  const Detector = barcodeDetectorClass();
  if (!Detector || !navigator.mediaDevices?.getUserMedia) return false;
  try {
    const formats = await Detector.getSupportedFormats();
    return formats.includes('qr_code');
  } catch {
    return false;
  }
}

/** A QR-only detector, or `null` when the API is missing. */
export function createQrDetector(): QrDetector | null {
  const Detector = barcodeDetectorClass();
  return Detector ? new Detector({ formats: ['qr_code'] }) : null;
}

export type CameraError = 'denied' | 'noCamera' | 'failed';

/** Maps a `getUserMedia` rejection to the message the dialog shows. */
export function cameraErrorOf(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'noCamera';
  }
  return 'failed';
}
