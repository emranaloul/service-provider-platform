import { useEffect, useEffectEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  cameraErrorOf,
  createQrDetector,
  type CameraError,
} from '@/modules/shell/lib/barcode-detector';

/** How often a frame is handed to the detector. */
const SCAN_INTERVAL_MS = 250;

/**
 * Live camera preview that reads the first QR code it sees. The camera runs
 * only while this is mounted: every track stops on a result, on an error
 * and on unmount (dialog closed, scan cancelled).
 * Only mount it when `isQrScanSupported()` resolved `true`.
 */
export function QrScanner({
  onDetected,
  onError,
}: {
  onDetected: (value: string) => void;
  onError: (error: CameraError) => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const detected = useEffectEvent(onDetected);
  const failed = useEffectEvent(onError);

  useEffect(() => {
    const video = videoRef.current;
    const detector = createQrDetector();
    if (!video || !detector) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer: number | undefined;

    const stop = () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      video.srcObject = null;
    };

    const scan = async () => {
      if (stopped) return;
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video);
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (value && !stopped) {
            stop();
            detected(value);
            return;
          }
        } catch {
          // A frame the detector can't read yet — try the next one.
        }
      }
      if (!stopped)
        timer = window.setTimeout(() => void scan(), SCAN_INTERVAL_MS);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.srcObject = media;
        video.play().catch(() => {
          // Autoplay of a muted inline video is allowed; ignore the rare
          // interruption (the next frame check simply waits).
        });
        void scan();
      })
      .catch((error: unknown) => {
        if (stopped) return;
        stop();
        failed(cameraErrorOf(error));
      });

    return stop;
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      aria-label={t('shell.checkInDialog.cameraPreview')}
      className='bg-sunken border-line aspect-square w-full rounded-xl border object-cover'
    />
  );
}
