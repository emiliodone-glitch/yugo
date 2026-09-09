'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { es, intlLocale } from '@yugo/shared';
import { useMyPayments, useSubscriptionState } from '@/lib/hooks';
import { YugoMark } from '@/components/icons';

/**
 * Vuelta del checkout (RF-PLU-02/05). Con Stripe la activación llega por
 * webhook unos segundos después, así que la página espera al recibo en vez
 * de dar por hecho el pago.
 */
export default function ThanksPage() {
  const subscription = useSubscriptionState();
  const payments = useMyPayments();
  const [elapsed, setElapsed] = useState(0);

  const active = subscription.data?.tier === 'PLUS' || subscription.data?.tier === 'ORO';
  const receipt = payments.data?.[0] ?? null;

  useEffect(() => {
    if (active) return;
    const timer = setInterval(() => {
      setElapsed((seconds) => seconds + 3);
      void subscription.refetch();
      void payments.refetch();
    }, 3000);
    return () => clearInterval(timer);
  }, [active, subscription, payments]);

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-8 text-center">
      <YugoMark className="mx-auto h-14 w-14 text-ink" />
      {active ? (
        <>
          <h1 className="h-display mt-4 text-[24px]">
            Bienvenido a Yugo {subscription.data?.tier === 'ORO' ? 'Oro' : 'Plus'}
          </h1>
          <p className="mt-2 text-sm text-muted">
            Ya está activo. Gracias por sostener una comunidad que no vive de la publicidad ni de
            mantenerte enganchado.
          </p>
          {receipt ? (
            <div className="card mt-5 text-left">
              <div className="text-[11px] font-semibold tracking-[0.08em] text-olive">RECIBO</div>
              <div className="mt-1 flex items-center justify-between text-[13px]">
                <span>
                  Yugo {receipt.tier === 'ORO' ? 'Oro' : 'Plus'} ·{' '}
                  {receipt.plan === 'ANNUAL'
                    ? 'anual'
                    : receipt.plan === 'QUARTERLY'
                      ? 'trimestral'
                      : 'mensual'}
                </span>
                <b>
                  {receipt.currency === 'DOP' ? 'RD$' : 'US$'}{' '}
                  {receipt.amount.toLocaleString(intlLocale())}
                </b>
              </div>
              <div className="mt-1 text-[11px] text-muted">
                {new Date(receipt.createdAt).toLocaleDateString(intlLocale())}
                {receipt.periodEndsAt
                  ? ` · acceso hasta el ${new Date(receipt.periodEndsAt).toLocaleDateString(intlLocale())}`
                  : ''}
                . También te lo enviamos por correo.
              </div>
            </div>
          ) : null}
          <Link href="/descubrir" className="btn btn-olive mt-5">
            Ir a Descubrir
          </Link>
          <Link href="/perfil/suscripcion" className="btn btn-ghost mt-2">
            Ver mi suscripción
          </Link>
        </>
      ) : (
        <>
          <h1 className="h-display mt-4 text-[24px]">Confirmando tu pago…</h1>
          <p className="mt-2 text-sm text-muted">
            {elapsed < 30
              ? 'Stripe nos avisa en unos segundos. No cierres esta página.'
              : 'Está tardando más de lo normal. Si el cargo aparece en tu banco, tu nivel se activa solo en cuanto llegue la confirmación; también puedes escribirnos.'}
          </p>
          <div className="bar mx-auto mt-5 max-w-[240px]">
            <i style={{ width: `${Math.min(95, 15 + elapsed * 3)}%` }} />
          </div>
          <Link href="/perfil" className="btn btn-ghost mt-6">
            {es.common.back}
          </Link>
        </>
      )}
    </div>
  );
}
