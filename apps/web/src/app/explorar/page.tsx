'use client';

import Link from 'next/link';
import { es, intlLocale } from '@yugo/shared';
import { usePublicDevotional, usePublicEvents, usePublicGroups, useStories } from '@/lib/hooks';
import { CalendarIcon, PinIcon } from '@/components/icons';

const when = new Intl.DateTimeFormat(intlLocale(), {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'America/Santo_Domingo',
});

/**
 * Explorar sin cuenta.
 *
 * Todo lo que hay aquí es contenido de la comunidad, no de una persona: el
 * devocional del día, la agenda pública, las historias y los grupos que
 * existen. Descubrir se explica con una tarjeta de ejemplo marcada como tal.
 * Ningún dato de un miembro real sale por esta puerta.
 */
export default function ExplorePage() {
  const devotional = usePublicDevotional();
  const events = usePublicEvents();
  const groups = usePublicGroups();
  const stories = useStories();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="h-display text-[28px] leading-tight">{es.explore.title}</h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">{es.explore.sub}</p>
      </section>

      {/* Devocional */}
      <section aria-labelledby="explore-devotional">
        <h2
          id="explore-devotional"
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          {es.explore.devotionalToday}
        </h2>
        <div className="card">
          {devotional.isLoading ? (
            <div className="text-sm text-muted">{es.common.loading}</div>
          ) : devotional.data ? (
            <>
              <h3 className="h-display text-[20px]">{devotional.data.title}</h3>
              <div className="text-[13px] text-muted">{devotional.data.reference}</div>
              <p className="mt-3 text-[15px] leading-relaxed">{devotional.data.body}</p>
              <div className="mt-3 rounded-card bg-wheat-soft px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-wheat-text">
                  {es.devotional.toThink}
                </div>
                <p className="mt-1 text-[15px]">{devotional.data.question}</p>
              </div>
              {devotional.data.readCount > 0 ? (
                <div className="mt-3 text-[13px] text-muted">
                  {es.explore.readBy(devotional.data.readCount)}
                </div>
              ) : null}
            </>
          ) : (
            <div className="text-sm text-muted">{es.explore.noDevotional}</div>
          )}
          <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">
            {es.explore.devotionalHint}
          </p>
        </div>
      </section>

      {/* Eventos */}
      <section aria-labelledby="explore-events">
        <h2
          id="explore-events"
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          {es.explore.events}
        </h2>
        {events.isLoading ? (
          <div className="card text-sm text-muted">{es.common.loading}</div>
        ) : (events.data ?? []).length === 0 ? (
          <div className="card text-sm text-muted">{es.explore.noEvents}</div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {(events.data ?? []).slice(0, 6).map((event) => (
              <li key={event.id} className="card flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="chip chip-wine">{event.typeName}</span>
                  <span className="text-[11px] capitalize text-muted">
                    {when.format(new Date(event.startsAt))}
                  </span>
                </div>
                <Link
                  href={`/e/${event.id}`}
                  className="h-display text-[16px] leading-snug hover:underline"
                >
                  {event.title}
                </Link>
                <div className="flex items-center gap-1 text-[12.5px] text-muted">
                  <PinIcon className="h-3 w-3" />
                  {event.churchName}
                  {event.city ? ` · ${event.city}` : ''}
                </div>
                <div className="mt-auto flex items-center justify-between text-[12.5px]">
                  <span className="text-muted">
                    {event.costLabel}
                    {event.interestedCount > 0
                      ? ` · ${es.explore.interested(event.interestedCount)}`
                      : ''}
                  </span>
                  <Link href={`/e/${event.id}`} className="font-semibold text-ink">
                    {es.explore.seeEvent} ›
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12.5px] text-muted">{es.explore.eventsHint}</p>
      </section>

      {/* Cómo funciona Descubrir */}
      <section aria-labelledby="explore-how">
        <h2
          id="explore-how"
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          {es.explore.how}
        </h2>
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <ol className="space-y-3">
            {es.explore.howSteps.map((step, index) => (
              <li key={step.title} className="card flex gap-3">
                <span className="h-display text-[22px] text-wheat">{index + 1}</span>
                <div>
                  <h3 className="text-[15px] font-semibold">{step.title}</h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* Tarjeta de ejemplo: silueta, sin nombre, marcada como ilustración. */}
          <figure className="card overflow-hidden p-0" aria-label={es.explore.exampleLabel}>
            <div className="relative flex h-44 items-end bg-gradient-to-b from-[#B7B0A0] to-[#8E8776] p-3 text-white">
              <span className="chip absolute left-3 top-3 bg-white/85 text-ink">
                {es.explore.exampleLabel}
              </span>
              <div>
                <div className="h-display text-[20px]">{es.explore.exampleName}</div>
                <div className="text-[12px] opacity-90">{es.explore.exampleLine}</div>
              </div>
            </div>
            <figcaption className="p-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="chip chip-olive">{es.discover.endorsedBadge}</span>
                <span className="chip">{es.discover.purposeMarriage}</span>
              </div>
              <p className="mt-2 text-[12.5px] text-muted">{es.explore.exampleWhy}</p>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Historias */}
      <section aria-labelledby="explore-stories">
        <h2
          id="explore-stories"
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          {es.explore.stories}
        </h2>
        <div className="card">
          <p className="text-[13.5px] text-muted">{es.explore.storiesHint}</p>
          {(stories.data ?? []).length > 0 ? (
            <ul className="mt-3 space-y-2">
              {(stories.data ?? []).slice(0, 2).map((story) => (
                <li key={story.id} className="border-t border-line pt-2">
                  <b className="text-[14px]">{story.names}</b>
                  <span className="text-[12px] text-muted"> · {story.churchNames}</span>
                  <p className="line-clamp-2 text-[13px] text-muted">{story.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <Link href="/historias" className="btn btn-ghost mt-3 inline-flex w-auto px-4">
            {es.explore.seeStories}
          </Link>
        </div>
      </section>

      {/* Comunidad */}
      <section aria-labelledby="explore-community">
        <h2
          id="explore-community"
          className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"
        >
          {es.explore.community}
        </h2>
        {groups.isLoading ? (
          <div className="card text-sm text-muted">{es.common.loading}</div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {(groups.data ?? []).slice(0, 6).map((group) => (
              <li key={group.id} className="card flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-olive-soft font-semibold text-olive-text">
                  {group.name.slice(0, 1)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-semibold">
                    {group.name}
                    {group.isOfficial ? (
                      <span className="chip chip-olive ml-1.5">{es.common.official}</span>
                    ) : null}
                  </div>
                  <div className="text-[12px] text-muted">
                    {group.category}
                    {group.city ? ` · ${group.city}` : ''} ·{' '}
                    {es.explore.membersCount(group.memberCount)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[12.5px] text-muted">{es.explore.communityHint}</p>
      </section>

      {/* Cierre */}
      <section className="rounded-card bg-ink px-5 py-6 text-white">
        <h2 className="h-display text-[22px]">{es.explore.footerTitle}</h2>
        <p className="mt-1.5 max-w-xl text-[13.5px] text-ink-muted">{es.explore.footerBody}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/registro" className="btn btn-wheat w-auto px-5">
            {es.explore.create}
          </Link>
          <Link
            href="/entrar"
            className="btn w-auto border-[1.5px] border-white/40 bg-transparent px-5 text-white"
          >
            {es.welcome.haveAccount}
          </Link>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-muted2">
          <CalendarIcon className="h-3.5 w-3.5" />
          {es.welcome.chipAdults} · {es.welcome.chipVerified}
        </div>
      </section>
    </div>
  );
}
