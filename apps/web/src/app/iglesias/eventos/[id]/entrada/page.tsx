'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { es } from '@yugo/shared';
import { ApiError, errorMessage } from '@/lib/api';
import { useCheckInTicket, useChurchEvents } from '@/lib/hooks';
import { BarTop } from '@/components/admin';

type Outcome =
  | { kind: 'ok'; name: string }
  | { kind: 'already'; name: string }
  | { kind: 'invalid' }
  | { kind: 'error'; message: string };

/** `BarcodeDetector` no está en las definiciones de TypeScript todavía. */
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

function barcodeDetector(): BarcodeDetectorCtor | null {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  return (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
}

function isInvalidTicket(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 404 || /invalid_ticket|ticket_not_found|not_found/.test(error.code);
  }
  return error instanceof Error && /invalid_ticket|not_found/.test(error.message);
}

/**
 * Registrar entradas en la puerta (RF-EVE-06). Es la única pantalla del
 * portal que muestra un nombre: el de la persona que está delante enseñando
 * su propia entrada. El código se escribe (o se escanea, si el navegador
 * sabe leer QR) y se confirma con Enter; el conteo de la sesión queda a la
 * vista de quien recibe.
 */
export default function ValidateTicketsPage({ params }: { params: { id: string } }) {
  const events = useChurchEvents();
  const checkIn = useCheckInTicket(params.id);
  const event = events.data?.find((row) => row.id === params.id);

  const [code, setCode] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [count, setCount] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canScan = !!barcodeDetector();

  const submit = useCallback(
    async (raw: string) => {
      const value = raw.trim().toUpperCase();
      if (!value) return;
      try {
        const result = await checkIn.mutateAsync(value);
        if (result.alreadyCheckedIn) {
          setOutcome({ kind: 'already', name: result.attendee.displayName });
        } else {
          setOutcome({ kind: 'ok', name: result.attendee.displayName });
          setCount((current) => current + 1);
        }
      } catch (error) {
        setOutcome(
          isInvalidTicket(error) ? { kind: 'invalid' } : { kind: 'error', message: errorMessage(error) },
        );
      } finally {
        setCode('');
        inputRef.current?.focus();
      }
    },
    [checkIn],
  );

  const stopScan = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setScanning(false);
  }, []);

  // El escáner: cámara trasera y una lectura cada poco; al leer, se registra.
  useEffect(() => {
    if (!scanning) return;
    const Detector = barcodeDetector();
    const media = navigator.mediaDevices;
    if (!Detector || !media?.getUserMedia) {
      setScanning(false);
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    const detector = new Detector({ formats: ['qr_code'] });
    media
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        timer = window.setInterval(async () => {
          if (cancelled || !video.videoWidth) return;
          try {
            const codes = await detector.detect(video);
            const value = codes[0]?.rawValue;
            if (value) {
              window.clearInterval(timer);
              stopScan();
              void submit(value);
            }
          } catch {
            // un fotograma que no se pudo leer: se intenta con el siguiente
          }
        }, 400);
      })
      .catch(() => {
        setScanError(es.profile.cameraDenied);
        setScanning(false);
      });
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [scanning, stopScan, submit]);

  return (
    <div>
      <BarTop
        title={es.events.validateTitle}
        right={
          <div className="flex items-center gap-2">
            <Link href={`/iglesias/eventos/${params.id}/qr`} className="btn btn-ghost btn-sm">
              QR de entrada
            </Link>
            <Link href="/iglesias/eventos" className="btn btn-ghost btn-sm">
              ‹ {es.church.events}
            </Link>
          </div>
        }
      />
      <div className="p-6">
        <div className="mx-auto max-w-md">
          {event ? (
            <p className="mb-3 text-[13px] text-muted">
              <b className="text-ink">{event.title}</b>
              {event.city ? ` · ${event.city}` : ''}
            </p>
          ) : null}

          <form
            className="card"
            onSubmit={(formEvent) => {
              formEvent.preventDefault();
              void submit(code);
            }}
          >
            <label htmlFor="ticket-code" className="text-[11px] font-medium text-muted">
              {es.events.validatePlaceholder}
            </label>
            <input
              id="ticket-code"
              ref={inputRef}
              className="field mt-1 text-center font-mono text-[18px] uppercase tracking-[0.18em]"
              placeholder="YUGO-XXXX-XXXX"
              value={code}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              onChange={(changeEvent) => setCode(changeEvent.target.value.toUpperCase())}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-olive w-auto px-5"
                disabled={checkIn.isPending || code.trim().length < 4}
              >
                {checkIn.isPending ? es.common.loading : es.common.confirm}
              </button>
              {canScan ? (
                <button
                  type="button"
                  className="btn btn-ghost w-auto px-4"
                  onClick={() => {
                    setScanError(null);
                    if (scanning) stopScan();
                    else setScanning(true);
                  }}
                >
                  {scanning ? es.events.stopScanning : es.events.scanWithCamera}
                </button>
              ) : null}
            </div>
            {scanning ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                aria-label={es.events.scanWithCamera}
                className="mt-3 h-56 w-full rounded-card bg-ink-deep object-cover"
              />
            ) : null}
            {scanError ? (
              <p role="alert" className="mt-2 text-[12px] text-wine">
                {scanError}
              </p>
            ) : null}
          </form>

          {outcome ? (
            <div
              role="status"
              className={`card border-0 text-[13px] font-semibold ${
                outcome.kind === 'ok'
                  ? 'bg-olive-soft text-olive-text'
                  : outcome.kind === 'already'
                    ? 'bg-wheat-soft text-wheat-text'
                    : 'bg-wine-soft text-wine'
              }`}
            >
              {outcome.kind === 'ok'
                ? es.events.validated(outcome.name)
                : outcome.kind === 'already'
                  ? `${es.events.alreadyCheckedIn} · ${outcome.name}`
                  : outcome.kind === 'invalid'
                    ? es.events.invalidTicket
                    : outcome.message}
            </div>
          ) : null}

          <p className="mt-2 text-center text-[12px] text-muted" aria-live="polite">
            {es.events.checkedInCount(count)}
          </p>
        </div>
      </div>
    </div>
  );
}
