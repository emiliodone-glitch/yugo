'use client';

import { useEffect, useState } from 'react';
import { es, LIMITS, type Intention } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useCurrentMember, useUpdatePreferences } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

/**
 * Preferencias de búsqueda (RF-PER-08): rango de edad obligatorio, distancia,
 * intención y nivel mínimo de verificación. Parte de lo que la cuenta tiene
 * guardado y lo escribe en la API; Descubrir se regenera con el cambio.
 */
export default function PreferencesPage() {
  const member = useCurrentMember();
  const save = useUpdatePreferences();

  const [ageMin, setAgeMin] = useState(LIMITS.ADULT_AGE + 4);
  const [ageMax, setAgeMax] = useState(LIMITS.ADULT_AGE + 16);
  const [distance, setDistance] = useState(50);
  const [intention, setIntention] = useState<Intention>('MARRIAGE');
  const [minVerification, setMinVerification] = useState(1);
  const [seeded, setSeeded] = useState(false);
  const [saved, setSaved] = useState(false);

  // El formulario arranca con lo guardado, una sola vez: después manda lo
  // que la persona toca, aunque la consulta se refresque por detrás.
  useEffect(() => {
    if (seeded || !member.data) return;
    setAgeMin(member.data.ageMin);
    setAgeMax(member.data.ageMax);
    setDistance(member.data.maxDistanceKm);
    setIntention(member.data.intention);
    setMinVerification(member.data.minVerificationLevel ?? 1);
    setSeeded(true);
  }, [member.data, seeded]);

  const spanError = ageMax - ageMin < LIMITS.AGE_RANGE_MIN_SPAN;

  const submit = async () => {
    setSaved(false);
    await save.mutateAsync({
      ageMin,
      ageMax,
      maxDistanceKm: distance,
      intention,
      minVerificationLevel: minVerification,
    });
    setSaved(true);
  };

  return (
    <div className="pb-6">
      <PageHeader title={es.profile.searchPreferences} backHref="/perfil" />
      <div className="px-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div>
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
                  onChange={(event) =>
                    setAgeMin(Math.max(LIMITS.ADULT_AGE, Number(event.target.value)))
                  }
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
        </div>

        <div className="lg:pt-9">
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
            <p className="mt-2 text-[11px] text-muted">
              1: contacto · 2: identidad con selfie · 3: respaldo de su iglesia
            </p>
          </div>

          {save.isError ? (
            <div
              role="alert"
              className="mb-2 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine"
            >
              {errorMessage(save.error)}
            </div>
          ) : null}
          <button
            type="button"
            disabled={spanError || save.isPending || !member.data}
            onClick={() => void submit()}
            className="btn btn-olive mt-2 lg:w-auto lg:px-8"
          >
            {save.isPending ? es.common.loading : saved ? `${es.common.save} ✓` : es.common.save}
          </button>
          <p className="pt-2 text-[11px] text-muted">
            {saved ? es.profile.savedPreferences + '. ' : ''}Al cambiar tu rango, la lista de
            Descubrir se regenera.
          </p>
        </div>
      </div>
    </div>
  );
}
