'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CLOSING_TEMPLATES, es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useCancelCall, useCloseConnection, useScheduleCall, useVideoCalls } from '@/lib/hooks';

/**
 * Cierre digno (RF-CON-11). Cerrar una conexión deja de ser un botón rojo
 * con un «¿seguro?»: es elegir una palabra amable (o escribir la propia) que
 * la otra persona recibe. El ghosting no se prohíbe; se hace más fácil no
 * hacerlo.
 */
export function ClosePanel({
  matchId,
  otherName,
  onClose,
}: {
  matchId: string;
  otherName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const close = useCloseConnection();
  const [choice, setChoice] = useState<string>(CLOSING_TEMPLATES[0].key);
  const [own, setOwn] = useState('');
  const [error, setError] = useState<string | null>(null);
  const isOwn = choice === 'own';
  const valid = isOwn ? own.trim().length >= 10 : true;

  const submit = async () => {
    setError(null);
    try {
      await close.mutateAsync(
        isOwn ? { matchId, message: own.trim() } : { matchId, template: choice },
      );
      router.push(`/conexiones?cerrada=${encodeURIComponent(otherName)}`);
    } catch (caught) {
      const message = errorMessage(caught);
      setError(
        /closing_message_rejected/.test(message)
          ? 'Ese mensaje no pasó la moderación. Dilo con respeto y sin datos de contacto.'
          : message,
      );
    }
  };

  return (
    <div role="dialog" aria-labelledby="close-title" className="card mx-4 mt-3 border-wheat">
      <b id="close-title" className="text-[13px]">
        {es.connections.closeTitle}
      </b>
      <p className="mt-1 text-[12px] text-muted">{es.connections.closeIntro}</p>
      <div className="mt-2 space-y-1.5">
        {CLOSING_TEMPLATES.map((template) => (
          <label
            key={template.key}
            className={`flex cursor-pointer items-start gap-2 rounded-field px-2.5 py-2 text-[12.5px] ${
              choice === template.key ? 'bg-olive-soft text-olive-text' : 'bg-linen'
            }`}
          >
            <input
              type="radio"
              name="closing"
              className="mt-1"
              checked={choice === template.key}
              onChange={() => setChoice(template.key)}
            />
            <span>{template.text}</span>
          </label>
        ))}
        <label
          className={`flex cursor-pointer items-start gap-2 rounded-field px-2.5 py-2 text-[12.5px] ${
            isOwn ? 'bg-olive-soft text-olive-text' : 'bg-linen'
          }`}
        >
          <input
            type="radio"
            name="closing"
            className="mt-1"
            checked={isOwn}
            onChange={() => setChoice('own')}
          />
          <span>{es.connections.closeOwn}</span>
        </label>
        {isOwn ? (
          <textarea
            className="field min-h-[72px] w-full"
            maxLength={400}
            placeholder={es.connections.closeOwnPlaceholder}
            value={own}
            onChange={(event) => setOwn(event.target.value)}
          />
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-wine">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-wine btn-sm w-auto px-4"
          disabled={!valid || close.isPending}
          onClick={() => void submit()}
        >
          {es.connections.closeConfirm}
        </button>
        <button type="button" className="btn btn-ghost btn-sm w-auto px-3" onClick={onClose}>
          {es.common.cancel}
        </button>
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');
/** Valor por defecto: mañana a las 8 de la noche, hora local. */
function defaultSlot() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(20, 0, 0, 0);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function whenLabel(iso: string) {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

/**
 * Videollamada dentro de la app (RF-CON-12): proponer una hora, ver las
 * propuestas y entrar cuando se abre. Sin compartir número, con el mismo
 * botón de reportar a un toque después.
 */
export function VideoCallPanel({
  matchId,
  conversationId,
  onClose,
}: {
  matchId: string;
  conversationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const calls = useVideoCalls(matchId);
  const schedule = useScheduleCall();
  const cancel = useCancelCall();
  const [slot, setSlot] = useState(defaultSlot());
  const [notice, setNotice] = useState<string | null>(null);

  const propose = async () => {
    setNotice(null);
    try {
      await schedule.mutateAsync({ matchId, scheduledAt: new Date(slot).toISOString() });
      setNotice(es.connections.videoScheduled);
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice(/video_unavailable/.test(message) ? es.connections.videoUnavailable : message);
    }
  };

  const available = calls.data?.available ?? true;
  const list = calls.data?.calls ?? [];

  return (
    <div role="dialog" aria-labelledby="video-title" className="card mx-4 mt-3">
      <b id="video-title" className="text-[13px]">
        {es.connections.videoTitle}
      </b>
      <p className="mt-1 text-[12px] text-muted">{es.connections.videoIntro}</p>
      {!available ? (
        <p className="mt-2 rounded-field bg-wheat-soft px-2.5 py-2 text-[12px] text-wheat-text">
          {es.connections.videoUnavailable}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 text-[12px] text-olive-text">
          {notice}
        </p>
      ) : null}

      {list.length === 0 ? (
        <p className="mt-2 text-[12px] text-muted">{es.connections.videoNone}</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {list.map((call) => (
            <li
              key={call.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-field bg-linen px-2.5 py-2 text-[12.5px]"
            >
              <span>
                <b>{whenLabel(call.scheduledAt)}</b>
                <span className="block text-[11px] text-muted">
                  {call.joinable
                    ? es.connections.videoOpen
                    : es.connections.videoWaiting(whenLabel(call.scheduledAt))}
                </span>
              </span>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  className="btn btn-olive btn-sm w-auto px-3"
                  disabled={!call.joinable}
                  onClick={() => router.push(`/conexiones/${conversationId}/llamada/${call.id}`)}
                >
                  {es.connections.videoJoin}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-auto px-2"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate({ callId: call.id, matchId })}
                >
                  {es.connections.videoCancel}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-semibold text-muted">
          Hora propuesta
          <input
            type="datetime-local"
            className="field mt-1 block"
            value={slot}
            onChange={(event) => setSlot(event.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn-olive btn-sm w-auto px-4"
          disabled={!available || schedule.isPending || !slot}
          onClick={() => void propose()}
        >
          {es.connections.videoPropose}
        </button>
        <button type="button" className="btn btn-ghost btn-sm w-auto px-3" onClick={onClose}>
          {es.common.close}
        </button>
      </div>
    </div>
  );
}
