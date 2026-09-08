'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useEvents, useSetAttendance } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { CardSkeleton } from '@/components/skeleton';
import { FilterIcon } from '@/components/icons';
import { EventCover } from '@/components/event-cover';

function dayParts(iso: string): { weekday: string; day: number } {
  const date = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat('es-DO', {
      weekday: 'short',
      timeZone: 'America/Santo_Domingo',
    })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
    day: Number(
      new Intl.DateTimeFormat('es-DO', {
        day: 'numeric',
        timeZone: 'America/Santo_Domingo',
      }).format(date),
    ),
  };
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));
}

const TYPE_CHIP: Record<string, string> = {
  VIGILIA: 'chip-wine',
  CONGRESO: '',
  SERVICIO_COMUNITARIO: 'chip-olive',
  CONCIERTO: 'chip-wheat',
  RETIRO: 'chip-olive',
  CULTO_ESPECIAL: '',
  ACTIVIDAD_SOCIAL: '',
};

/** Map placeholder: grid + road + pins, like the mockup (react-native-maps /
 * Mapbox render the real map in mobile; web MVP shows the stylized preview). */
function MapPreview({ className = 'mb-3 h-[150px]' }: { className?: string }) {
  const pinPositions = [
    { left: '22%', top: '40%', olive: false },
    { left: '56%', top: '26%', olive: true },
    { left: '72%', top: '63%', olive: false },
    { left: '38%', top: '70%', olive: true },
  ];
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{
        background:
          'linear-gradient(#e6e2d6 1px,transparent 1px) 0 0/22px 22px,' +
          'linear-gradient(90deg,#e6e2d6 1px,transparent 1px) 0 0/22px 22px,#EFECE3',
      }}
      role="img"
      aria-label="Mapa de eventos"
    >
      <div
        className="absolute h-3.5 w-[400px] bg-[#D9D3C2]"
        style={{ left: -30, top: 40, transform: 'rotate(-12deg)' }}
      />
      {pinPositions.map((pin, index) => (
        <span
          key={index}
          className="absolute h-[26px] w-[26px] border-[3px] border-white shadow-md"
          style={{
            left: pin.left,
            top: pin.top,
            background: pin.olive ? '#7A8450' : '#7B2D4B',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
          }}
        />
      ))}
      <span className="chip absolute bottom-2 right-2 bg-white">{es.events.list}</span>
    </div>
  );
}

export default function EventsPage() {
  const { data: events = [], isLoading } = useEvents();
  const setAttendance = useSetAttendance();

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px] lg:text-[24px]">{es.events.title}</h1>
        <div className="flex items-center gap-2">
          <span className="chip">{es.events.thisWeek}</span>
          <button
            type="button"
            aria-label={es.discover.filters}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white"
          >
            <FilterIcon className="h-[17px] w-[17px] text-ink" />
          </button>
        </div>
      </div>

      {/* En escritorio el mapa acompaña a la lista, fijo a la derecha; en el
          teléfono va arriba, como en la app. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-6">
        <aside className="xl:order-2 xl:sticky xl:top-4">
          <MapPreview className="mb-3 h-[150px] xl:h-[420px]" />
          <p className="hidden text-center text-[11px] text-muted xl:block">{es.events.reminder}</p>
        </aside>
        <div className="xl:order-1">
          {isLoading ? (
            <CardSkeleton lines={2} />
          ) : null}

          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            {events.map((event) => {
              const { weekday, day } = dayParts(event.startsAt);
              const mine = event.myStatus;
              return (
                <div key={event.id} className="card overflow-hidden p-0 lg:mb-0">
                  <EventCover type={event.type} imageUrl={event.imageUrl} className="h-[72px]" />
                  <div className="flex items-start gap-2.5 p-3">
                    <div className="min-w-[40px] text-center">
                      <div className="text-[11px] text-muted">{weekday}</div>
                      <div className="font-display text-[22px] font-semibold leading-tight text-ink">
                        {day}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`chip ${TYPE_CHIP[event.type] ?? ''}`}>
                          {event.typeName}
                        </span>
                        <span className="text-[11px] text-muted">
                          {timeLabel(event.startsAt)} · {event.costLabel}
                        </span>
                      </div>
                      <Link href={`/eventos/${event.id}`} className="mt-1 block">
                        <b className="text-[12.5px]">{event.title}</b>
                      </Link>
                      <div className="text-[11px] text-muted">
                        {event.churchName}
                        {event.distanceKm !== undefined ? ` · ${event.distanceKm} km` : ''}
                        {event.city && event.distanceKm !== undefined && event.distanceKm > 50
                          ? ` · ${event.city}`
                          : ''}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        {event.connectionsGoing.length > 0 ? (
                          <span className="flex items-center">
                            {event.connectionsGoing.slice(0, 2).map((connection, index) => (
                              <span key={connection.userId} className={index > 0 ? '-ml-2' : ''}>
                                <Avatar name={connection.displayName} size="xs" />
                              </span>
                            ))}
                            <span className="ml-1.5 text-[11px] text-muted">
                              {es.events.connectionsGoing(event.connectionsGoing.length)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted">
                            {es.events.interestedCount(event.interestedCount)}
                          </span>
                        )}
                        {mine === 'GOING' ? (
                          <button
                            type="button"
                            className="chip chip-olive"
                            onClick={() =>
                              setAttendance.mutate({ eventId: event.id, status: null })
                            }
                          >
                            {es.events.goingMarked}
                          </button>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                setAttendance.mutate({ eventId: event.id, status: 'INTERESTED' })
                              }
                            >
                              {es.events.interested}
                            </button>
                            <button
                              type="button"
                              className="btn btn-olive btn-sm"
                              onClick={() =>
                                setAttendance.mutate({ eventId: event.id, status: 'GOING' })
                              }
                            >
                              {es.events.going}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="pb-4 pt-1 text-center text-[11px] text-muted xl:hidden">
            {es.events.reminder}
          </p>
        </div>
      </div>
    </div>
  );
}
