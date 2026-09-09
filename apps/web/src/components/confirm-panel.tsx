'use client';

import { useEffect, useId, useRef } from 'react';
import { es } from '@yugo/shared';

/**
 * Confirmación dentro de la página, en lugar de `window.confirm`.
 *
 * El diálogo nativo del navegador no se puede estilar, no se traduce con el
 * resto de la interfaz y en algunos navegadores móviles ni siquiera aparece.
 * Este panel se pinta donde estaba el botón que lo abrió, recibe el foco al
 * abrirse (así el lector de pantalla lo anuncia) y Escape lo cierra. Al
 * cerrarse devuelve el foco a donde estaba.
 */
export function ConfirmPanel({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  tone = 'wine',
  busy = false,
  className = '',
}: {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** `wine` para acciones destructivas; `ink` para el resto. */
  tone?: 'wine' | 'ink';
  busy?: boolean;
  className?: string;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancelRef.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={`${id}-title`}
      aria-describedby={body ? `${id}-body` : undefined}
      tabIndex={-1}
      className={`card border-[1.5px] ${tone === 'wine' ? 'border-wine' : 'border-ink'} focus:outline-none focus-visible:ring-2 focus-visible:ring-wheat ${className}`}
    >
      <b id={`${id}-title`} className={`text-[13px] ${tone === 'wine' ? 'text-wine' : 'text-ink'}`}>
        {title}
      </b>
      {body ? (
        <p id={`${id}-body`} className="mt-1 text-[12px] text-muted">
          {body}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={`btn btn-sm w-auto px-4 ${tone === 'wine' ? 'btn-wine' : ''}`}
          disabled={busy}
          onClick={onConfirm}
        >
          {confirmLabel ?? es.common.confirm}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm w-auto px-3"
          disabled={busy}
          onClick={onCancel}
        >
          {cancelLabel ?? es.common.cancel}
        </button>
      </div>
    </div>
  );
}
