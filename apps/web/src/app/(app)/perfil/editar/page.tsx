'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ATTENDANCE_OPTIONS,
  CITIES,
  DENOMINATIONS,
  es,
  LIMITS,
  SERVICE_AREAS,
  type ProfileUpdateInput,
} from '@yugo/shared';
import { errorMessage, getApiClient } from '@/lib/api';
import { useCurrentMember, useMyProfile, useUpdateProfile } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';
import { QueryError } from '@/components/query-error';

type Attendance = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'OCCASIONAL';
type Intention = 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';
type Openness = 'SAME' | 'AFFINE' | 'ALL';

interface Draft {
  displayName: string;
  city: string;
  occupation: string;
  denomination: string | null;
  churchFreeText: string;
  yearsInFaith: string;
  attendance: Attendance | null;
  intention: Intention | null;
  openness: Openness | null;
  testimony: string;
  verse: string;
  practices: string[];
}

/**
 * Completa tu perfil (RF-PER-01/10): todo lo que el registro corto dejó
 * para después, en una sola página y todo opcional. Cada sección dice qué
 * alimenta, y la barra de completitud del perfil recoge el resultado.
 */
export default function EditProfilePage() {
  const profile = useMyProfile();
  const member = useCurrentMember();
  const update = useUpdateProfile();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // En modo demo no hay perfil completo en la API: se parte de la ficha del
  // miembro actual para que la pantalla se pueda recorrer igual.
  useEffect(() => {
    if (draft || profile.data || profile.isLoading || !member.data) return;
    const m = member.data;
    setDraft({
      displayName: m.displayName,
      city: m.city ?? '',
      occupation: m.occupation ?? '',
      denomination: DENOMINATIONS.find((item) => item.name === m.denomination)?.slug ?? null,
      churchFreeText: m.churchName ?? '',
      yearsInFaith: '',
      attendance: null,
      intention: m.intention,
      openness: null,
      testimony: m.testimony ?? '',
      verse: m.verse ?? '',
      practices: [],
    });
  }, [draft, profile.data, profile.isLoading, member.data]);

  useEffect(() => {
    if (draft || !profile.data) return;
    const p = profile.data;
    setDraft({
      displayName: p.displayName ?? '',
      city: p.city ?? '',
      occupation: p.occupation ?? '',
      denomination: p.denomination?.slug ?? null,
      churchFreeText: p.church?.name ?? p.churchFreeText ?? '',
      yearsInFaith: p.yearsInFaith != null ? String(p.yearsInFaith) : '',
      attendance: (p.attendance as Attendance | null) ?? null,
      intention: p.intention,
      openness: p.openness,
      testimony: p.testimony ?? '',
      verse: p.verse ?? '',
      practices: (p.serviceAreas ?? []).map((item) => item.serviceArea.slug),
    });
  }, [profile.data, draft]);

  const patch = (partial: Partial<Draft>) => {
    setSaved(false);
    setDraft((current) => (current ? { ...current, ...partial } : current));
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    try {
      let denominationId: string | undefined;
      if (draft.denomination) {
        const denominations = await getApiClient()
          .catalog.denominations()
          .catch(() => []);
        denominationId = denominations.find((item) => item.slug === draft.denomination)?.id;
      }
      const input: ProfileUpdateInput = {
        displayName: draft.displayName.trim() || undefined,
        city: draft.city.trim() || undefined,
        occupation: draft.occupation.trim(),
        denominationId,
        churchFreeText: draft.churchFreeText.trim(),
        yearsInFaith: draft.yearsInFaith ? Number(draft.yearsInFaith) : undefined,
        attendance: draft.attendance ?? undefined,
        intention: draft.intention ?? undefined,
        openness: draft.openness ?? undefined,
        testimony: draft.testimony.trim(),
        verse: draft.verse.trim(),
        practiceSlugs: draft.practices,
      };
      await update.mutateAsync(input);
      setSaved(true);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  if (profile.isError) {
    return (
      <div className="px-4 pt-6">
        <QueryError error={profile.error} onRetry={() => void profile.refetch()} />
      </div>
    );
  }
  if (!draft) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }

  const chip = (active: boolean) => `chip ${active ? 'chip-olive ring-1 ring-olive' : ''}`;

  return (
    <div className="pb-8">
      <PageHeader title={es.profile.editTitle} backHref="/perfil" />
      <div className="px-4">
        <Link
          href="/perfil/voz"
          className="card flex items-center justify-between gap-3 border-olive/30 bg-olive-soft hover:bg-olive-soft/80"
        >
          <span>
            <b className="block text-[13px] text-olive-text">{es.profile.voiceLink}</b>
            <span className="text-[12px] text-olive-text/80">{es.profile.voiceLinkHint}</span>
          </span>
          <span aria-hidden className="text-olive-text">
            ›
          </span>
        </Link>
      </div>
      <div className="px-4">
        <p className="mb-3 text-[12.5px] text-muted">{es.profile.editSub}</p>

        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
          <div>
            <h2 className="h-display mb-2 text-[15px]">{es.profile.editBasics}</h2>
            <div className="card">
              <label className="mb-1 block text-[12px] text-muted" htmlFor="displayName">
                {es.onboarding.displayName}
              </label>
              <input
                id="displayName"
                className="field mb-3"
                maxLength={40}
                value={draft.displayName}
                onChange={(event) => patch({ displayName: event.target.value })}
              />
              <label className="mb-1 block text-[12px] text-muted" htmlFor="city">
                {es.onboarding.cityLabel}
              </label>
              <input
                id="city"
                className="field mb-3"
                list="yugo-cities"
                maxLength={80}
                value={draft.city}
                onChange={(event) => patch({ city: event.target.value })}
              />
              <datalist id="yugo-cities">
                {CITIES.map((city) => (
                  <option key={city.name} value={city.name} />
                ))}
              </datalist>
              <label className="mb-1 block text-[12px] text-muted" htmlFor="occupation">
                {es.profile.fields.occupation.charAt(0).toUpperCase() +
                  es.profile.fields.occupation.slice(1)}
              </label>
              <input
                id="occupation"
                className="field"
                maxLength={80}
                value={draft.occupation}
                onChange={(event) => patch({ occupation: event.target.value })}
              />
            </div>

            <h2 className="h-display mb-2 mt-4 text-[15px]">{es.profile.editFaith}</h2>
            <div className="card">
              <div className="mb-2 text-[12px] text-muted">{es.onboarding.denomination}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {DENOMINATIONS.map((item) => (
                  <button
                    key={item.slug}
                    type="button"
                    className={chip(draft.denomination === item.slug)}
                    onClick={() =>
                      patch({ denomination: draft.denomination === item.slug ? null : item.slug })
                    }
                  >
                    {item.name}
                  </button>
                ))}
              </div>
              <label className="mb-1 block text-[12px] text-muted" htmlFor="church">
                {es.onboarding.church}
              </label>
              <input
                id="church"
                className="field mb-3"
                maxLength={120}
                placeholder={es.onboarding.churchFreeText}
                value={draft.churchFreeText}
                onChange={(event) => patch({ churchFreeText: event.target.value })}
              />
              <label className="mb-1 block text-[12px] text-muted" htmlFor="years">
                {es.onboarding.yearsInFaith}
              </label>
              <input
                id="years"
                className="field mb-3"
                type="number"
                min={0}
                max={90}
                value={draft.yearsInFaith}
                onChange={(event) => patch({ yearsInFaith: event.target.value })}
              />
              <div className="mb-2 text-[12px] text-muted">{es.onboarding.attendance}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {ATTENDANCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={chip(draft.attendance === option.value)}
                    onClick={() => patch({ attendance: option.value as Attendance })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="mb-2 text-[12px] text-muted">{es.onboarding.intentionTitle}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(
                  [
                    ['MARRIAGE', es.onboarding.intentionMarriage],
                    ['FRIENDSHIP', es.onboarding.intentionFriendship],
                    ['BOTH', es.onboarding.intentionBoth],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={chip(draft.intention === value)}
                    onClick={() => patch({ intention: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="mb-2 text-[12px] text-muted">{es.onboarding.opennessTitle}</div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['SAME', es.onboarding.opennessSame],
                    ['AFFINE', es.onboarding.opennessAffine],
                    ['ALL', es.onboarding.opennessAll],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={chip(draft.openness === value)}
                    onClick={() => patch({ openness: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h2 className="h-display mb-2 text-[15px] lg:mt-0">{es.profile.editStory}</h2>
            <div className="card">
              <label className="mb-1 block text-[12px] text-muted" htmlFor="testimony">
                {es.onboarding.testimonyTitle}
              </label>
              <p className="mb-2 text-[11px] text-muted">{es.onboarding.testimonySub}</p>
              <textarea
                id="testimony"
                className="field mb-1 h-32 resize-none"
                maxLength={LIMITS.TESTIMONY_MAX}
                value={draft.testimony}
                onChange={(event) => patch({ testimony: event.target.value })}
              />
              <div className="mb-3 text-right text-[11px] text-muted">
                {draft.testimony.length}/{LIMITS.TESTIMONY_MAX}
              </div>
              <label className="mb-1 block text-[12px] text-muted" htmlFor="verse">
                {es.onboarding.verse}
              </label>
              <input
                id="verse"
                className="field mb-3"
                maxLength={120}
                placeholder="Rut 1:16"
                value={draft.verse}
                onChange={(event) => patch({ verse: event.target.value })}
              />
              <div className="mb-1 text-[12px] text-muted">{es.onboarding.practicesTitle}</div>
              <p className="mb-2 text-[11px] text-muted">{es.onboarding.practicesSub}</p>
              <div className="flex flex-wrap gap-1.5">
                {SERVICE_AREAS.map((area) => {
                  const active = draft.practices.includes(area.slug);
                  return (
                    <button
                      key={area.slug}
                      type="button"
                      className={chip(active)}
                      onClick={() =>
                        patch({
                          practices: active
                            ? draft.practices.filter((slug) => slug !== area.slug)
                            : [...draft.practices, area.slug],
                        })
                      }
                    >
                      {area.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="mt-3 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine"
              >
                {error}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-olive mt-4 lg:w-auto lg:px-8"
              disabled={update.isPending}
              onClick={() => void save()}
            >
              {update.isPending
                ? es.common.loading
                : saved
                  ? `${es.profile.editSaved} ✓`
                  : es.common.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
