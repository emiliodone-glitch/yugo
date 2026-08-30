'use client';

import Link from 'next/link';
import { useState } from 'react';
import { demoCurrentUser, es, LIMITS } from '@yugo/shared';
import { ChevronLeft } from '@/components/icons';

/** Search preferences (RF-PER-08): mandatory age range, distance, intention. */
export default function PreferencesPage() {
  const [ageMin, setAgeMin] = useState(demoCurrentUser.ageMin);
  const [ageMax, setAgeMax] = useState(demoCurrentUser.ageMax);
  const [distance, setDistance] = useState(demoCurrentUser.maxDistanceKm);
  const [intention, setIntention] = useState<'MARRIAGE' | 'FRIENDSHIP' | 'BOTH'>('MARRIAGE');
  const [minVerification, setMinVerification] = useState(2);
  const [saved, setSaved] = useState(false);

  const spanError = ageMax - ageMin < LIMITS.AGE_RANGE_MIN_SPAN;

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
        <h1 className="h-display text-[19px]">{es.profile.searchPreferences}</h1>
      </div>

      <div className="mb-1 mt-1.5 flex items-center justify-between">
        <h2 className="h-display text-[15px]">{es.onboarding.ageRange}</h2>
        <span className="chip">{es.common.required}</span>
      </div>
      <div className="card p-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{es.visibility.wantToMeet}</span>
          <b>{es.onboarding.ageRangeValue(ageMin, ageMax)}</b>
        </div>
        <div className="my-2.5 flex items-center gap-3">
          <label className="flex-1 text-[11px] text-muted">
            Mínima
            <input
              type="number"
              min={LIMITS.ADULT_AGE}
              max={ageMax - LIMITS.AGE_RANGE_MIN_SPAN}
              value={ageMin}
              onChange={(event) => setAgeMin(Math.max(LIMITS.ADULT_AGE, Number(event.target.value)))}
              className="field mt-1"
            />
          </label>
          <label className="flex-1 text-[11px] text-muted">
            Máxima
            <input
              type="number"
              min={ageMin + LIMITS.AGE_RANGE_MIN_SPAN}
              max={99}
              value={ageMax}
              onChange={(event) => setAgeMax(Number(event.target.value))}
              className="field mt-1"
            />
          </label>
        </div>
        {spanError ? (
          <div className="text-[11px] text-wine">{es.errors.ageRangeSpan}</div>
        ) : (
          <div className="text-[11px] text-muted">{es.onboarding.ageRangeHelp}</div>
        )}
      </div>

      <div className="card p-3">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{es.onboarding.maxDistance}</span>
          <b>{distance} km</b>
        </div>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={distance}
          onChange={(event) => setDistance(Number(event.target.value))}
          className="mt-2 w-full accent-ink"
          aria-label={es.onboarding.maxDistance}
        />
      </div>

      <div className="card p-3">
        <div className="mb-2 text-[12.5px] font-semibold">{es.onboarding.intentionTitle}</div>
        <div className="flex flex-wrap gap-1.5">
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
              onClick={() => setIntention(value)}
              className={`chip ${intention === value ? 'chip-olive ring-1 ring-olive' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="card p-3">
        <div className="mb-2 text-[12.5px] font-semibold">Nivel de verificación mínimo</div>
        <div className="flex gap-1.5">
          {[1, 2, 3].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setMinVerification(level)}
              className={`chip ${minVerification === level ? 'chip-olive ring-1 ring-olive' : ''}`}
            >
              Nivel {level}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        disabled={spanError}
        onClick={() => setSaved(true)}
        className="btn btn-olive mt-2"
      >
        {saved ? 'Guardado ✓' : es.common.save}
      </button>
      <p className="pb-6 pt-2 text-center text-[11px] text-muted">
        Al cambiar tu rango, la lista de Descubrir se regenera.
      </p>
    </div>
  );
}
