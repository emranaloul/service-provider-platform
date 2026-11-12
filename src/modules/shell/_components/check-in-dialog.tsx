import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { QrScanner } from '@/modules/shell/_components/qr-scanner';
import {
  isQrScanSupported,
  type CameraError,
} from '@/modules/shell/lib/barcode-detector';
import { reservationIdFrom } from '@/modules/shell/lib/reservation-id';

/**
 * Top bar → Check-in (QR): scan the booking QR with the camera, or paste /
 * type the scanned link (or the id), then open the order in the
 * reservations drawer, which offers Check-in.
 *
 * Camera scanning uses the browser's built-in `BarcodeDetector` (no extra
 * library). Where it is missing or can't read QR codes (e.g. Firefox, most
 * desktop browsers) the button is hidden and the dialog is paste-only.
 */
export function CheckInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [qrSupported, setQrSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);

  useEffect(() => {
    let live = true;
    void isQrScanSupported().then((ok) => {
      if (live) setQrSupported(ok);
    });
    return () => {
      live = false;
    };
  }, []);

  const close = (next: boolean) => {
    if (!next) {
      setText('');
      setInvalid(false);
      setScanning(false);
      setCameraError(null);
    }
    onOpenChange(next);
  };

  /** Opens the booking for a pasted, typed or scanned value. */
  const openBooking = (value: string) => {
    const id = reservationIdFrom(value);
    if (!id) {
      setInvalid(true);
      return;
    }
    close(false);
    navigate(`/reservations?order=${encodeURIComponent(id)}`);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    openBooking(text);
  };

  const onScanned = (value: string) => {
    setScanning(false);
    setText(value);
    setInvalid(false);
    openBooking(value);
  };

  const onCameraError = (error: CameraError) => {
    setScanning(false);
    setCameraError(error);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{t('shell.checkInDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('shell.checkInDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className='flex flex-col gap-4' noValidate>
          {qrSupported && (
            <div className='flex flex-col gap-2'>
              {scanning && (
                <QrScanner onDetected={onScanned} onError={onCameraError} />
              )}
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setCameraError(null);
                  setScanning((on) => !on);
                }}
              >
                {scanning ? <CameraOff /> : <Camera />}
                {scanning
                  ? t('shell.checkInDialog.stopCamera')
                  : t('shell.checkInDialog.scan')}
              </Button>
              {scanning && (
                <p className='text-ink-2 text-sm'>
                  {t('shell.checkInDialog.scanHint')}
                </p>
              )}
              {cameraError && (
                <p role='alert' className='text-down text-sm'>
                  {t(`shell.checkInDialog.cameraError.${cameraError}`)}
                </p>
              )}
            </div>
          )}
          <div className='flex flex-col gap-2'>
            <Label htmlFor='check-in-link'>
              {t('shell.checkInDialog.label')}
            </Label>
            <Input
              id='check-in-link'
              dir='ltr'
              autoFocus
              autoComplete='off'
              value={text}
              placeholder={t('shell.checkInDialog.placeholder')}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? 'check-in-link-error' : undefined}
              onChange={(e) => {
                setText(e.target.value);
                setInvalid(false);
              }}
            />
            {invalid && (
              <p
                id='check-in-link-error'
                role='alert'
                className='text-down text-sm'
              >
                {t('shell.checkInDialog.invalid')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => close(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type='submit' disabled={!text.trim()}>
              {t('shell.checkInDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
