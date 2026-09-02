'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useHomeSummary, useSession, useSetAttendance } from '@/lib/hooks';
import { Avatar, AffinityRing } from '@/components/ui';
import { DevotionalCard } from '@/components/devotional';
import { usePrayerWall } from '@/lib/hooks';
import { CalendarIcon, PinIcon } from '@/components/icons';

function formatDate(date: Date): string {
  const text = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Santo_Domingo',
  }).format(date);
  // «Miércoles, 2 de septiembre»: en español solo va en mayúscula la primera
  // letra; un `capitalize` de CSS escribía «2 De Septiembre».
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Un vistazo al muro, no el muro entero.
 *
 * Muestra dos peticiones y una de ellas es, por el orden del servidor, la que
 * nadie ha acompañado todavía: es la que de verdad necesita que alguien pase
 * por aquí hoy.
 */
function PrayerPeek() {
  const { data } = usePrayerWall();
  const items = (data ?? []).slice(0, 2);
  if (items.length === 0) return null;

  return (
    <section className="mt-3" aria-label={es.prayer.title}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="h-display text-[15px]">{es.prayer.title}</h2>
        <Link href="/oracion" className="text-xs text-muted">
          {es.common.seeAll}
        </Link>
      </div>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="card m-0">
            {item.answeredAt ? <span className="chip chip-olive">{es.prayer.answered}</span> : null}
            <p className={`text-[13px] leading-relaxed ${item.answeredAt ? 'mt-1.5' : ''}`}>
              {item.body}
            </p>
            <div className="mt-2 text-[11px] text-muted">
              {es.prayer.intercessionCount(item.intercessions)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatEventDay(iso: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));
}

export default function HomePage() {
  const { data, isLoading } = useHomeSummary();
  const { data: session } = useSession();
  const setAttendance = useSetAttendance();

  const summary = data?.summary;
  const featured = data?.featuredEvent;
  const suggestions = data?.suggestions ?? [];
  const banners = data?.banners ?? [];
  const going = featured?.myStatus === 'GOING';
  const today = formatDate(new Date());
  const displayName = session?.displayName ?? 'hermano';

  if (isLoading || !summary) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }

  return (
    // En pantallas anchas, dos columnas: lo del día a la izquierda y, a la
    // derecha, lo que vale abrir todos los días. En el teléfono, una sola
    // columna en el orden en que se lee.
    <div className="px-4 pt-3 xl:grid xl:grid-cols-[minmax(0,1fr)_380px] xl:gap-x-8 xl:px-8">
      {/* Greeting */}
      <div className="flex items-center justify-between pb-2 xl:col-start-1">
        <div>
          <div className="text-xs text-muted">{today}</div>
          <h1 className="h-display text-[19px]">{es.home.greeting(displayName)}</h1>
        </div>
        <Link href="/perfil" aria-label={es.profile.title}>
          <Avatar name={displayName} size="s" />
        </Link>
      </div>

      {/* Daily summary */}
      <div className="card flex items-center justify-between border-0 bg-ink text-white xl:col-start-1">
        <div>
          <div className="text-xs text-ink-muted">{es.home.interestsToday}</div>
          <div className="font-display text-[30px] font-semibold leading-none">
            {summary.interestsUsedToday}
            <span className="text-sm text-ink-muted2"> / {summary.interestsLimit ?? '∞'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-muted">{es.home.newConnections}</div>
          <div className="font-display text-[30px] font-semibold leading-none text-wheat">
            {summary.newConnections}
          </div>
        </div>
      </div>

      {/*
        El devocional y el muro son la razón para volver mañana. Van arriba de
        las sugerencias a propósito: cuando alguien termina su lista del día,
        estas dos cosas siguen aquí, y sirven aunque nunca conozca a nadie.
      */}
      <aside className="mt-3 xl:col-start-2 xl:row-span-6 xl:row-start-1 xl:mt-0 xl:pt-12">
        <DevotionalCard compact />
        <PrayerPeek />
      </aside>

      <div className="xl:col-start-1">
        {/* Administrable home banners (RF-ADM-10) */}
        {banners.map((banner) => (
          <div
            key={banner.id}
            className={`card border-0 ${
              banner.tone === 'olive'
                ? 'bg-olive-soft text-olive-text'
                : banner.tone === 'wheat'
                  ? 'bg-wheat-soft text-wheat-text'
                  : banner.tone === 'wine'
                    ? 'bg-wine-soft text-wine'
                    : 'bg-ink text-white'
            }`}
          >
            <div className="text-[12.5px] font-semibold">{banner.title}</div>
            <div className="mt-1 text-[11px] opacity-90">{banner.body}</div>
          </div>
        ))}

        {/* Featured event */}
        <div className="mb-2 mt-3 flex items-center justify-between">
          <h2 className="h-display text-[15px]">{es.home.featuredEvents}</h2>
          <Link href="/eventos" className="text-xs text-muted">
            {es.common.seeAll}
          </Link>
        </div>
        {featured ? (
          <div className="card overflow-hidden p-0">
            <div
              className="flex h-[92px] items-center justify-center"
              style={{ background: 'linear-gradient(160deg,#7B2D4B,#22315C)' }}
            >
              <CalendarIcon className="h-16 w-16 text-white/45" />
            </div>
            <div className="p-3.5">
              <div className="flex items-center justify-between">
                <span className="chip chip-wine">{featured.typeName}</span>
                <span className="text-[11px] capitalize text-muted">
                  {formatEventDay(featured.startsAt)}
                </span>
              </div>
              <Link href={`/eventos/${featured.id}`}>
                <h3 className="h-display mt-1.5 text-[15px]">{featured.title}</h3>
              </Link>
              <div className="flex items-center gap-1 text-xs text-muted">
                <PinIcon className="h-3 w-3" />
                {featured.churchName} · {featured.city}
                {featured.distanceKm !== undefined ? ` · ${featured.distanceKm} km` : ''}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted">
                  {es.home.connectionsGoing(featured.connectionsGoing.length)}
                </span>
                <button
                  type="button"
                  className={`btn btn-sm ${going ? 'chip-olive bg-olive-soft text-olive-text' : 'btn-olive'}`}
                  onClick={() =>
                    setAttendance.mutate({ eventId: featured.id, status: going ? null : 'GOING' })
                  }
                >
                  {going ? es.events.goingMarked : es.home.willAttend}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card py-6 text-center text-sm text-muted">
            Todavía no hay eventos destacados cerca de ti.
          </div>
        )}

        {/* Suggestions */}
        <div className="mb-2 mt-3 flex items-center justify-between">
          <h2 className="h-display text-[15px]">{es.home.suggestionsToday}</h2>
          <Link href="/descubrir" className="text-xs text-muted">
            {es.tabs.discover}
          </Link>
        </div>
        <div className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2">
          {suggestions.map((profile) => (
            <Link
              key={profile.userId}
              href={`/descubrir/${profile.userId}`}
              className="card m-0 min-w-[130px] p-2.5"
            >
              <div className="flex items-center justify-between">
                <Avatar name={profile.displayName} size="s" photoUrl={profile.photoUrl} />
                <AffinityRing value={profile.affinity.total} size={34} />
              </div>
              <div className="h-display mt-2 text-[13px]">
                {profile.displayName}, {profile.age}
              </div>
              <div className="text-[11px] text-muted">
                {profile.denomination} · {profile.distanceKm} km
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
