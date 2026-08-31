'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ATTENDANCE_OPTIONS,
  COVENANT_V1,
  DENOMINATIONS,
  es,
  isAdult,
  LIMITS,
  SERVICE_AREAS,
  type ProfileUpdateInput,
} from '@yugo/shared';
import { CheckIcon, ChevronLeft, PersonSilhouette, YugoMark } from '@/components/icons';
import { Toggle } from '@/components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { useReach } from '@/lib/hooks';

const TOTAL_STEPS = 8;

/**
 * The account is created once the birth date is known, because the API refuses
 * to register anyone under 18 (RF-AUT-03) — so the code is sent after step 2
 * against the live API, and after step 1 in demo mode, where nothing is sent.
 */
const OTP_AFTER_STEP = DEMO_MODE ? 1 : 2;

interface FormState {
  email: string;
  password: string;
  otp: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | null;
  covenantAccepted: boolean;
  denomination: string | null;
  church: string;
  yearsInFaith: string;
  attendance: string | null;
  intention: 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH' | null;
  openness: 'SAME' | 'AFFINE' | 'ALL' | null;
  photos: number;
  testimony: string;
  verse: string;
  practices: string[];
  ageMin: number;
  ageMax: number;
  distance: number;
}

const initialState: FormState = {
  email: '',
  password: '',
  otp: '',
  birthDate: '',
  gender: null,
  covenantAccepted: false,
  denomination: null,
  church: '',
  yearsInFaith: '',
  attendance: null,
  intention: null,
  openness: null,
  photos: 0,
  testimony: '',
  verse: '',
  practices: [],
  ageMin: 26,
  ageMax: 38,
  distance: 50,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [otpStage, setOtpStage] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prueba de valor en cuanto sabemos lo suficiente para que signifique algo.
  const { data: reach } = useReach(form.denomination ?? undefined);

  const patch = (partial: Partial<FormState>) => {
    setError(null);
    setForm((current) => ({ ...current, ...partial }));
  };

  const underage = useMemo(() => {
    if (!form.birthDate) return false;
    return !isAdult(new Date(form.birthDate));
  }, [form.birthDate]);

  const canContinue = useMemo(() => {
    switch (step) {
      case 1:
        return form.email.includes('@') && form.password.length >= 8;
      case 2:
        return !!form.birthDate && !underage && !!form.gender;
      case 3:
        return form.covenantAccepted;
      case 4:
        return !!form.denomination && !!form.attendance;
      case 5:
        return !!form.intention && !!form.openness;
      case 6:
        return form.photos >= LIMITS.PHOTOS_MIN;
      case 7:
        return form.testimony.trim().length >= 40 && form.practices.length >= 2;
      case 8:
        return form.ageMax - form.ageMin >= LIMITS.AGE_RANGE_MIN_SPAN && form.ageMin >= 18;
      default:
        return false;
    }
  }, [step, form, underage]);

  const next = async () => {
    setError(null);
    setBusy(true);
    try {
      if (otpStage) {
        if (!DEMO_MODE) await getApiClient().auth.verifyOtp(form.email, form.otp);
        setOtpStage(false);
        setStep(OTP_AFTER_STEP + 1);
        return;
      }

      if (step === OTP_AFTER_STEP) {
        if (!DEMO_MODE) {
          await getApiClient().auth.register({
            email: form.email,
            password: form.password,
            birthDate: form.birthDate,
            gender: form.gender as 'MALE' | 'FEMALE',
          });
        }
        setOtpStage(true);
        return;
      }

      // RF-AUT-04: the covenant is recorded with its version before anything else.
      if (step === 3 && !DEMO_MODE) {
        await getApiClient().auth.acceptCovenant(COVENANT_V1.version);
      }

      if (step === TOTAL_STEPS) {
        if (!DEMO_MODE) await saveProfile();
        setDone(true);
        return;
      }

      setStep((current) => current + 1);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  /** Sends everything the wizard collected once the member finishes it. */
  const saveProfile = async () => {
    const client = getApiClient();
    const denominations = await client.catalog.denominations().catch(() => []);
    const denominationId =
      denominations.find((item) => item.slug === form.denomination)?.id ?? undefined;

    await client.profiles.update({
      denominationId,
      churchFreeText: form.church || undefined,
      yearsInFaith: form.yearsInFaith ? Number(form.yearsInFaith) : undefined,
      attendance: (form.attendance ?? undefined) as ProfileUpdateInput['attendance'],
      intention: form.intention ?? undefined,
      openness: form.openness ?? undefined,
      testimony: form.testimony || undefined,
      verse: form.verse || undefined,
      practiceSlugs: form.practices,
    });
    await client.profiles.updatePreferences({
      ageMin: form.ageMin,
      ageMax: form.ageMax,
      maxDistanceKm: form.distance,
    });
  };

  const back = () => {
    if (otpStage) {
      setOtpStage(false);
      return;
    }
    if (step === 1) {
      router.push('/');
      return;
    }
    setStep((s) => s - 1);
  };

  if (done) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-linen px-6 text-center">
        <YugoMark className="h-16 w-16 text-ink" />
        <h1 className="h-display mt-5 text-[26px]">{es.onboarding.doneTitle}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">{es.onboarding.doneSub}</p>
        <Link href="/inicio" className="btn btn-olive mt-6 max-w-xs">
          {es.common.continue}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-6 pt-4">
      {/* Progress */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} aria-label={es.common.back} className="p-1 text-ink">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="bar flex-1">
          <i style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>
      </div>
      <div className="mt-4 text-[10.5px] font-semibold tracking-[0.08em] text-olive">
        {es.common.step(step, TOTAL_STEPS)}
      </div>

      <div className="flex-1">
        {step === 1 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.accountTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.accountSub}</p>
            <input
              className="field mb-2.5"
              type="email"
              placeholder={es.onboarding.email}
              value={form.email}
              onChange={(event) => patch({ email: event.target.value })}
            />
            <input
              className="field"
              type="password"
              placeholder={es.onboarding.password}
              value={form.password}
              onChange={(event) => patch({ password: event.target.value })}
            />
            <p className="mt-3 text-center text-[11px] text-muted">{es.welcome.socialHint}</p>
          </>
        ) : null}

        {otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.otpTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.otpSub(form.email)}</p>
            <input
              className="field text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="······"
              value={form.otp}
              onChange={(event) => patch({ otp: event.target.value.replace(/\D/g, '') })}
            />
          </>
        ) : null}

        {step === 2 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.birthTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.birthSub}</p>
            <input
              className="field mb-2"
              type="date"
              value={form.birthDate}
              onChange={(event) => patch({ birthDate: event.target.value })}
            />
            {underage ? (
              <div className="mb-3 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine">
                {es.onboarding.birthUnderage}
              </div>
            ) : null}
            <div className="mb-2 mt-4 text-[13px] font-semibold">{es.onboarding.genderTitle}</div>
            <div className="flex gap-2">
              {(
                [
                  ['MALE', es.onboarding.male],
                  ['FEMALE', es.onboarding.female],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => patch({ gender: value })}
                  className={`btn flex-1 ${form.gender === value ? 'btn-olive' : 'btn-ghost'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 3 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.covenant.title}</h1>
            <p className="mb-3 text-xs text-muted">{es.covenant.intro}</p>
            <div className="card px-3.5 py-1.5">
              {COVENANT_V1.points.map((point) => (
                <div key={point} className="list-row">
                  <CheckIcon className="h-[18px] w-[18px] flex-none text-olive" />
                  <span className="text-[12.5px]">{point}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2.5">
              <Toggle
                on={form.covenantAccepted}
                onChange={(value) => patch({ covenantAccepted: value })}
                label={es.covenant.acceptLabel}
              />
              <span className="text-[12.5px]">{es.covenant.acceptLabel}</span>
            </div>
          </>
        ) : null}

        {step === 4 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.faithTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.faithSub}</p>
            <div className="mb-2 text-[13px] font-semibold">{es.onboarding.denomination}</div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {DENOMINATIONS.map((denomination) => (
                <button
                  key={denomination.slug}
                  type="button"
                  onClick={() => patch({ denomination: denomination.slug })}
                  className={`chip ${form.denomination === denomination.slug ? 'chip-olive ring-1 ring-olive' : ''}`}
                >
                  {denomination.name}
                </button>
              ))}
            </div>
            <input
              className="field mb-2.5"
              placeholder={es.onboarding.church}
              value={form.church}
              onChange={(event) => patch({ church: event.target.value })}
            />
            <input
              className="field mb-2.5"
              type="number"
              min={0}
              placeholder={es.onboarding.yearsInFaith}
              value={form.yearsInFaith}
              onChange={(event) => patch({ yearsInFaith: event.target.value })}
            />
            {reach?.hasPeople ? (
              <p className="mb-3 rounded-field bg-olive-soft px-3 py-2 text-[12px] text-olive-text">
                {reach.approximate
                  ? `Ya hay más de ${reach.approximate} personas de tu denominación con perfil completo en Yugo.`
                  : 'Ya hay personas de tu denominación con perfil completo en Yugo.'}
              </p>
            ) : null}

            <div className="mb-2 text-[13px] font-semibold">{es.onboarding.attendance}</div>
            <div className="flex flex-wrap gap-1.5">
              {ATTENDANCE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => patch({ attendance: option.value })}
                  className={`chip ${form.attendance === option.value ? 'chip-olive ring-1 ring-olive' : ''}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {step === 5 && !otpStage ? (
          <>
            <h1 className="h-display mb-3 mt-1.5 text-[26px]">{es.onboarding.intentionTitle}</h1>
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
                onClick={() => patch({ intention: value })}
                className={`btn mb-2 ${form.intention === value ? 'btn-olive' : 'btn-ghost'}`}
              >
                {label}
              </button>
            ))}
            <div className="mb-2 mt-5 text-[13px] font-semibold">{es.onboarding.opennessTitle}</div>
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
                onClick={() => patch({ openness: value })}
                className={`btn mb-2 ${form.openness === value ? 'btn-olive' : 'btn-ghost'}`}
              >
                {label}
              </button>
            ))}
          </>
        ) : null}

        {step === 6 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.photosTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.photosSub}</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: LIMITS.PHOTOS_MAX }, (_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    patch({ photos: index < form.photos ? form.photos - 1 : form.photos + 1 })
                  }
                  className={`flex aspect-[3/4] items-center justify-center rounded-card border ${
                    index < form.photos
                      ? 'border-olive bg-olive-soft'
                      : 'border-dashed border-line bg-white'
                  }`}
                  aria-label={`Foto ${index + 1}`}
                >
                  {index < form.photos ? (
                    <PersonSilhouette className="h-10 w-10 text-olive" />
                  ) : (
                    <span className="text-2xl text-line">+</span>
                  )}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {form.photos} de {LIMITS.PHOTOS_MAX} · mínimo {LIMITS.PHOTOS_MIN}
            </p>
          </>
        ) : null}

        {step === 7 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.testimonyTitle}</h1>
            <p className="mb-3 text-xs text-muted">{es.onboarding.testimonySub}</p>
            <textarea
              className="field mb-1 h-28 resize-none"
              maxLength={LIMITS.TESTIMONY_MAX}
              value={form.testimony}
              onChange={(event) => patch({ testimony: event.target.value })}
            />
            <div className="mb-3 text-right text-[11px] text-muted">
              {form.testimony.length}/{LIMITS.TESTIMONY_MAX}
            </div>
            <input
              className="field mb-4"
              placeholder={es.onboarding.verse}
              value={form.verse}
              onChange={(event) => patch({ verse: event.target.value })}
            />
            <div className="mb-2 text-[13px] font-semibold">{es.onboarding.practicesTitle}</div>
            <p className="mb-2 text-xs text-muted">{es.onboarding.practicesSub}</p>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_AREAS.map((area) => {
                const active = form.practices.includes(area.slug);
                return (
                  <button
                    key={area.slug}
                    type="button"
                    onClick={() =>
                      patch({
                        practices: active
                          ? form.practices.filter((slug) => slug !== area.slug)
                          : [...form.practices, area.slug],
                      })
                    }
                    className={`chip ${active ? 'chip-olive ring-1 ring-olive' : ''}`}
                  >
                    {area.name}
                  </button>
                );
              })}
            </div>
          </>
        ) : null}

        {step === 8 && !otpStage ? (
          <>
            <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.preferencesTitle}</h1>
            <div className="mb-1 mt-2 flex items-center justify-between">
              <div className="text-[13px] font-semibold">{es.onboarding.ageRange}</div>
              <span className="chip">{es.common.required}</span>
            </div>
            <div className="card p-3">
              <div className="flex items-center justify-between text-[12.5px]">
                <span>{es.visibility.wantToMeet}</span>
                <b>{es.onboarding.ageRangeValue(form.ageMin, form.ageMax)}</b>
              </div>
              <div className="my-2.5 flex items-center gap-3">
                <input
                  type="range"
                  min={18}
                  max={70}
                  value={form.ageMin}
                  onChange={(event) =>
                    patch({
                      ageMin: Math.min(
                        Number(event.target.value),
                        form.ageMax - LIMITS.AGE_RANGE_MIN_SPAN,
                      ),
                    })
                  }
                  className="flex-1 accent-ink"
                  aria-label="Edad mínima"
                />
                <input
                  type="range"
                  min={18}
                  max={80}
                  value={form.ageMax}
                  onChange={(event) =>
                    patch({
                      ageMax: Math.max(
                        Number(event.target.value),
                        form.ageMin + LIMITS.AGE_RANGE_MIN_SPAN,
                      ),
                    })
                  }
                  className="flex-1 accent-ink"
                  aria-label="Edad máxima"
                />
              </div>
              <div className="text-[11px] text-muted">{es.onboarding.ageRangeHelp}</div>
            </div>
            <div className="card p-3">
              <div className="flex items-center justify-between text-[12.5px]">
                <span>{es.onboarding.maxDistance}</span>
                <b>{form.distance} km</b>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={form.distance}
                onChange={(event) => patch({ distance: Number(event.target.value) })}
                className="mt-2 w-full accent-ink"
                aria-label={es.onboarding.maxDistance}
              />
            </div>
          </>
        ) : null}
      </div>

      {error ? <div className="mb-2 text-center text-[12px] text-wine">{error}</div> : null}
      <button
        type="button"
        disabled={busy || !(otpStage ? form.otp.length === 6 : canContinue)}
        onClick={next}
        className={`btn ${step === 3 && !otpStage ? 'btn-olive' : ''}`}
      >
        {busy
          ? es.common.loading
          : otpStage
            ? es.common.continue
            : step === 3
              ? es.covenant.commit
              : step === TOTAL_STEPS
                ? 'Crear mi perfil'
                : es.common.continue}
      </button>
    </div>
  );
}
