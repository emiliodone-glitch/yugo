'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { es, LIMITS } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { CITIES } from '@/lib/cities';
import {
  useCurrentMember,
  useSetInvisibleMode,
  useSetOroBadge,
  useSetTravelMode,
  useSubscriptionState,
  useUpdatePreferences,
  useWhoViewedMe,
} from '@/lib/hooks';
import { Toggle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');
}

/**
 * Visibilidad y búsqueda: la regla mutua de edad (obligatoria) y los
 * controles de Oro (modo invisible, modo viaje, quién me vio, insignia).
 * Todo lee y escribe la cuenta real; en demo, el almacén de la demo.
 */
export default function VisibilityPage() {
  const member = useCurrentMember();
  const savePrefs = useUpdatePreferences();
  const { data: subscription } = useSubscriptionState();
  const setInvisible = useSetInvisibleMode();
  const setOroBadge = useSetOroBadge();
  const setTravel = useSetTravelMode();
  const whoViewed = useWhoViewedMe();

  const invisibleMode = subscription?.invisibleMode ?? false;
  const isOro = subscription?.tier === 'ORO';
  const travel = subscription?.travelMode ?? null;

  const [ageMin, setAgeMin] = useState(LIMITS.ADULT_AGE + 4);
  const [ageMax, setAgeMax] = useState(LIMITS.ADULT_AGE + 16);
  const [seeded, setSeeded] = useState(false);
  const [savedRange, setSavedRange] = useState(false);
  const [travelCity, setTravelCity] = useState(CITIES[0].name);
  const [travelDays, setTravelDays] = useState(14);

  useEffect(() => {
    if (seeded || !member.data) return;
    setAgeMin(member.data.ageMin);
    setAgeMax(member.data.ageMax);
    setSeeded(true);
  }, [member.data, seeded]);

  const dirty = !!member.data && (ageMin !== member.data.ageMin || ageMax !== member.data.ageMax);
  const clampMin = (value: number) =>
    setAgeMin(Math.max(LIMITS.ADULT_AGE, Math.min(value, ageMax - LIMITS.AGE_RANGE_MIN_SPAN)));
  const clampMax = (value: number) =>
    setAgeMax(Math.min(99, Math.max(value, ageMin + LIMITS.AGE_RANGE_MIN_SPAN)));

  const saveRange = async () => {
    setSavedRange(false);
    await savePrefs.mutateAsync({ ageMin, ageMax });
    setSavedRange(true);
  };

  const toggleTravel = (on: boolean) => {
    if (!on) {
      setTravel.mutate(null);
      return;
    }
    const city = CITIES.find((item) => item.name === travelCity) ?? CITIES[0];
    setTravel.mutate({ city: city.name, lat: city.lat, lng: city.lng, days: travelDays });
  };

  const error = savePrefs.error ?? setInvisible.error ?? setOroBadge.error ?? setTravel.error;

  return (
    <div className="pb-6">
      <PageHeader title={es.visibility.title} backHref="/perfil" />
      <div className="px-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div>
          {/* Mandatory mutual age range (RF-DES-11) */}
          <div className="mb-1 mt-1.5 flex items-center justify-between">
            <h2 className="h-display text-[15px]">{es.visibility.ageRange}</h2>
            <span className="chip">{es.visibility.mandatory}</span>
          </div>
          <div className="card p-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span>{es.visibility.wantToMeet}</span>
              <b>{es.onboarding.ageRangeValue(ageMin, ageMax)}</b>
            </div>
            <div className="my-3 flex items-center gap-3">
              <input
                type="range"
                min={LIMITS.ADULT_AGE}
                max={80}
                value={ageMin}
                onChange={(event) => clampMin(Number(event.target.value))}
                className="flex-1 accent-ink"
                aria-label="Edad mínima"
              />
              <input
                type="range"
                min={LIMITS.ADULT_AGE}
                max={80}
                value={ageMax}
                onChange={(event) => clampMax(Number(event.target.value))}
                className="flex-1 accent-ink"
                aria-label="Edad máxima"
              />
            </div>
            <div className="text-[11px] text-muted">{es.visibility.ageRuleHelp}</div>
            <div className="mt-2.5 flex items-center gap-3">
              <button
                type="button"
                className="btn btn-sm btn-olive w-auto px-5"
                disabled={!dirty || savePrefs.isPending}
                onClick={() => void saveRange()}
              >
                {savePrefs.isPending ? es.common.loading : es.common.save}
              </button>
              {savedRange && !dirty ? (
                <span className="text-[11px] text-olive-text">{es.profile.savedPreferences}</span>
              ) : null}
            </div>
          </div>

          {/* Who viewed me — Oro (RF-DES-15) */}
          <div className="card p-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span>{es.visibility.whoViewedMe}</span>
              {whoViewed.data?.available ? (
                <b>{whoViewed.data.count}</b>
              ) : (
                <Link href="/plus" className="chip chip-wheat">
                  {es.visibility.whoViewedOroOnly}
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="lg:pt-9">
          {/* Invisible mode — Oro (RF-DES-12, RF-PLU-08) */}
          <div className="mb-1 flex items-center justify-between lg:mt-0">
            <h2 className="h-display text-[15px]">{es.visibility.invisibleMode}</h2>
            <span className="chip chip-wheat">{es.visibility.oroChip}</span>
          </div>
          <div className="card border-[1.5px] border-wheat p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <b className="text-[12.5px]">
                  {invisibleMode ? es.visibility.invisibleOn : 'Desactivado'}
                </b>
                <div className="text-[11px] text-muted">{es.visibility.invisibleHelp}</div>
                {!isOro ? (
                  <div className="mt-1 text-[11px] text-wheat-text">
                    {es.visibility.oroOnlyHint}
                  </div>
                ) : null}
              </div>
              <Toggle
                on={invisibleMode}
                onChange={(value) => setInvisible.mutate(value)}
                disabled={!isOro}
                label={es.visibility.invisibleMode}
              />
            </div>
          </div>

          {/* Travel mode — Oro (RF-DES-14) */}
          <div className="mb-1 mt-2 flex items-center justify-between">
            <h2 className="h-display text-[15px]">{es.visibility.travelMode}</h2>
            <span className="chip chip-wheat">{es.visibility.oroChip}</span>
          </div>
          <div className="card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <b className="text-[12.5px]">{es.visibility.travelSearch}</b>
                <div className="text-[11px] text-muted">
                  {travel
                    ? es.visibility.travelActive(
                        travel.city,
                        travel.activeUntil ? shortDate(travel.activeUntil) : '—',
                      )
                    : es.visibility.travelOff}
                </div>
                {!isOro ? (
                  <div className="mt-1 text-[11px] text-wheat-text">
                    {es.visibility.oroOnlyHint}
                  </div>
                ) : null}
              </div>
              <Toggle
                on={!!travel}
                onChange={toggleTravel}
                disabled={!isOro}
                label={es.visibility.travelMode}
              />
            </div>
            {isOro && !travel ? (
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                <label className="text-[11px] text-muted">
                  {es.visibility.travelPick}
                  <select
                    className="field mt-1"
                    value={travelCity}
                    onChange={(event) => setTravelCity(event.target.value)}
                  >
                    {CITIES.map((city) => (
                      <option key={city.name} value={city.name}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-[11px] text-muted">
                  {es.visibility.travelDays(travelDays)}
                  <select
                    className="field mt-1"
                    value={travelDays}
                    onChange={(event) => setTravelDays(Number(event.target.value))}
                  >
                    {[7, 14, 30].map((days) => (
                      <option key={days} value={days}>
                        {days}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
          </div>

          {/* Oro badge opt-in */}
          <div className="card p-3">
            <div className="flex items-center justify-between text-[12.5px]">
              <span>{es.visibility.showOroBadge}</span>
              <Toggle
                on={subscription?.showOroBadge ?? false}
                onChange={(value) => setOroBadge.mutate(value)}
                disabled={!isOro}
                label={es.visibility.showOroBadge}
              />
            </div>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine"
            >
              {errorMessage(error)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
