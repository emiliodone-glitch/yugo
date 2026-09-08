'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { DEMO_MODE } from '@/lib/api';
import { useDemoStore } from '@/lib/demo-store';
import {
  useCurrentMember,
  useLogout,
  useMyPhotos,
  usePauseProfile,
  useSession,
  useSubscriptionState,
  useVerificationStatus,
} from '@/lib/hooks';
import { Avatar, Toggle } from '@/components/ui';
import { QueryError } from '@/components/query-error';
import { CheckIcon } from '@/components/icons';

function shortDate(iso?: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');
}

/**
 * Mi perfil. Todo lo que se ve aquí sale de la cuenta que entró: nombre,
 * edad, ciudad, completitud, verificaciones y plan. Antes leía la ficha de
 * demostración y una persona real veía a otra en su propio perfil.
 */
export default function ProfilePage() {
  const member = useCurrentMember();
  const session = useSession();
  const { pausedProfile } = useDemoStore();
  const pauseProfile = usePauseProfile();
  const { data: verification } = useVerificationStatus();
  const { data: myPhotos = [] } = useMyPhotos();
  const { data: subscription } = useSubscriptionState();
  const logout = useLogout();

  if (member.isError) {
    return (
      <div className="px-4 pt-6">
        <QueryError error={member.error} onRetry={() => void member.refetch()} />
      </div>
    );
  }
  if (!member.data) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }

  const user = member.data;
  const myPhotoUrl = myPhotos.find((photo) => photo.moderationStatus === 'APPROVED')?.url;
  const paused = DEMO_MODE
    ? pausedProfile
    : session.data && !session.data.demo && session.data.me.status === 'PAUSED';

  const contactOk = verification?.level1?.status === 'APPROVED';
  const identity = verification?.level2;
  const identityApproved = identity?.status === 'APPROVED';
  const endorsement = verification?.level3;
  const endorsed = endorsement?.status === 'APPROVED';
  const nextField = user.completenessNext
    ? (es.profile.fields[user.completenessNext.key] ?? user.completenessNext.key)
    : null;

  return (
    // En escritorio, dos columnas: a la izquierda quién soy y cómo voy
    // (verificación, plan); a la derecha los ajustes. En el teléfono, la
    // misma pantalla de la app, de arriba abajo.
    <div className="px-4 pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-8">
      <div>
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <Avatar name={user.displayName} size="l" photoUrl={myPhotoUrl} />
          <div>
            <h1 className="h-display text-[19px] lg:text-[24px]">
              {user.displayName}
              {user.age ? `, ${user.age}` : ''}
            </h1>
            <div className="text-xs text-muted">
              {[user.city, user.occupation].filter(Boolean).join(' · ') || es.profile.title}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {user.denomination ? (
                <span className="chip chip-olive">{user.denomination}</span>
              ) : null}
              <span className="chip chip-wheat">
                {user.intention === 'MARRIAGE'
                  ? es.discover.purposeMarriage
                  : user.intention === 'FRIENDSHIP'
                    ? es.onboarding.intentionFriendship
                    : es.onboarding.intentionBoth}
              </span>
            </div>
          </div>
        </div>

        {/* Completeness (RF-PER-10) */}
        <div className="card mt-3.5">
          <div className="flex items-center justify-between text-[12.5px]">
            <span>{es.profile.completeness}</span>
            <b>{user.completeness}%</b>
          </div>
          <div className="bar mt-1.5">
            <i style={{ width: `${user.completeness}%` }} />
          </div>
          <div className="mt-1.5 text-[11px] text-muted">
            {nextField && user.completenessNext
              ? es.profile.completenessHint(nextField, user.completenessNext.targetPct)
              : es.profile.complete}
          </div>
          {user.completeness < 100 ? (
            <Link
              href="/perfil/fotos"
              className="mt-2 inline-block text-[12px] font-semibold text-olive-text underline"
            >
              {es.onboarding.photosTitle} ›
            </Link>
          ) : null}
        </div>

        {/* Verification ladder (RF-VER-04) */}
        <h2 className="h-display mb-2 mt-1 text-[15px]">{es.profile.verification}</h2>
        <div className="card px-3.5 py-1.5">
          <div className="list-row">
            <StepMark done={contactOk} step={1} />
            <div className="flex-1">
              <b className="text-[12.5px]">{es.profile.verificationContact}</b>
              <div className="text-[11px] text-muted">
                {contactOk
                  ? es.profile.verificationContactDone
                  : es.profile.verificationContactPending}
              </div>
            </div>
          </div>
          <div className="list-row">
            <StepMark done={identityApproved} step={2} />
            <div className="flex-1">
              <b className="text-[12.5px]">{es.profile.verificationIdentity}</b>
              <div className="text-[11px] text-muted">
                {identityApproved
                  ? es.profile.verificationIdentityDone(shortDate(identity?.resolvedAt) ?? '')
                  : identity?.status === 'PENDING'
                    ? es.profile.verificationIdentityPending
                    : identity?.status === 'REJECTED'
                      ? es.profile.verificationIdentityRejected
                      : es.profile.verificationIdentityStart}
              </div>
            </div>
            {!identityApproved && identity?.status !== 'PENDING' ? (
              <Link href="/perfil/verificacion" className="btn btn-sm">
                {es.profile.obtain}
              </Link>
            ) : null}
          </div>
          <div className="list-row">
            <StepMark done={endorsed} step={3} />
            <div className="flex-1">
              <b className="text-[12.5px]">{es.profile.verificationChurch}</b>
              <div className="text-[11px] text-muted">
                {endorsed
                  ? es.profile.verificationChurchDone(
                      endorsement?.church?.name ?? user.churchName ?? '',
                    )
                  : endorsement?.status === 'PENDING'
                    ? es.church.inReview
                    : es.profile.verificationChurchHint}
              </div>
            </div>
            <Link href="/perfil/verificacion" className="btn btn-sm">
              {endorsed ? es.common.see : es.profile.obtain}
            </Link>
          </div>
        </div>

        {/* Plus / Oro card */}
        <Link
          href="/plus"
          className="card mt-3 flex items-center justify-between border-0 bg-ink text-white"
        >
          <div>
            <div className="h-display text-[15px] text-wheat">
              {subscription?.tier
                ? `Yugo ${subscription.tier === 'ORO' ? 'Oro' : 'Plus'}`
                : es.profile.plusOroCard}
            </div>
            <div className="text-[11px] text-ink-muted">
              {subscription?.tier
                ? `Activo${
                    subscription.renewsAt
                      ? ` · renueva el ${new Date(subscription.renewsAt).toLocaleDateString('es-DO')}`
                      : ''
                  }`
                : es.profile.plusOroSub}
            </div>
          </div>
          <span className="chip bg-wheat text-ink-deep">{es.common.see}</span>
        </Link>
      </div>

      <div>
        {/* Settings rows */}
        <div className="mt-1.5 lg:mt-0 lg:rounded-card lg:border lg:border-line lg:bg-white lg:px-3.5">
          <SettingsLink href="/perfil/fotos" label={es.onboarding.photosTitle} />
          <SettingsLink href="/perfil/preferencias" label={es.profile.searchPreferences} />
          <SettingsLink href="/perfil/visibilidad" label={es.visibility.title} />
          <SettingsLink href="/perfil/destacar" label="Perfil destacado" />
          <SettingsLink href="/perfil/promo" label="Código promocional" />
          <SettingsLink href="/perfil/acompanar" label={es.accompaniment.mentorTitle} />
          <SettingsLink href="/perfil/notificaciones" label={es.notifications.title} />
          <SettingsLink href="/perfil/privacidad" label={es.profile.privacySecurity} />
          <div className="list-row text-[12.5px]">
            <div>
              <span>{es.profile.pauseProfile}</span>
              {paused ? (
                <div className="text-[11px] text-muted">{es.profile.pausedHint}</div>
              ) : null}
            </div>
            <span className="ml-auto">
              <Toggle
                on={!!paused}
                onChange={(value) => pauseProfile.mutate(value)}
                label={es.profile.pauseProfile}
              />
            </span>
          </div>
          <Link href="/perfil/privacidad" className="list-row text-[12.5px] text-wine">
            <span>{es.profile.deleteAccount}</span>
            <span className="ml-auto text-muted">›</span>
          </Link>
          <button
            type="button"
            className="list-row w-full text-left text-[12.5px]"
            onClick={() => logout.mutate()}
          >
            {es.profile.signOut}
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted">
          <Link href="/legal/terminos" className="underline">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="underline">
            Privacidad
          </Link>
          <Link href="/legal/pacto" className="underline">
            Pacto de conducta
          </Link>
        </div>
        <p className="pb-6 pt-3 text-center text-[11px] text-muted">Yugo · {es.common.tagline}</p>
      </div>
    </div>
  );
}

function StepMark({ done, step }: { done: boolean; step: number }) {
  return done ? (
    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-olive text-white">
      <CheckIcon className="h-3 w-3" />
    </span>
  ) : (
    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-wheat text-[11px] font-bold text-ink-deep">
      {step}
    </span>
  );
}

function SettingsLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="list-row text-[12.5px]">
      <span>{label}</span>
      <span className="ml-auto text-muted">›</span>
    </Link>
  );
}
