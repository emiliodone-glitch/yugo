'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { demoCurrentUser, demoDiscover, es } from '@yugo/shared';
import { ScoreBar, YugoLink } from '@/components/ui';
import { ChevronLeft } from '@/components/icons';

const COMPONENT_LABELS: Record<string, string> = {
  denomination: es.affinity.denomination,
  intention: es.affinity.intention,
  practices: es.affinity.practices,
  distance: es.affinity.distance,
  age: es.affinity.age,
};

export default function AffinityDetailPage({ params }: { params: { id: string } }) {
  const profile = demoDiscover.find((p) => p.userId === params.id);
  if (!profile) notFound();

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <Link
          href="/descubrir"
          aria-label={es.common.back}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white"
        >
          <ChevronLeft className="h-4 w-4 text-ink" />
        </Link>
        <h1 className="h-display text-[15px]">{es.affinity.title}</h1>
        <span className="w-[34px]" />
      </div>

      {/* Signature: two avatars joined by the yoke arc */}
      <YugoLink nameA={demoCurrentUser.displayName} nameB={profile.displayName} />

      <div className="mb-3 text-center">
        <div className="font-display text-[30px] font-semibold leading-none text-ink">
          {profile.affinity.total}
          <span className="text-[15px] text-muted"> / 100</span>
        </div>
        <p className="mt-1 text-xs text-muted">{es.affinity.summary(profile.displayName)}</p>
      </div>

      <div className="card">
        {profile.affinity.components.map((component) => (
          <ScoreBar
            key={component.key}
            label={COMPONENT_LABELS[component.key]}
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

      {profile.verse ? (
        <div className="card mt-3 border-0 bg-wheat-soft">
          <div className="text-[11px] font-semibold text-wheat-text">VERSÍCULO FAVORITO</div>
          <div className="h-display mt-1 text-[15px]">{profile.verse}</div>
        </div>
      ) : null}
    </div>
  );
}
