'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { useRedeemPromo } from '@/lib/hooks';
import { errorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

/** RF-PLU-04: promotional codes and trial periods (allied congregations). */
export default function PromoCodePage() {
  const redeem = useRedeemPromo();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tier: string; trialDays: number } | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await redeem.mutateAsync(code);
      setSuccess({ tier: result.tier, trialDays: result.trialDays });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : '';
      setError(
        message === 'invalid_promo_code'
          ? 'El código promocional no es válido.'
          : errorMessage(caught),
      );
    }
  };

  return (
    <div>
      <PageHeader title="Código promocional" backHref="/perfil" />
      <div className="px-4">
        {success ? (
          <div className="card border-0 bg-olive-soft">
            <b className="text-[12.5px] text-olive-text">
              ¡Listo! Tienes Yugo {success.tier} por {success.trialDays} días
            </b>
            <div className="mt-1 text-[11px] text-olive-text">
              Al terminar la prueba tu cuenta vuelve al nivel gratuito. No se te cobrará nada.
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 text-[12.5px] text-muted">
              Si tu congregación es aliada de Yugo, es posible que te hayan dado un código para
              probar Plus u Oro sin costo.
            </p>
            <form onSubmit={submit} className="card">
              <input
                className="field text-center uppercase tracking-[0.2em]"
                placeholder="CÓDIGO"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                maxLength={40}
              />
              {error ? (
                <div className="mt-2 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine">
                  {error}
                </div>
              ) : null}
              <button
                type="submit"
                className="btn btn-olive mt-3"
                disabled={redeem.isPending || code.trim().length < 3}
              >
                {redeem.isPending ? es.common.loading : 'Canjear código'}
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-muted">
              Solo puedes usar un código promocional y no mientras tengas una suscripción activa.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
