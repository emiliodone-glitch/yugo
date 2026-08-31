'use client';

/**
 * El otro lado del acompañamiento: lo que ve el matrimonio que acompaña.
 *
 * The whole screen is one honest sentence made visible — you see what stage
 * they are in, and you do not see what they write. There is no tab, no
 * "ver conversación", no unread badge, because the API has no endpoint that
 * would answer one.
 */
import { useState } from 'react';
import { es, type RelationshipStage } from '@yugo/shared';
import {
  useAccompaniedBonds,
  useEnableMentor,
  useMentorProfile,
  useRespondToAccompaniment,
} from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

const stageName = (stage: RelationshipStage) => es.relationship.stages[stage];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });

export default function AccompanyPage() {
  const { data: profile, isLoading: profileLoading } = useMentorProfile();
  const { data: bonds = [], isLoading } = useAccompaniedBonds();
  const respond = useRespondToAccompaniment();
  const enable = useEnableMentor();

  const [spouseName, setSpouseName] = useState('');
  const [marriedSince, setMarriedSince] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);

  const pending = bonds.filter((bond) => bond.status === 'INVITED');
  const active = bonds.filter((bond) => bond.status === 'ACTIVE');

  const enableMentor = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await enable.mutateAsync({
        spouseName: spouseName.trim() || undefined,
        marriedSince: marriedSince ? Number(marriedSince) : undefined,
        bio: bio.trim() || undefined,
      });
    } catch (cause) {
      const key = cause instanceof Error ? cause.message : 'generic';
      setError(
        key === 'needs_church_endorsement'
          ? es.accompaniment.mentorNeedsEndorsement
          : es.errors.generic,
      );
    }
  };

  return (
    <div className="pb-24">
      <PageHeader title={es.accompaniment.mentorTitle} backHref="/perfil" />
      <div className="px-4">
        <p className="mb-3 text-[12px] text-muted">{es.accompaniment.mentorIntro}</p>

        {profileLoading ? (
          <div className="card py-6 text-center text-sm text-muted">{es.common.loading}</div>
        ) : profile ? (
          <div className="card mb-3 border-0 bg-olive-soft">
            <div className="text-[11px] font-semibold text-olive-text">
              {es.accompaniment.mentorCodeIntro}
            </div>
            <div className="mt-1 font-display text-[22px] tracking-wide text-ink">
              {profile.code}
            </div>
            {profile.spouseName ? (
              <div className="text-[11px] text-olive-text">
                {profile.spouseName}
                {profile.marriedSince
                  ? ` · ${es.accompaniment.marriedSince(profile.marriedSince)}`
                  : ''}
              </div>
            ) : null}
          </div>
        ) : (
          <form className="card mb-3" onSubmit={enableMentor}>
            <div className="mb-1.5 text-[12.5px] font-semibold">{es.accompaniment.mentorEnable}</div>
            <p className="mb-2 text-[11px] text-muted">{es.accompaniment.mentorNeedsEndorsement}</p>

            <label className="mb-1 block text-[11px] text-muted" htmlFor="spouse">
              {es.accompaniment.spouseName}
            </label>
            <input
              id="spouse"
              className="field mb-2 w-full"
              value={spouseName}
              onChange={(event) => setSpouseName(event.target.value)}
            />

            <label className="mb-1 block text-[11px] text-muted" htmlFor="married-since">
              {es.accompaniment.marriedSinceLabel}
            </label>
            <input
              id="married-since"
              className="field mb-2 w-full"
              inputMode="numeric"
              value={marriedSince}
              onChange={(event) => setMarriedSince(event.target.value.replace(/\D/g, ''))}
              maxLength={4}
            />

            <label className="mb-1 block text-[11px] text-muted" htmlFor="mentor-bio">
              {es.accompaniment.bioLabel}
            </label>
            <textarea
              id="mentor-bio"
              className="field mb-2 w-full"
              rows={3}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={400}
            />

            <button type="submit" className="btn btn-sm" disabled={enable.isPending}>
              {es.accompaniment.mentorEnable}
            </button>
            {error ? <p className="mt-1.5 text-[11px] text-wine">{error}</p> : null}
          </form>
        )}

        {pending.length > 0 ? (
          <>
            <div className="mb-1.5 mt-4 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
              {es.accompaniment.pendingInvitation.toUpperCase()}
            </div>
            {pending.map((bond) => (
              <div key={bond.id} className="card mb-2 border-[1.5px] border-wheat">
                <b className="text-[12.5px]">{bond.names.join(' y ')}</b>
                <div className="text-[11px] text-muted">
                  {bond.churches.filter(Boolean).join(' · ')}
                </div>
                <div className="mt-1 text-[11px] text-muted">{stageName(bond.stage)}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: bond.id, accept: true })}
                  >
                    {es.accompaniment.accept}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    disabled={respond.isPending}
                    onClick={() => respond.mutate({ id: bond.id, accept: false })}
                  >
                    {es.accompaniment.decline}
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : null}

        <div className="mb-1.5 mt-4 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
          {es.accompaniment.mentorTitle.toUpperCase()}
        </div>
        {isLoading ? (
          <div className="card py-6 text-center text-sm text-muted">{es.common.loading}</div>
        ) : active.length === 0 ? (
          <div className="card py-6 text-center text-sm text-muted">
            {es.accompaniment.mentorEmpty}
          </div>
        ) : (
          active.map((bond) => (
            <div key={bond.id} className="card mb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <b className="text-[12.5px]">{bond.names.join(' y ')}</b>
                  <div className="text-[11px] text-muted">
                    {bond.churches.filter(Boolean).join(' · ')}
                  </div>
                </div>
                <span className="chip chip-wheat">{stageName(bond.stage)}</span>
              </div>
              {bond.since ? (
                <div className="mt-1.5 text-[11px] text-muted">
                  {es.accompaniment.since(formatDate(bond.since))}
                </div>
              ) : null}
            </div>
          ))
        )}

        {/* Se dice en la pantalla, no solo en la documentación. */}
        <p className="mt-3 rounded-field bg-olive-soft px-3 py-2 text-[11px] text-olive-text">
          {es.accompaniment.neverSeesChat}
        </p>
      </div>
    </div>
  );
}
