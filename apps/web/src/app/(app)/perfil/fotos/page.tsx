'use client';

import { useEffect, useRef, useState } from 'react';
import { es, LIMITS } from '@yugo/shared';
import { useDeletePhoto, useMyPhotos, useUploadPhoto } from '@/lib/hooks';
import { DEMO_MODE, errorMessage } from '@/lib/api';
import { ACCEPTED_IMAGE_TYPES, preparePhoto } from '@/lib/image';
import { PageHeader } from '@/components/page-header';
import { PersonSilhouette } from '@/components/icons';

const MODERATION_COPY: Record<string, { label: string; tone: string; hint: string }> = {
  PENDING: {
    label: 'En revisión',
    tone: 'bg-wheat-soft text-wheat-text',
    hint: 'La revisamos antes de mostrarla. Suele tardar menos de una hora.',
  },
  APPROVED: {
    label: 'Publicada',
    tone: 'bg-olive-soft text-olive-text',
    hint: 'Visible en tu perfil y en Descubrir.',
  },
  HELD: {
    label: 'En revisión manual',
    tone: 'bg-wheat-soft text-wheat-text',
    hint: 'Una persona del equipo la está revisando.',
  },
  REJECTED: {
    label: 'No aprobada',
    tone: 'bg-wine-soft text-wine',
    hint: 'No cumple el Pacto de conducta. Puedes subir otra.',
  },
};

/** RF-PER-02: entre 2 y 6 fotos, todas moderadas antes de publicarse. */
export default function PhotosPage() {
  const { data: photos = [], isLoading } = useMyPhotos();
  const upload = useUploadPhoto();
  const remove = useDeletePhoto();
  const inputRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An object URL is a live handle to memory; releasing it avoids leaking a
  // full-size bitmap for every photo the member tries out.
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const prepared = await preparePhoto(file);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return prepared.previewUrl;
      });
      await upload.mutateAsync({
        blob: prepared.blob,
        contentType: prepared.contentType,
        position: photos.length,
      });
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message === 'unsupported_image_type'
          ? 'Usa una imagen JPG, PNG o WEBP.'
          : errorMessage(caught),
      );
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const canAddMore = photos.length < LIMITS.PHOTOS_MAX;
  const missing = Math.max(0, LIMITS.PHOTOS_MIN - photos.length);

  return (
    <div>
      <PageHeader title={es.onboarding.photosTitle} backHref="/perfil" />
      <div className="px-4 pb-6">
        <p className="mb-3 text-[12.5px] text-muted">{es.onboarding.photosSub}</p>

        {missing > 0 ? (
          <div className="card border-0 bg-wheat-soft text-[12px] text-wheat-text">
            Te {missing === 1 ? 'falta 1 foto' : `faltan ${missing} fotos`} para el mínimo de{' '}
            {LIMITS.PHOTOS_MIN}. Sin ellas tu perfil no aparece en Descubrir.
          </div>
        ) : null}

        {error ? (
          <div className="card border-0 bg-wine-soft text-[12px] text-wine">{error}</div>
        ) : null}

        {DEMO_MODE ? (
          <div className="card border-0 bg-linen-2 text-[12px] text-muted">
            En modo demo las fotos no se suben a ningún servidor: la pantalla muestra el flujo
            completo sin guardar nada.
          </div>
        ) : null}

        {isLoading ? (
          <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => {
              const state = MODERATION_COPY[photo.moderationStatus] ?? MODERATION_COPY.PENDING;
              return (
                <figure key={photo.id} className="relative">
                  <div className="relative aspect-square overflow-hidden rounded-card border border-line bg-linen-2">
                    {photo.url && photo.moderationStatus !== 'REJECTED' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt={index === 0 ? 'Tu foto principal' : `Tu foto ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <PersonSilhouette className="h-10 w-10 text-line" />
                      </div>
                    )}
                    {index === 0 ? (
                      <span className="absolute left-1 top-1 rounded-full bg-ink px-1.5 py-[2px] text-[9px] font-semibold text-white">
                        Principal
                      </span>
                    ) : null}
                  </div>
                  <figcaption className={`mt-1 rounded-full px-1.5 py-[2px] text-center text-[9.5px] ${state.tone}`}>
                    {state.label}
                  </figcaption>
                  <button
                    type="button"
                    onClick={() => remove.mutate(photo.id)}
                    className="mt-1 w-full text-[10.5px] text-muted underline"
                  >
                    Quitar
                  </button>
                </figure>
              );
            })}

            {canAddMore ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={upload.isPending}
                className="flex aspect-square items-center justify-center rounded-card border border-dashed border-line bg-white text-2xl text-line disabled:opacity-60"
                aria-label="Agregar una foto"
              >
                {upload.isPending ? (
                  <span className="text-[11px] text-muted">Subiendo…</span>
                ) : (
                  '+'
                )}
              </button>
            ) : null}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          capture="user"
          className="sr-only"
          onChange={(event) => pick(event.target.files?.[0])}
        />

        <p className="mt-3 text-[11px] text-muted">
          {photos.length} de {LIMITS.PHOTOS_MAX}. Recortamos al cuadrado en tu dispositivo, así ves
          exactamente el encuadre que verán los demás. Cada foto pasa por moderación antes de
          publicarse.
        </p>
      </div>
    </div>
  );
}
