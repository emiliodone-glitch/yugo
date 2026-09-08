'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { es, isUnreachableError } from '@yugo/shared';
import { apiBaseUrl, DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { AuthLayout } from '@/components/auth-layout';
import { YugoMark } from '@/components/icons';

/** Sign in (RF-AUT-01/02/05/07). Handles the 2FA step for staff accounts. */
export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'two-factor'>('credentials');
  const [error, setError] = useState<string | null>(null);
  const [unreachable, setUnreachable] = useState(false);
  const [busy, setBusy] = useState(false);

  // A dónde volver después de entrar: la puerta de la zona de miembros manda
  // aquí con ?next=/ruta. Solo rutas internas, para que un enlace externo no
  // pueda usar la pantalla de entrada como trampolín.
  const destination = () => {
    const next = new URLSearchParams(window.location.search).get('next');
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/inicio';
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setUnreachable(false);

    if (DEMO_MODE) {
      router.push(destination());
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
      router.push(destination());
    } catch (caught) {
      setError(errorMessage(caught));
      setUnreachable(isUnreachableError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-10">
        <Link href="/" className="inline-flex" aria-label={es.common.back}>
          <YugoMark className="h-12 w-12" />
        </Link>
        <h1 className="mt-5 font-display text-[26px] font-semibold lg:text-[30px]">
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
            <div
              role="alert"
              className="mt-3 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine"
            >
              {error}
              {unreachable ? (
                <div className="mt-1.5 border-t border-wine/20 pt-1.5 text-[11.5px]">
                  {es.errors.apiUnreachableHint(apiBaseUrl())}{' '}
                  <Link href="/estado" className="font-semibold underline">
                    {es.status.title} ›
                  </Link>
                </div>
              ) : null}
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
          <p className="mt-3 text-center text-[11px] text-ink-muted2">{es.welcome.socialHint}</p>
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
    </AuthLayout>
  );
}
