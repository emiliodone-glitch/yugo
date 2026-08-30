'use client';

import Link from 'next/link';
import { useState } from 'react';
import { demoCurrentUser, es, LIMITS } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { Toggle } from '@/components/ui';
import { ChevronLeft } from '@/components/icons';

/** Visibilidad y búsqueda (mockup 12): mutual age rule + Oro controls. */
export default function VisibilityPage() {
  const {
    invisibleMode,
    setInvisibleMode,
    travelModeOn,
    setTravelMode,
    showOroBadge,
    setShowOroBadge,
  } = useDemoStore();
  const [ageMin, setAgeMin] = useState(demoCurrentUser.ageMin);
  const [ageMax, setAgeMax] = useState(demoCurrentUser.ageMax);
  const travel = demoCurrentUser.subscription.travelMode;

  const clampMin = (value: number) =>
    setAgeMin(Math.max(LIMITS.ADULT_AGE, Math.min(value, ageMax - LIMITS.AGE_RANGE_MIN_SPAN)));
  const clampMax = (value: number) =>
    setAgeMax(Math.min(99, Math.max(value, ageMin + LIMITS.AGE_RANGE_MIN_SPAN)));

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center gap-2 pb-1.5">
        <Link
          href="/perfil"
          aria-label={es.common.back}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white"
        >
          <ChevronLeft className="h-4 w-4 text-ink" />
        </Link>
        <h1 className="h-display text-[19px]">{es.visibility.title}</h1>
      </div>

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
      </div>

      {/* Invisible mode — Oro (RF-DES-12, RF-PLU-08) */}
      <div className="mb-1 mt-2 flex items-center justify-between">
        <h2 className="h-display text-[15px]">{es.visibility.invisibleMode}</h2>
        <span className="chip chip-wheat">{es.visibility.oroChip}</span>
      </div>
      <div className="card border-[1.5px] border-wheat p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <b className="text-[12.5px]">{invisibleMode ? es.visibility.invisibleOn : 'Desactivado'}</b>
            <div className="text-[11px] text-muted">{es.visibility.invisibleHelp}</div>
          </div>
          <Toggle on={invisibleMode} onChange={setInvisibleMode} label={es.visibility.invisibleMode} />
        </div>
        {invisibleMode ? (
          <div className="mt-2.5 flex gap-2">
            <span className="chip chip-olive">{es.visibility.visibleFor(4)}</span>
            <span className="chip">{es.visibility.expiresIn(212)}</span>
          </div>
        ) : null}
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
              {travel ? `${travel.city} · hasta el 15 sep` : 'Sin destino configurado'}
            </div>
          </div>
          <Toggle on={travelModeOn} onChange={setTravelMode} label={es.visibility.travelMode} />
        </div>
      </div>

      {/* Who viewed me — Oro (RF-DES-15) */}
      <div className="card p-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{es.visibility.whoViewedMe}</span>
          <b>27 ›</b>
        </div>
      </div>

      {/* Oro badge opt-in */}
      <div className="card p-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{es.visibility.showOroBadge}</span>
          <Toggle on={showOroBadge} onChange={setShowOroBadge} label={es.visibility.showOroBadge} />
        </div>
      </div>
    </div>
  );
}
