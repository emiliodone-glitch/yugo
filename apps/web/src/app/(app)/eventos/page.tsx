'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { es, EVENT_TYPES, intlLocale, type EventSummary } from '@yugo/shared';
import { useCurrentMember, useEvents, useSetAttendance } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { CardSkeleton } from '@/components/skeleton';
import { FilterIcon } from '@/components/icons';
import { EventCover } from '@/components/event-cover';
import { EventMap } from '@/components/event-map';
import { QueryError } from '@/components/query-error';

function dayParts(iso: string): { weekday: string; day: number } {
  const date = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat(intlLocale(), {
      weekday: 'short',
      timeZone: 'America/Santo_Domingo',
    })
      .format(date)
      .replace('.', '')
      .toUpperCase(),
    day: Number(
      new Intl.DateTimeFormat(intlLocale(), {
        day: 'numeric',
        timeZone: 'America/Santo_Domingo',
      }).format(date),
    ),
  };
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat(intlLocale(), {
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

// ---------------------------------------------------------------------------
// Filtros (se recuerdan durante la visita)
// ---------------------------------------------------------------------------

type Scope = 'all' | 'mine' | 'city' | 'weekend';

interface EventFilters {
  scope: Scope;
  types: string[];
}

const FILTERS_KEY = 'yugo.events.filters';
const DEFAULT_FILTERS: EventFilters = { scope: 'all', types: [] };

function readFilters(): EventFilters {
  try {
    const raw = window.sessionStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    const parsed = JSON.parse(raw) as Partial<EventFilters>;
    const scope: Scope = ['all', 'mine', 'city', 'weekend'].includes(parsed.scope ?? '')
      ? (parsed.scope as Scope)
      : 'all';
    return { scope, types: Array.isArray(parsed.types) ? parsed.types.filter(Boolean) : [] };
  } catch {
    return DEFAULT_FILTERS;
  }
}

function writeFilters(filters: EventFilters) {
  try {
    window.sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // sin almacenamiento, los filtros duran esta pantalla
  }
}

/** Día de la semana (0 = domingo) en la zona del país, no en la del navegador. */
function weekdayInDR(date: Date): number {
  const name = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: 'America/Santo_Domingo',
  }).format(date);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(name);
}

/** El fin de semana que viene: sábado o domingo dentro de los próximos siete días. */
function isThisWeekend(iso: string, now: Date): boolean {
  const date = new Date(iso);
  const diff = date.getTime() - now.getTime();
  if (diff < -12 * 3600_000 || diff > 7 * 86400_000) return false;
  const weekday = weekdayInDR(date);
  return weekday === 6 || weekday === 0;
}

const SCOPE_OPTIONS: Array<{ value: Scope; get label(): string }> = [
  {
    value: 'all',
    get label() {
      return es.events.filterAll;
    },
  },
  {
    value: 'mine',
    get label() {
      return es.events.filterMine;
    },
  },
  {
    value: 'city',
    get label() {
      return es.events.filterCity;
    },
  },
  {
    value: 'weekend',
    get label() {
      return es.events.filterWeekend;
    },
  },
];

const sameText = (a?: string | null, b?: string | null) =>
  !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

export default function EventsPage() {
  const eventsQuery = useEvents();
  const { data: events = [], isLoading } = eventsQuery;
  const { data: member } = useCurrentMember();
  const setAttendance = useSetAttendance();

  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Lo elegido la última vez se recupera al montar (sessionStorage no existe
  // en el servidor; leerlo aquí evita un desajuste al hidratar).
  useEffect(() => {
    setFilters(readFilters());
  }, []);

  const update = (patch: Partial<EventFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      writeFilters(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return events.filter((event) => {
      if (filters.types.length > 0 && !filters.types.includes(event.type)) return false;
      switch (filters.scope) {
        case 'mine':
          return sameText(event.churchName, member?.churchName);
        case 'city':
          return sameText(event.city, member?.city);
        case 'weekend':
          return isThisWeekend(event.startsAt, now);
        default:
          return true;
      }
    });
  }, [events, filters, member?.churchName, member?.city]);

  const points = useMemo(
    () =>
      filtered
        .filter((event) => typeof event.lat === 'number' && typeof event.lng === 'number')
        .map((event) => ({
          id: event.id,
          title: event.title,
          lat: event.lat as number,
          lng: event.lng as number,
        })),
    [filtered],
  );

  const activeFilters = filters.scope !== 'all' || filters.types.length > 0;

  const focusEvent = (id: string) => {
    setSelectedId(id);
    const card = document.getElementById(`event-${id}`);
    card?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'center',
    });
  };

  const change = (event: EventSummary, status: 'GOING' | 'INTERESTED' | null) =>
    setAttendance.mutate({ eventId: event.id, status });

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px] lg:text-[24px]">{es.events.title}</h1>
        <div className="flex items-center gap-2">
          <span className="chip">{es.events.thisWeek}</span>
          <button
            type="button"
            aria-label={es.discover.filters}
            aria-expanded={filtersOpen}
            aria-controls="event-filters"
            onClick={() => setFiltersOpen((value) => !value)}
            className={`flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border bg-white ${
              activeFilters ? 'border-olive ring-1 ring-olive' : 'border-line'
            }`}
          >
            <FilterIcon className="h-[17px] w-[17px] text-ink" />
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div id="event-filters" className="card mb-3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[13px]">{es.events.filtersTitle}</b>
            {activeFilters ? (
              <button
                type="button"
                className="text-[11px] text-muted underline"
                onClick={() => update(DEFAULT_FILTERS)}
              >
                {es.events.clearFilters}
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={es.events.filtersTitle}>
            {SCOPE_OPTIONS.map((option) => {
              const active = filters.scope === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ scope: option.value })}
                  className={`chip ${active ? 'chip-olive ring-1 ring-olive' : ''}`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <div
            className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2"
            role="group"
            aria-label={es.church.fieldType}
          >
            {EVENT_TYPES.map((type) => {
              const active = filters.types.includes(type.slug);
              return (
                <button
                  key={type.slug}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    update({
                      types: active
                        ? filters.types.filter((slug) => slug !== type.slug)
                        : [...filters.types, type.slug],
                    })
                  }
                  className={`chip ${active ? 'chip-wheat ring-1 ring-wheat' : ''}`}
                >
                  {type.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {eventsQuery.isError ? (
        <QueryError error={eventsQuery.error} onRetry={() => void eventsQuery.refetch()} />
      ) : null}

      {/* En escritorio el mapa acompaña a la lista, fijo a la derecha; en el
          teléfono va arriba, como en la app. */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start xl:gap-6">
        <aside className="xl:order-2 xl:sticky xl:top-4">
          {points.length > 0 ? (
            <EventMap
              events={points}
              selectedId={selectedId}
              onSelect={focusEvent}
              label={es.events.map}
              className="mb-3 h-[180px] xl:h-[420px]"
            />
          ) : !isLoading ? (
            <div className="card mb-3 text-center text-[12px] text-muted">
              {es.events.mapUnavailable}
            </div>
          ) : null}
          <p className="hidden text-center text-[11px] text-muted xl:block">{es.events.reminder}</p>
        </aside>
        <div className="xl:order-1">
          {isLoading ? <CardSkeleton lines={2} /> : null}

          {!isLoading && !eventsQuery.isError && filtered.length === 0 ? (
            <div className="card py-8 text-center">
              <p className="text-sm text-muted">
                {events.length === 0 ? es.events.emptyTitle : es.events.emptyFiltered}
              </p>
              {activeFilters ? (
                <button
                  type="button"
                  className="btn btn-sm btn-olive mt-3 w-auto px-5"
                  onClick={() => update(DEFAULT_FILTERS)}
                >
                  {es.events.clearFilters}
                </button>
              ) : (
                <Link href="/comunidad" className="btn btn-sm btn-ghost mt-3 w-auto px-5">
                  {es.community.title}
                </Link>
              )}
            </div>
          ) : null}

          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-4">
            {filtered.map((event) => {
              const { weekday, day } = dayParts(event.startsAt);
              const mine = event.myStatus;
              const selected = selectedId === event.id;
              return (
                <div
                  key={event.id}
                  id={`event-${event.id}`}
                  className={`card overflow-hidden p-0 lg:mb-0 ${selected ? 'border-olive ring-2 ring-olive' : ''}`}
                >
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
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5">
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
                        {mine === 'GOING' || mine === 'WAITLIST' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="chip chip-olive">
                              {mine === 'GOING' ? es.events.goingMarked : es.events.joinWaitlist}
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={setAttendance.isPending}
                              onClick={() => change(event, null)}
                            >
                              {es.events.notGoing}
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              aria-pressed={mine === 'INTERESTED'}
                              className={`btn btn-sm ${mine === 'INTERESTED' ? 'bg-olive-text' : 'btn-ghost'}`}
                              disabled={setAttendance.isPending}
                              onClick={() =>
                                change(event, mine === 'INTERESTED' ? null : 'INTERESTED')
                              }
                            >
                              {es.events.interested}
                            </button>
                            <button
                              type="button"
                              className="btn btn-olive btn-sm"
                              disabled={setAttendance.isPending}
                              onClick={() => change(event, 'GOING')}
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
