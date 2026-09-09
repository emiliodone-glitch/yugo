'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { es } from '@yugo/shared';

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.9;

type Stage = 'starting' | 'live' | 'preview' | 'denied';

/**
 * Selfie en vivo para la verificación de identidad (RF-VER-01).
 *
 * Enciende la cámara frontal, muestra la vista previa con los gestos que se
 * piden y captura un fotograma a un JPEG que la pantalla sube. Si el
 * navegador no tiene `getUserMedia` (o no hay cámara), avisa con
 * `onUnavailable` para que la pantalla siga con su flujo sin cámara; si la
 * persona negó el permiso, lo dice y deja reintentar. Al desmontarse apaga
 * la cámara: una luz encendida sin motivo es lo último que queremos.
 */
export function SelfieCapture({
  gestures,
  gestureLabels,
  onConfirm,
  onCancel,
  onUnavailable,
  busy = false,
}: {
  gestures: string[];
  gestureLabels: Record<string, string>;
  onConfirm: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  onUnavailable: () => void;
  busy?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stage, setStage] = useState<Stage>('starting');
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);
  const onUnavailableRef = useRef(onUnavailable);
  onUnavailableRef.current = onUnavailable;

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    setStage('starting');
    const media = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!media || typeof media.getUserMedia !== 'function') {
      onUnavailableRef.current();
      return;
    }
    try {
      const stream = await media.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      setStage('live');
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      // Sin cámara física no hay nada que pedir: se sigue sin ella.
      if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        onUnavailableRef.current();
        return;
      }
      setStage('denied');
    }
  }, []);

  useEffect(() => {
    void start();
    return () => stop();
  }, [start, stop]);

  useEffect(
    () => () => {
      if (shot) URL.revokeObjectURL(shot.url);
    },
    [shot],
  );

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob) return;
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { blob, url: URL.createObjectURL(blob) };
    });
    setStage('preview');
  };

  const retake = () => {
    setShot((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setStage('live');
  };

  const confirm = async () => {
    if (!shot) return;
    await onConfirm(shot.blob);
    stop();
  };

  return (
    <div className="mt-3" data-testid="selfie-capture">
      <div className="relative h-64 overflow-hidden rounded-card bg-ink-deep">
        {/* La vista previa va en espejo, como uno se ve; la foto que se sube no. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          aria-label={es.profile.verificationIdentity}
          className={`h-full w-full -scale-x-100 object-cover ${stage === 'live' ? '' : 'hidden'}`}
        />
        {stage === 'preview' && shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="" className="h-full w-full -scale-x-100 object-cover" />
        ) : null}
        {stage === 'starting' ? (
          <div
            role="status"
            className="absolute inset-0 flex items-center justify-center text-[12px] text-white/80"
          >
            {es.profile.cameraStarting}
          </div>
        ) : null}
        {stage === 'denied' ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-[12px] text-white/90"
          >
            {es.profile.cameraDenied}
            <button
              type="button"
              className="btn btn-sm w-auto bg-white px-4 text-ink"
              onClick={() => void start()}
            >
              {es.common.retry}
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-2 rounded-field bg-wheat-soft px-3 py-2 text-[12px] text-wheat-text">
        <b>Sigue estos gestos:</b>
        <ol className="mt-1 list-inside list-decimal">
          {gestures.map((gesture) => (
            <li key={gesture}>{gestureLabels[gesture] ?? gesture}</li>
          ))}
        </ol>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Busca buena luz, sin lentes ni gorra. Tu selfie solo la ve el equipo de verificación; nunca
        se muestra en tu perfil.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {stage === 'live' ? (
          <button
            type="button"
            className="btn btn-olive w-auto px-5"
            onClick={() => void capture()}
          >
            {es.profile.takeSelfie}
          </button>
        ) : null}
        {stage === 'preview' ? (
          <>
            <button
              type="button"
              className="btn btn-olive w-auto px-5"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? es.common.loading : es.profile.useThisSelfie}
            </button>
            <button
              type="button"
              className="btn btn-ghost w-auto px-4"
              disabled={busy}
              onClick={retake}
            >
              {es.profile.retakeSelfie}
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm w-auto px-3"
          disabled={busy}
          onClick={() => {
            stop();
            onCancel();
          }}
        >
          {es.common.cancel}
        </button>
      </div>
    </div>
  );
}
