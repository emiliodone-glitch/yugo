'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useCheckIn, usePublicEvent, useSession } from '@/lib/hooks';
import { YugoMark, PinIcon } from '@/components/icons';
import { EventCover } from '@/components/event-cover';

const when = new Intl.DateTimeFormat('es-DO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Santo_Domingo',
});

/**
 * Página pública de un evento (RF-EVE-08). Es a donde apunta el enlace que
 * la API genera para compartir (`/e/:id`); hasta ahora ese enlace no llevaba
 * a ninguna página. Sin datos de miembros: lo que diría un afiche.
 */
export default function PublicEventPage({ params }: { params: { id: string } }) {
  const event = usePublicEvent(params.id);
  const search = useSearchParams();
  const checkInToken = search.get('ci');
  const session = useSession();
  const checkIn = useCheckIn();
  const [checkInResult, setCheckInResult] = useState<'done' | 'error' | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [isPhone, setIsPhone] = useState(false);

  useEffect(() => {
    setIsPhone(/Android|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  // Llegó desde el QR de la entrada y tiene sesión: registrar la asistencia
  // sin pedir un solo toque más (RF-EVE-06).
  useEffect(() => {
    if (!checkInToken || !session.data || checkInResult || checkIn.isPending) return;
    checkIn
      .mutateAsync(checkInToken)
      .then(() => setCheckInResult('done'))
      .catch((caught) => {
        setCheckInError(errorMessage(caught));
        setCheckInResult('error');
      });
  }, [checkInToken, session.data, checkInResult, checkIn]);

  const appLink = `yugo://eventos/${params.id}${checkInToken ? `?ci=${encodeURIComponent(checkInToken)}` : ''}`;
  const here = `/e/${params.id}${checkInToken ? `?ci=${encodeURIComponent(checkInToken)}` : ''}`;

  return (
    <div className="min-h-dvh bg-linen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link href="/explorar" className="flex items-center gap-2.5">
            <YugoMark className="h-7 w-7 text-white" />
            <span className="font-display text-lg font-semibold">Yugo</span>
          </Link>
          <Link
            href="/registro"
            className="rounded-full bg-wheat px-3.5 py-1.5 text-[13px] font-semibold text-ink"
          >
            {es.explore.create}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        {event.isLoading ? (
          <div className="card text-sm text-muted">{es.common.loading}</div>
        ) : event.isError || !event.data ? (
          <div className="card">
            <p className="text-sm text-wine">{es.explore.eventNotFound}</p>
            <Link href="/explorar" className="btn btn-ghost mt-3 inline-flex w-auto px-4">
              {es.explore.backToExplore}
            </Link>
          </div>
        ) : (
          <article className="card overflow-hidden p-0">
            <EventCover
              type={event.data.type}
              imageUrl={event.data.imageUrl}
              className="h-36 md:h-52"
            />
            <div className="p-5">
              <span className="chip chip-wine">{event.data.typeName}</span>
              <h1 className="h-display mt-2 text-[24px] leading-tight">{event.data.title}</h1>
              <p className="mt-1 text-[14px] capitalize text-muted">
                {when.format(new Date(event.data.startsAt))}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[13.5px] text-muted">
                <PinIcon className="h-3.5 w-3.5" />
                {event.data.churchName}
                {event.data.address ? ` · ${event.data.address}` : ''}
                {event.data.city ? `, ${event.data.city}` : ''}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
                <span className="chip">{event.data.costLabel}</span>
                {event.data.interestedCount > 0 ? (
                  <span className="chip">{es.explore.interested(event.data.interestedCount)}</span>
                ) : null}
              </div>
              {event.data.description ? (
                <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed">
                  {event.data.description}
                </p>
              ) : null}
              {checkInToken ? (
                <div
                  role="status"
                  className={`mt-5 rounded-card px-4 py-3 text-[13.5px] ${
                    checkInResult === 'done'
                      ? 'bg-olive-soft text-olive-text'
                      : checkInResult === 'error'
                        ? 'bg-wine-soft text-wine'
                        : 'bg-wheat-soft text-wheat-text'
                  }`}
                >
                  {checkInResult === 'done'
                    ? '¡Asistencia registrada! Que sea una bendición.'
                    : checkInResult === 'error'
                      ? `No pudimos registrar tu asistencia: ${checkInError}`
                      : session.data
                        ? 'Registrando tu asistencia…'
                        : 'Escaneaste el QR de la entrada. Entra con tu cuenta para registrar tu asistencia.'}
                </div>
              ) : (
                <div className="mt-5 rounded-card bg-wheat-soft px-4 py-3 text-[13.5px] text-wheat-text">
                  {es.explore.eventCta}
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {isPhone ? (
                  <a href={appLink} className="btn w-auto px-5">
                    Abrir en la app
                  </a>
                ) : null}
                {!session.data ? (
                  <>
                    <Link href="/registro" className="btn btn-wheat w-auto px-5">
                      {es.explore.create}
                    </Link>
                    <Link
                      href={`/entrar?next=${encodeURIComponent(here)}`}
                      className="btn btn-ghost w-auto px-5"
                    >
                      {es.welcome.haveAccount}
                    </Link>
                  </>
                ) : (
                  <Link href={`/eventos/${params.id}`} className="btn btn-ghost w-auto px-5">
                    Ver en mi agenda
                  </Link>
                )}
              </div>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
