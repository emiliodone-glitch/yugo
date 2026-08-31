'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
import { demoEvents, es } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { Avatar } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { CalendarIcon, PinIcon } from '@/components/icons';

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
        finder !== null ? finder : ((hash >> ((row * cells + col) % 31)) ^ (row * 7 + col * 13)) % 3 === 0;
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
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Código QR de check-in">
      <rect width={size} height={size} fill="#fff" />
      {modules}
    </svg>
  );
}

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const event = demoEvents.find((e) => e.id === params.id);
  if (!event) notFound();

  const { eventStatus, setEventStatus } = useDemoStore();
  const [showQr, setShowQr] = useState(false);
  const mine = eventStatus[event.id];
  // Lleno es lleno: ningún plan agranda el salón.
  const full = event.capacity !== undefined && (event.openSeats ?? 0) === 0;

  const dateLabel = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(event.startsAt));

  return (
    <div>
      <PageHeader title={es.tabs.events} backHref="/eventos" />
      <div className="px-4">
        <div className="card overflow-hidden p-0">
          <div
            className="flex h-28 items-center justify-center"
            style={{ background: 'linear-gradient(160deg,#7B2D4B,#22315C)' }}
          >
            <CalendarIcon className="h-16 w-16 text-white/45" />
          </div>
          <div className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="chip chip-wine">{event.typeName}</span>
              <span className="text-[11px] text-muted">{event.costLabel}</span>
            </div>
            <h2 className="h-display mt-1.5 text-[19px]">{event.title}</h2>
            <div className="mt-1 text-xs capitalize text-muted">{dateLabel}</div>
            <div className="mt-1 flex items-start gap-1 text-xs text-muted">
              <PinIcon className="mt-0.5 h-3 w-3 flex-none" />
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
              <p className="mt-2 text-[11.5px] text-muted">
                {full ? es.events.full : es.events.seatsLeft(event.openSeats ?? 0)}
                {event.waitlistCount ? ` · ${es.events.waitlistCount(event.waitlistCount)}` : ''}
              </p>
            ) : null}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className={`btn flex-1 ${mine === 'INTERESTED' ? 'bg-olive-text' : 'btn-ghost'}`}
                onClick={() => setEventStatus(event.id, mine === 'INTERESTED' ? undefined : 'INTERESTED')}
              >
                {es.events.interested}
              </button>
              <button
                type="button"
                className={`btn flex-1 ${mine === 'GOING' ? 'bg-olive-text' : 'btn-olive'}`}
                onClick={() =>
                  setEventStatus(event.id, mine === 'GOING' || mine === 'WAITLIST' ? undefined : 'GOING')
                }
              >
                {mine === 'GOING'
                  ? es.events.goingMarked
                  : full && mine !== 'WAITLIST'
                    ? es.events.joinWaitlist
                    : es.events.going}
              </button>
            </div>
            {mine === 'GOING' ? (
              <p className="mt-2 text-center text-[11px] text-muted">{es.events.reminder}</p>
            ) : mine === 'WAITLIST' ? (
              <p className="mt-2 text-center text-[11px] text-muted">
                {es.events.waitlistExplained}
              </p>
            ) : full ? (
              <p className="mt-2 text-center text-[11px] text-muted">
                {es.events.capacityHonest}
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

        <div className="card">
          <div className="flex items-center justify-between text-[12.5px]">
            <span>{es.events.goingMarked.replace(' ✓', '')}</span>
            <b>{event.goingCount}</b>
          </div>
          <div className="mt-1 flex items-center justify-between text-[12.5px]">
            <span>{es.events.interested}</span>
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

        <div className="flex gap-2 pb-4">
          <button type="button" className="btn btn-ghost flex-1">
            {es.events.addToCalendar}
          </button>
          <button type="button" className="btn btn-ghost flex-1">
            {es.events.share}
          </button>
        </div>
      </div>
    </div>
  );
}
