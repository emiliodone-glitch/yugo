'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { usePublicDevotional } from '@/lib/hooks';

/**
 * El panel de la bienvenida que llena la pantalla ancha con algo que vale:
 * el devocional de hoy (contenido real, cambia cada día) y las tres cosas que
 * distinguen a Yugo. Antes, en escritorio, entre el texto y los botones
 * quedaba media pantalla vacía.
 */
export function WelcomeInside({ compact = false }: { compact?: boolean }) {
  const devotional = usePublicDevotional();

  return (
    <aside className="grid gap-3" aria-label={es.welcome.insideTitle}>
      <div className="rounded-card bg-white/[0.07] p-4 ring-1 ring-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-wheat">{es.welcome.todayTitle}</div>
        {devotional.data ? (
          <>
            <div className="mt-1.5 font-display text-[19px] font-semibold leading-tight">{devotional.data.title}</div>
            <div className="text-[12px] text-ink-muted">{devotional.data.reference}</div>
            {!compact ? (
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-ink-muted">{devotional.data.body}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-3 text-[12px] text-ink-muted">
              <span>{devotional.data.readCount > 0 ? es.explore.readBy(devotional.data.readCount) : es.explore.devotionalToday}</span>
              <Link href="/explorar" className="font-semibold text-wheat hover:underline">
                {es.welcome.readDevotional} ›
              </Link>
            </div>
          </>
        ) : (
          // Esqueleto del mismo alto: la página no salta cuando llega el texto.
          <div className="mt-2 space-y-2" aria-hidden="true">
            <div className="h-5 w-2/3 rounded bg-white/10" />
            <div className="h-3 w-1/3 rounded bg-white/10" />
            {!compact ? <div className="h-12 w-full rounded bg-white/10" /> : null}
          </div>
        )}
      </div>

      <ul className={`grid gap-2 ${compact ? '' : 'md:gap-2.5'}`}>
        {es.welcome.points.map((point, index) => (
          <li key={point.title} className="flex gap-3 rounded-card bg-white/[0.05] px-4 py-3">
            <span className="font-display text-[18px] font-semibold text-wheat">{index + 1}</span>
            <div>
              <div className="text-[13.5px] font-semibold">{point.title}</div>
              {!compact ? <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{point.body}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
