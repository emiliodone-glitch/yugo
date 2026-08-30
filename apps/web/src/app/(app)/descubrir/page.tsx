'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { demoDiscover, es, LIMITS } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { AffinityRing, EndorsedBadge, PhotoPlaceholder } from '@/components/ui';
import { FilterIcon, PersonSilhouette, StarIcon } from '@/components/icons';

const CARD_GRADIENTS = [
  'linear-gradient(160deg,#C9C1B1,#8E8A80)',
  'linear-gradient(160deg,#B8AE9C,#7C766C)',
  'linear-gradient(160deg,#C4B8A4,#867F72)',
];

export default function DiscoverPage() {
  const router = useRouter();
  const {
    interestsUsed,
    interestsLimit,
    sentInterests,
    passedProfiles,
    markInterest,
    passProfile,
    saveProfile,
    savedProfiles,
  } = useDemoStore();
  const [showFilters, setShowFilters] = useState(false);

  const visible = demoDiscover.filter((p) => !passedProfiles[p.userId]);
  const remaining = interestsLimit === null ? null : Math.max(0, interestsLimit - interestsUsed);

  const handleInterest = (userId: string) => {
    const result = markInterest(userId);
    if (result === 'limit') router.push('/plus');
  };

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-1.5">
        <h1 className="h-display text-[19px]">{es.discover.title}</h1>
        <div className="flex items-center gap-2">
          <span className="chip">
            {remaining === null ? es.discover.interestsUnlimited : es.discover.interestsLeft(remaining)}
          </span>
          <button
            type="button"
            aria-label={es.discover.filters}
            onClick={() => setShowFilters((v) => !v)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white"
          >
            <FilterIcon className="h-[17px] w-[17px] text-ink" />
          </button>
        </div>
      </div>

      {showFilters ? (
        <div className="card mb-3 p-3">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[13px]">{es.discover.filters}</b>
            <Link href="/perfil/preferencias" className="text-xs text-muted underline">
              {es.profile.searchPreferences}
            </Link>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip">Edad 26–38</span>
            <span className="chip">≤ 50 km</span>
            <span className="chip">{es.onboarding.intentionMarriage}</span>
            <span className="chip chip-wheat">{es.discover.advancedFilters} · Plus</span>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="card py-10 text-center text-sm text-muted">{es.discover.emptyToday}</div>
      ) : (
        visible.map((profile, index) => {
          const sent = sentInterests[profile.userId];
          return (
            <article key={profile.userId} className="card mb-3 overflow-hidden p-0">
              <Link href={`/descubrir/${profile.userId}`} className="block">
                <PhotoPlaceholder
                  className="h-[250px]"
                  gradient={CARD_GRADIENTS[index % CARD_GRADIENTS.length]}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <PersonSilhouette className="h-[72px] w-[72px] text-white/45" />
                  </div>
                  {profile.badges.endorsedBy ? (
                    <div className="absolute left-3 top-3">
                      <EndorsedBadge
                        label={
                          profile.gender === 'FEMALE'
                            ? es.discover.endorsedBadge
                            : es.discover.endorsedBadgeM
                        }
                      />
                    </div>
                  ) : null}
                  <div className="absolute bottom-3 right-3">
                    <AffinityRing value={profile.affinity.total} />
                  </div>
                  <div className="absolute bottom-3.5 left-3.5 text-white">
                    <div className="font-display text-2xl font-semibold">
                      {profile.displayName}, {profile.age}
                    </div>
                    <div className="text-xs opacity-90">
                      {profile.city} · {profile.distanceLabel}
                      {profile.occupation ? ` · ${profile.occupation}` : ''}
                    </div>
                  </div>
                </PhotoPlaceholder>
              </Link>
              <div className="p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  <span className="chip chip-olive">{profile.denomination}</span>
                  {profile.churchName ? <span className="chip">{profile.churchName}</span> : null}
                  {profile.intention === 'MARRIAGE' ? (
                    <span className="chip chip-wheat">{es.discover.purposeMarriage}</span>
                  ) : null}
                </div>
                {profile.testimony ? (
                  <p className="mt-2.5 text-[12.5px] leading-normal">{profile.testimony}</p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-ghost flex-1"
                    onClick={() => passProfile(profile.userId)}
                  >
                    {es.discover.pass}
                  </button>
                  <button
                    type="button"
                    disabled={sent}
                    className={`btn flex-[1.6] ${sent ? 'bg-olive-text' : 'btn-olive'}`}
                    onClick={() => handleInterest(profile.userId)}
                  >
                    {sent ? es.discover.interestSent : es.discover.interested}
                  </button>
                </div>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-muted"
                  onClick={() => saveProfile(profile.userId)}
                >
                  <StarIcon
                    className={`h-3 w-3 ${savedProfiles[profile.userId] ? 'text-wheat' : 'text-line'}`}
                  />
                  {savedProfiles[profile.userId] ? 'Guardado' : es.discover.saveForLater}
                </button>
              </div>
            </article>
          );
        })
      )}

      <p className="pb-4 pt-1 text-center text-xs text-muted">
        {es.discover.listProgress(visible.length, LIMITS.DISCOVER_PER_DAY_FREE)}
      </p>
    </div>
  );
}
