'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { YugoMark } from '@/components/icons';

/** Sign in (RF-AUT-01/02/05/07). Handles the 2FA step for staff accounts. */
export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'two-factor'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (DEMO_MODE) {
      router.push('/inicio');
      return;
    }

    setBusy(true);
    try {
      if (stage === 'credentials') {
        const result = await getApiClient().auth.login(identifier, password);
        if ('twoFactorRequired' in result) {
          setIdentifier(result.identifier);
          setStage('two-factor');
          return;
        }
      } else {
        await getApiClient().auth.loginSecondFactor(identifier, code);
      }
      router.push('/inicio');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-ink text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <YugoMark className="h-12 w-12" />
        <h1 className="mt-5 font-display text-[26px] font-semibold">
          {stage === 'credentials' ? 'Entra a Yugo' : es.onboarding.otpTitle}
        </h1>
        <p className="mb-5 mt-1 text-[13px] text-ink-muted">
          {stage === 'credentials'
            ? 'Usa el correo o teléfono con el que te registraste.'
            : 'Tu cuenta tiene verificación en dos pasos. Ingresa el código que te enviamos.'}
        </p>

        <form onSubmit={submit}>
          {stage === 'credentials' ? (
            <>
              <input
                className="field mb-2.5"
                placeholder="Correo o teléfono"
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
              />
              <input
                className="field"
                type="password"
                placeholder={es.onboarding.password}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </>
          ) : (
            <input
              className="field text-center text-lg tracking-[0.5em]"
              inputMode="numeric"
              maxLength={6}
              placeholder="······"
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            />
          )}

          {error ? (
            <div className="mt-3 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine">
              {error}
            </div>
          ) : null}

          <button type="submit" disabled={busy} className="btn btn-wheat mt-4">
            {busy ? es.common.loading : es.common.continue}
          </button>
        </form>

        {DEMO_MODE ? (
          <p className="mt-3 text-center text-[11px] text-ink-muted2">
            Modo demo: cualquier dato te deja entrar.
          </p>
        ) : (
          <p className="mt-3 text-center text-[11px] text-ink-muted2">
            {es.welcome.socialHint}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-5 text-[11px] text-ink-muted2">
          <Link href="/registro" className="underline">
            Crear mi perfil
          </Link>
          <Link href="/recuperar" className="underline">
            Olvidé mi contraseña
          </Link>
        </div>
      </div>
    </div>
  );
}
