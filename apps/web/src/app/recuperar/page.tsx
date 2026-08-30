'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { YugoMark } from '@/components/icons';

/** RF-AUT-05: password recovery by email or SMS with an OTP. */
export default function PasswordResetPage() {
  const router = useRouter();
  const [stage, setStage] = useState<'request' | 'reset' | 'done'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (stage === 'request') {
        if (!DEMO_MODE) await getApiClient().auth.requestPasswordReset(identifier);
        setStage('reset');
      } else {
        if (!DEMO_MODE) await getApiClient().auth.resetPassword(identifier, code, newPassword);
        setStage('done');
      }
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

        {stage === 'done' ? (
          <>
            <h1 className="mt-5 font-display text-[26px] font-semibold">Contraseña actualizada</h1>
            <p className="mb-5 mt-1 text-[13px] text-ink-muted">
              Cerramos tus otras sesiones por seguridad. Vuelve a entrar con tu nueva contraseña.
            </p>
            <button type="button" className="btn btn-wheat" onClick={() => router.push('/entrar')}>
              Entrar
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-5 font-display text-[26px] font-semibold">
              {stage === 'request' ? 'Recuperar mi contraseña' : 'Ingresa el código'}
            </h1>
            <p className="mb-5 mt-1 text-[13px] text-ink-muted">
              {stage === 'request'
                ? 'Te enviaremos un código a tu correo o teléfono.'
                : `Enviamos un código de 6 dígitos a ${identifier}.`}
            </p>

            <form onSubmit={submit}>
              {stage === 'request' ? (
                <input
                  className="field"
                  placeholder="Correo o teléfono"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                />
              ) : (
                <>
                  <input
                    className="field mb-2.5 text-center text-lg tracking-[0.5em]"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="······"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  />
                  <input
                    className="field"
                    type="password"
                    placeholder="Nueva contraseña"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </>
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
          </>
        )}

        <div className="mt-6 text-center text-[11px] text-ink-muted2">
          <Link href="/entrar" className="underline">
            Volver a entrar
          </Link>
        </div>
      </div>
    </div>
  );
}
