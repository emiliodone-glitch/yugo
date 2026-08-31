'use client';

/**
 * Historias.
 *
 * Public on purpose, and outside the app shell: someone who has not signed up
 * should be able to see what the product is actually for, without a paywall
 * or an account in the way. Every story names the congregation that stood
 * behind it — one nobody can check is marketing.
 */
import Link from 'next/link';
import { es } from '@yugo/shared';
import { useStories } from '@/lib/hooks';
import { YugoMark } from '@/components/icons';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));

export default function StoriesPage() {
  const { data: stories = [], isLoading } = useStories();

  return (
    <div className="min-h-dvh bg-linen">
      <header className="border-b border-line bg-white px-5 py-3">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <YugoMark className="h-6 w-6" />
          <b className="font-display text-lg">Yugo</b>
        </Link>
      </header>

      <main className="mx-auto max-w-[680px] px-5 py-8">
        <h1 className="h-display text-[26px]">{es.stories.title}</h1>
        <p className="mt-1.5 text-[13px] text-muted">{es.stories.subtitle}</p>

        {isLoading ? (
          <div className="card mt-6 py-10 text-center text-sm text-muted">{es.common.loading}</div>
        ) : stories.length === 0 ? (
          <div className="card mt-6 py-10 text-center text-sm text-muted">{es.stories.empty}</div>
        ) : (
          <div className="mt-6 space-y-4">
            {stories.map((story) => (
              <article key={story.id} className="card">
                <h2 className="h-display text-[18px]">{story.names}</h2>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {es.stories.marriedOn(formatDate(story.marriedAt))}
                  {story.city ? ` · ${story.city}` : ''}
                </p>
                <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-body">
                  {story.body}
                </p>
                {/* La iglesia por testigo: es lo que hace verificable la historia. */}
                <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] text-olive-text">
                  {es.stories.witness(story.churchNames)}
                </p>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[11.5px] text-muted">{es.stories.consentNotice}</p>
      </main>
    </div>
  );
}
