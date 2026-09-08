'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { calendarUrl, useEventDetail, useSetAttendance } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { EventCover } from '@/components/event-cover';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';
import { PinIcon } from '@/components/icons';

/** Simple deterministic QR rendered as an SVG matrix (RF-EVE-06). */
function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const cells = 21;
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  const cellSize = size / cells;
  const isFinder = (row: number, col: number) => {
    const inBox = (r0: number, c0: number) =>
      row >= r0 && row < r0 + 7 && col >= c0 && col < c0 + 7;
    const onRing = (r0: number, c0: number) => {
      const dr = row - r0;
      const dc = col - c0;
      const edge = dr === 0 || dr === 6 || dc === 0 || dc === 6;
      const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      return edge || core;
    };
    if (inBox(0, 0)) return onRing(0, 0);
    if (inBox(0, cells - 7)) return onRing(0, cells - 7);
    if (inBox(cells - 7, 0)) return onRing(cells - 7, 0);
    return null;
  };

  const modules: React.ReactNode[] = [];
  for (let row = 0; row < cells; row += 1) {
    for (let col = 0; col < cells; col += 1) {
      const finder = isFinder(row, col);
      const filled =
        finder !== null
          ? finder
          : ((hash >> ((row * cells + col) % 31)) ^ (row * 7 + col * 13)) % 3 === 0;
      if (filled) {
        modules.push(
          <rect
            key={`${row}-${col}`}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize}
            height={cellSize}
            fill="#22315C"
          />,
        );
      }
    }
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="Código QR de check-in"
    >
      <rect width={size} height={size} fill="#fff" />
      {modules}
    </svg>
  );
}

/**
 * Detalle de un encuentro. Lee el evento real de la agenda (antes buscaba
 * en la lista de demostración y con un evento real daba 404), guarda la
 * asistencia en la API y ofrece calendario y enlace para compartir.
 */
export default function EventDetailPage({ params }: { params: { id: string } }) {
  const detail = useEventDetail(params.id);
  const setAttendance = useSetAttendance();
  const [showQr, setShowQr] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const event = detail.data;

  if (detail.isError) {
    return (
      <div className="px-4 pt-6">
        <QueryError error={detail.error} onRetry={() => void detail.refetch()} />
      </div>
    );
  }
  if (detail.isLoading) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }
  if (!event) {
    return (
      <div>
        <PageHeader title={es.tabs.events} backHref="/eventos" />
        <div className="card mx-4 py-8 text-center text-sm text-muted">
          {es.events.notFound}
          <div className="mt-3">
            <Link href="/eventos" className="btn btn-sm btn-ghost">
              {es.events.title}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const mine = event.myStatus;
  // Lleno es lleno: ningún plan agranda el salón.
  const full = event.capacity !== undefined && (event.openSeats ?? 0) === 0;

  // «Viernes, 4 de septiembre»: en español solo va en mayúscula la primera
  // letra; un `capitalize` de CSS escribía «4 De Septiembre».
  const rawDate = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(event.startsAt));
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

  const change = async (status: 'GOING' | 'INTERESTED' | null) => {
    try {
      await setAttendance.mutateAsync({ eventId: event.id, status });
      setNotice(null);
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/e/${event.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNotice(es.events.shareCopied);
    } catch {
      // Compartir cancelado por la persona: nada que decir.
    }
  };

  const calendar = calendarUrl(event.id);

  return (
    <div className="pb-6">
      <PageHeader title={es.tabs.events} backHref="/eventos" />
      <div className="px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-x-6">
        <div>
          <div className="card overflow-hidden p-0">
            <EventCover type={event.type} imageUrl={event.imageUrl} className="h-40 lg:h-64" />
            <div className="p-4 lg:p-5">
              <div className="flex items-center justify-between">
                <span className="chip chip-wine">{event.typeName}</span>
                <span className="text-[12px] text-muted">{event.costLabel}</span>
              </div>
              <h2 className="h-display mt-2 text-[20px] lg:text-[26px]">{event.title}</h2>
              <div className="mt-1.5 text-[13px] text-muted">{dateLabel}</div>
              <div className="mt-1 flex items-start gap-1 text-[13px] text-muted">
                <PinIcon className="mt-0.5 h-3.5 w-3.5 flex-none" />
                <span>
                  {event.churchName} · {event.address ?? event.city}
                  {event.distanceKm !== undefined ? ` · ${event.distanceKm} km` : ''}
                </span>
              </div>

              {/* Encuentro convocado por el ministerio de solteros. */}
              {event.audience === 'SINGLES' ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="chip chip-wheat">{es.events.singlesBadge}</span>
                  <span className="text-[11px] text-muted">
                    {es.events.convokedBy(event.churchName)}
                  </span>
                </div>
              ) : null}

              {/* El cupo, dicho con honestidad: las plazas que quedan ya
                  descuentan las reservadas. */}
              {event.capacity !== undefined ? (
                <p className="mt-2 text-[12px] text-muted">
                  {full ? es.events.full : es.events.seatsLeft(event.openSeats ?? 0)}
                  {event.waitlistCount ? ` · ${es.events.waitlistCount(event.waitlistCount)}` : ''}
                </p>
              ) : null}
            </div>
          </div>

          {/* Connections attending, respecting the privacy preference (RF-EVE-05) */}
          {event.connectionsGoing.length > 0 ? (
            <div className="card">
              <div className="text-[12.5px] font-semibold">
                {es.home.connectionsGoing(event.connectionsGoing.length)}
              </div>
              <div className="mt-2 flex flex-wrap gap-3">
                {event.connectionsGoing.map((connection) => (
                  <div key={connection.userId} className="text-center">
                    <Avatar name={connection.displayName} size="m" />
                    <div className="mt-1 text-[11px] text-muted">{connection.displayName}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-4">
          <div className="card">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
              {es.events.attendance}
            </div>
            <div className="mt-2 grid gap-2">
              <button
                type="button"
                disabled={setAttendance.isPending}
                className={`btn ${mine === 'GOING' ? 'bg-olive-text' : 'btn-olive'}`}
                onClick={() =>
                  void change(mine === 'GOING' || mine === 'WAITLIST' ? null : 'GOING')
                }
              >
                {mine === 'GOING'
                  ? es.events.goingMarked
                  : full && mine !== 'WAITLIST'
                    ? es.events.joinWaitlist
                    : es.events.going}
              </button>
              <button
                type="button"
                disabled={setAttendance.isPending}
                className={`btn ${mine === 'INTERESTED' ? 'bg-olive-text' : 'btn-ghost'}`}
                onClick={() => void change(mine === 'INTERESTED' ? null : 'INTERESTED')}
              >
                {es.events.interested}
              </button>
            </div>
            {mine === 'GOING' ? (
              <p className="mt-2 text-center text-[11px] text-muted">{es.events.reminder}</p>
            ) : mine === 'WAITLIST' ? (
              <p className="mt-2 text-center text-[11px] text-muted">
                {es.events.waitlistExplained}
              </p>
            ) : full ? (
              <p className="mt-2 text-center text-[11px] text-muted">{es.events.capacityHonest}</p>
            ) : null}
            <div className="mt-3 flex justify-between border-t border-line pt-3 text-[12.5px]">
              <span className="text-muted">{es.events.goingMarked.replace(' ✓', '')}</span>
              <b>{event.goingCount}</b>
            </div>
            <div className="mt-1 flex justify-between text-[12.5px]">
              <span className="text-muted">{es.events.interested}</span>
              <b>{event.interestedCount}</b>
            </div>
          </div>

          {/* QR check-in (RF-EVE-06) */}
          {mine === 'GOING' ? (
            <div className="card text-center">
              {showQr ? (
                <>
                  <div className="mx-auto w-fit rounded-field border border-line p-2">
                    <QrCode value={event.id} />
                  </div>
                  <p className="mt-2 text-[11px] text-muted">
                    Muestra este código en la entrada para registrar tu asistencia.
                  </p>
                </>
              ) : (
                <button type="button" className="btn btn-ghost" onClick={() => setShowQr(true)}>
                  {es.events.checkIn}
                </button>
              )}
            </div>
          ) : null}

          <div className="flex gap-2">
            {calendar !== '#' ? (
              <a href={calendar} className="btn btn-ghost flex-1" download>
                {es.events.addToCalendar}
              </a>
            ) : (
              <button type="button" className="btn btn-ghost flex-1">
                {es.events.addToCalendar}
              </button>
            )}
            <button type="button" className="btn btn-ghost flex-1" onClick={() => void share()}>
              {es.events.share}
            </button>
          </div>
          {notice ? (
            <p
              role="status"
              className="mt-2 rounded-field bg-olive-soft px-3 py-2 text-[12px] text-olive-text"
            >
              {notice}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
