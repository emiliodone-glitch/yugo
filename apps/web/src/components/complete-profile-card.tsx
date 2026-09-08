'use client';

import Link from 'next/link';
import { es, LIMITS } from '@yugo/shared';
import { useCurrentMember } from '@/lib/hooks';

/**
 * «Completa tu perfil» (RF-PER-10): la barra, cuánto falta para aparecer en
 * Descubrir y el siguiente paso con su valor. Desaparece al 100 %. Es lo
 * que reemplaza a los pasos que el registro dejó de pedir.
 */
export function CompleteProfileCard({ compact = false }: { compact?: boolean }) {
  const member = useCurrentMember();
  const user = member.data;
  if (!user || user.completeness >= 100) return null;

  const hidden = user.completeness < LIMITS.MIN_COMPLETENESS_FOR_DISCOVER;
  const nextKey = user.completenessNext?.key ?? null;
  const nextLabel = nextKey
    ? ((es.profile.fields as Record<string, string>)[nextKey] ?? nextKey)
    : null;
  const href =
    nextKey === 'photos'
      ? '/perfil/fotos'
      : nextKey === 'answers'
        ? '/perfil/editar'
        : '/perfil/editar';

  return (
    <section
      aria-label={es.profile.editTitle}
      className={`card m-0 ${hidden ? 'border-wheat bg-wheat-soft' : ''} ${compact ? 'py-3' : ''}`}
    >
      <div className="flex items-center justify-between">
        <b className="text-[13px]">{es.profile.completeCardTitle(user.completeness)}</b>
        <Link href={href} className="btn btn-sm btn-olive w-auto px-3">
          {es.profile.completeCardCta}
        </Link>
      </div>
      <div className="bar mt-2">
        <i style={{ width: `${Math.max(user.completeness, 2)}%` }} />
      </div>
      <p className={`mt-2 text-[11.5px] ${hidden ? 'text-wheat-text' : 'text-muted'}`}>
        {hidden ? es.profile.completeCardHidden : es.profile.completeCardVisible}
        {nextLabel && user.completenessNext
          ? ` ${es.profile.completenessHint(nextLabel, user.completenessNext.targetPct)}`
          : ''}
      </p>
      {!compact ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Link href="/perfil/fotos" className="chip">
            {es.onboarding.nextPhotos}
          </Link>
          <Link href="/perfil/verificacion" className="chip">
            {es.onboarding.nextVerify}
          </Link>
          <Link href="/perfil/editar" className="chip">
            {es.onboarding.nextComplete}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
