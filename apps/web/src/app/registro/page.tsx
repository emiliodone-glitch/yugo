'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CITIES, COVENANT_V1, DENOMINATIONS, es, isAdult } from '@yugo/shared';
import { AuthLayout } from '@/components/auth-layout';
import { CheckIcon, ChevronLeft, YugoMark } from '@/components/icons';
import { Toggle } from '@/components/ui';
import { DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { useReach } from '@/lib/hooks';

/**
 * Registro corto (RF-AUT-01..04, RF-PER-01).
 *
 * Antes eran ocho pasos —y uno de ellos, «fotos», no subía nada— antes de
 * ver una sola señal de valor. Ahora se pide lo que hace falta para entrar:
 * cuenta, edad, pacto y lo esencial del perfil. Fotos, iglesia, testimonio y
 * prácticas se completan después desde «Completa tu perfil», y la barra de
 * completitud dice cuánto suma cada cosa.
 */
const TOTAL_STEPS = 4;

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
  displayName: string;
  city: string;
  intention: 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH' | null;
  denomination: string | null;
}

const initialState: FormState = {
  email: '',
  password: '',
  otp: '',
  birthDate: '',
  gender: null,
  covenantAccepted: false,
  displayName: '',
  city: '',
  intention: null,
  denomination: null,
};

export default function OnboardingPage() {
  const router = useRouter();
  const inviteToken = useSearchParams().get('invite');
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
        return (
          form.displayName.trim().length >= 2 && form.city.trim().length >= 2 && !!form.intention
        );
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
            // Invitación al portal de iglesias abierta desde un enlace.
            ...(inviteToken ? { inviteToken } : {}),
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

  /**
   * Lo esencial. El rango de edad lo calcula la API a partir de la edad
   * (−5 / +7, nunca menores) y se ajusta después en Preferencias.
   */
  const saveProfile = async () => {
    const client = getApiClient();
    let denominationId: string | undefined;
    if (form.denomination) {
      const denominations = await client.catalog.denominations().catch(() => []);
      denominationId = denominations.find((item) => item.slug === form.denomination)?.id;
    }
    await client.profiles.update({
      displayName: form.displayName.trim(),
      city: form.city.trim(),
      intention: form.intention ?? undefined,
      denominationId,
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
      <AuthLayout tone="linen">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
          <YugoMark className="h-14 w-14 text-ink" />
          <h1 className="h-display mt-5 text-[26px]">{es.onboarding.doneTitle}</h1>
          <p className="mt-2 text-sm text-muted">{es.onboarding.doneSub}</p>

          <div className="mt-6 text-[10.5px] font-semibold tracking-[0.08em] text-olive">
            {es.onboarding.nextStepsTitle.toUpperCase()}
          </div>
          <div className="card mt-2 px-3.5 py-1">
            <Link href="/perfil/fotos" className="list-row">
              <div className="flex-1">
                <b className="text-[12.5px]">{es.onboarding.nextPhotos}</b>
                <div className="text-[11px] text-muted">{es.onboarding.nextPhotosHint}</div>
              </div>
              <span className="chip chip-wheat">+15 %</span>
            </Link>
            <Link href="/perfil/verificacion" className="list-row">
              <div className="flex-1">
                <b className="text-[12.5px]">{es.onboarding.nextVerify}</b>
                <div className="text-[11px] text-muted">{es.onboarding.nextVerifyHint}</div>
              </div>
              <span className="chip chip-olive">{es.common.recommended}</span>
            </Link>
            <Link href="/perfil/editar" className="list-row">
              <div className="flex-1">
                <b className="text-[12.5px]">{es.onboarding.nextComplete}</b>
                <div className="text-[11px] text-muted">{es.onboarding.nextCompleteHint}</div>
              </div>
            </Link>
          </div>

          <Link href="/inicio" className="btn btn-olive mt-6">
            {es.onboarding.goHome}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout tone="linen">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pb-6 pt-4 lg:flex-none lg:pt-14">
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
                autoComplete="email"
                value={form.email}
                onChange={(event) => patch({ email: event.target.value })}
              />
              <input
                className="field"
                type="password"
                placeholder={es.onboarding.password}
                autoComplete="new-password"
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
                autoComplete="one-time-code"
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
              <h1 className="h-display mb-2 mt-1.5 text-[26px]">{es.onboarding.essentialsTitle}</h1>
              <p className="mb-3 text-xs text-muted">{es.onboarding.essentialsSub}</p>

              <label className="mb-1 block text-[13px] font-semibold" htmlFor="displayName">
                {es.onboarding.displayName}
              </label>
              <input
                id="displayName"
                className="field mb-3"
                maxLength={40}
                autoComplete="given-name"
                value={form.displayName}
                onChange={(event) => patch({ displayName: event.target.value })}
              />

              <label className="mb-1 block text-[13px] font-semibold" htmlFor="city">
                {es.onboarding.cityLabel}
              </label>
              <input
                id="city"
                className="field mb-3"
                list="yugo-cities"
                maxLength={80}
                placeholder={CITIES[0].name}
                value={form.city}
                onChange={(event) => patch({ city: event.target.value })}
              />
              <datalist id="yugo-cities">
                {CITIES.map((city) => (
                  <option key={city.name} value={city.name} />
                ))}
              </datalist>

              <div className="mb-2 text-[13px] font-semibold">{es.onboarding.intentionTitle}</div>
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

              <div className="mb-2 mt-4 text-[13px] font-semibold">
                {es.onboarding.denominationOptional}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DENOMINATIONS.map((denomination) => (
                  <button
                    key={denomination.slug}
                    type="button"
                    onClick={() =>
                      patch({
                        denomination:
                          form.denomination === denomination.slug ? null : denomination.slug,
                      })
                    }
                    className={`chip ${form.denomination === denomination.slug ? 'chip-olive ring-1 ring-olive' : ''}`}
                  >
                    {denomination.name}
                  </button>
                ))}
              </div>
              {form.denomination && reach ? (
                <p className="mt-3 rounded-field bg-olive-soft px-3 py-2 text-[12px] text-olive-text">
                  {reach.hasPeople
                    ? reach.approximate
                      ? es.onboarding.reachWithNumber(reach.approximate)
                      : es.onboarding.reachWithout
                    : es.onboarding.reachFirst}
                </p>
              ) : null}
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
                  ? 'Entrar a Yugo'
                  : es.common.continue}
        </button>
      </div>
    </AuthLayout>
  );
}
