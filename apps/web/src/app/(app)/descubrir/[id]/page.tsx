'use client';

import { es } from '@yugo/shared';
import { useCurrentMember, useProfileCard } from '@/lib/hooks';
import { ScoreBar, YugoLink } from '@/components/ui';
import { PageSkeleton } from '@/components/skeleton';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';

const COMPONENT_LABELS: Record<string, string> = {
  denomination: es.affinity.denomination,
  intention: es.affinity.intention,
  practices: es.affinity.practices,
  distance: es.affinity.distance,
  age: es.affinity.age,
};

/**
 * Afinidad de fe con una persona (RF-DES-02): por qué la sugerimos, en
 * componentes explicados. La ficha viene de la API; el nombre propio, de la
 * cuenta que entró.
 */
export default function AffinityDetailPage({ params }: { params: { id: string } }) {
  const card = useProfileCard(params.id);
  const member = useCurrentMember();
  const profile = card.data;

  if (card.isError) {
    return (
      <div className="px-4 pt-6">
        <QueryError error={card.error} onRetry={() => void card.refetch()} />
      </div>
    );
  }
  if (card.isLoading) {
    return <PageSkeleton cards={2} />;
  }
  if (!profile) {
    return (
      <div>
        <PageHeader title={es.affinity.title} backHref="/descubrir" />
        <div className="card mx-4 py-8 text-center text-sm text-muted">{es.notFound.body}</div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <PageHeader title={es.affinity.title} backHref="/descubrir" />
      <div className="px-4 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-x-8">
        <div className="card lg:sticky lg:top-4">
          {/* Signature: two avatars joined by the yoke arc */}
          <YugoLink nameA={member.data?.displayName ?? 'Tú'} nameB={profile.displayName} />
          <div className="mb-1 text-center">
            <div className="font-display text-[34px] font-semibold leading-none text-ink">
              {profile.affinity.total}
              <span className="text-[15px] text-muted"> / 100</span>
            </div>
            <p className="mt-1 text-xs text-muted">{es.affinity.summary(profile.displayName)}</p>
            {profile.affinityReason ? (
              <p className="mt-3 rounded-field bg-olive-soft px-3 py-2 text-[12.5px] text-olive-text">
                {profile.affinityReason}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <div className="card">
            {profile.affinity.components.map((component) => (
              <ScoreBar
                key={component.key}
                label={COMPONENT_LABELS[component.key] ?? component.key}
                value={component.score}
                note={component.note}
              />
            ))}
          </div>

          {profile.inCommon?.length ? (
            <>
              <h2 className="h-display mb-1.5 mt-1 text-[15px]">{es.affinity.inCommon}</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.inCommon.map((item, index) => (
                  <span key={item} className={`chip ${index < 3 ? 'chip-olive' : ''}`}>
                    {item}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {profile.affinityReasons && profile.affinityReasons.length > 0 ? (
            <div className="card mt-3 border-0 bg-olive-soft">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-olive-text">
                {es.affinity.reasonsTitle}
              </div>
              <ul className="mt-1 space-y-1 text-[13px] text-olive-text">
                {profile.affinityReasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-1.5">
                    <span aria-hidden>✦</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {profile.community &&
          (profile.community.sharedGroup ||
            profile.community.prayedTogether ||
            profile.community.sharedDevotional ||
            profile.community.attendedTogether) ? (
            <div className="card mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {es.affinity.communityTitle}
              </div>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {profile.community.attendedTogether ? (
                  <li className="chip">
                    {es.affinity.communityEvent(profile.community.attendedTogether)}
                  </li>
                ) : null}
                {profile.community.prayedTogether ? (
                  <li className="chip chip-wheat">
                    {es.affinity.communityPrayed(profile.community.prayedTogether)}
                  </li>
                ) : null}
                {profile.community.sharedDevotional ? (
                  <li className="chip">
                    {es.affinity.communityDevotional(profile.community.sharedDevotional)}
                  </li>
                ) : null}
                {profile.community.sharedGroup ? (
                  <li className="chip chip-olive">
                    {es.affinity.communityGroup(profile.community.sharedGroup)}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {profile.voiceUrl ? (
            <div className="card mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {es.affinity.voice}
                {profile.voiceDurationMs
                  ? ` · ${es.affinity.voiceSeconds(Math.round(profile.voiceDurationMs / 1000))}`
                  : ''}
              </div>
              <audio
                controls
                preload="none"
                src={profile.voiceUrl}
                className="mt-2 w-full"
                aria-label={`${es.affinity.voice}: ${profile.displayName}`}
              >
                Tu navegador no reproduce audio.
              </audio>
            </div>
          ) : null}

          {profile.answers && profile.answers.length > 0 ? (
            <div className="card mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {es.affinity.answers}
              </div>
              <dl className="mt-1 space-y-2.5">
                {profile.answers.map((item) => (
                  <div key={item.question}>
                    <dt className="text-[12px] font-semibold text-olive-text">{item.question}</dt>
                    <dd className="text-[13px] leading-relaxed">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {profile.testimony ? (
            <div className="card mt-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                {es.affinity.testimony}
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed">
                {profile.testimony.replace(/^["“«]+|["”»]+$/g, '')}
              </p>
            </div>
          ) : null}

          {profile.verse ? (
            <div className="card mt-3 border-0 bg-wheat-soft">
              <div className="text-[11px] font-semibold text-wheat-text">VERSÍCULO FAVORITO</div>
              <div className="h-display mt-1 text-[15px]">{profile.verse}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
