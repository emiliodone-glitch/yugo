'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useCancelSubscription, useMyPayments, useSubscriptionState } from '@/lib/hooks';
import { PageHeader } from '@/components/page-header';

const PLAN: Record<string, string> = {
  MONTHLY: 'mensual',
  QUARTERLY: 'trimestral',
  ANNUAL: 'anual',
};
const PROVIDER: Record<string, string> = {
  STRIPE: 'Tarjeta (Stripe)',
  AZUL: 'Azul',
  APP_STORE: 'App Store',
  GOOGLE_PLAY: 'Google Play',
  PROMO: 'Código promocional',
};
const STATUS: Record<string, string> = {
  SUCCEEDED: 'Pagado',
  PENDING: 'Pendiente',
  FAILED: 'Fallido',
  REFUND_REQUESTED: 'Reembolso en revisión',
  REFUNDED: 'Reembolsado',
};

const date = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('es-DO') : '—');

/**
 * Mi suscripción (RF-PLU-05/07): qué nivel tengo, hasta cuándo, recibos y
 * cancelar sin llamar a nadie. Cancelar no corta nada: el acceso sigue hasta
 * el fin del período pagado y así se dice antes de confirmar.
 */
export default function SubscriptionPage() {
  const { data: subscription, refetch } = useSubscriptionState();
  const payments = useMyPayments();
  const cancel = useCancelSubscription();
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const tier = subscription?.tier ?? null;
  const paid = tier === 'PLUS' || tier === 'ORO';
  const canceled = !!subscription?.canceledAt;
  const storeManaged =
    subscription?.channel === 'APP_STORE' || subscription?.channel === 'GOOGLE_PLAY';

  const doCancel = async () => {
    try {
      const result = await cancel.mutateAsync();
      setNotice(
        `Suscripción cancelada. Conservas ${tier === 'ORO' ? 'Oro' : 'Plus'} hasta el ${date(result.accessUntil)}; después vuelves al nivel gratuito sin perder conexiones, grupos ni eventos.`,
      );
      setConfirming(false);
      void refetch();
    } catch (caught) {
      setNotice(errorMessage(caught));
    }
  };

  return (
    <div className="pb-8">
      <PageHeader title="Mi suscripción" backHref="/perfil" />
      <div className="px-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        <div>
          {notice ? (
            <div
              role="status"
              className="card border-0 bg-olive-soft text-[12.5px] text-olive-text"
            >
              {notice}
            </div>
          ) : null}

          <div className="card">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-olive">
              NIVEL ACTUAL
            </div>
            <div className="mt-1 flex items-center justify-between">
              <b className="h-display text-[18px]">
                {tier === 'ORO' ? 'Yugo Oro' : tier === 'PLUS' ? 'Yugo Plus' : 'Gratuito'}
              </b>
              {paid && subscription?.plan ? (
                <span className="chip">{PLAN[subscription.plan]}</span>
              ) : null}
            </div>
            {paid ? (
              <p className="mt-1.5 text-[12px] text-muted">
                {canceled
                  ? `Cancelada: conservas el acceso hasta el ${date(subscription?.renewsAt)}.`
                  : subscription?.downgradeToTier
                    ? `Pasas a ${subscription.downgradeToTier === 'PLUS' ? 'Plus' : 'gratuito'} el ${date(subscription?.renewsAt)}.`
                    : `Acceso hasta el ${date(subscription?.renewsAt)}. No se renueva sola: te avisamos antes de que termine.`}
              </p>
            ) : (
              <p className="mt-1.5 text-[12px] text-muted">
                Grupos, eventos, devocional y oración son gratis siempre. Plus y Oro añaden
                intereses ilimitados, modo invisible y más.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/plus" className="btn btn-sm w-auto px-4">
                {paid ? 'Cambiar de nivel' : 'Ver Plus y Oro'}
              </Link>
              {paid && !canceled && !storeManaged ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-auto px-4"
                  onClick={() => setConfirming(true)}
                >
                  Cancelar suscripción
                </button>
              ) : null}
            </div>
            {storeManaged ? (
              <p className="mt-2 text-[11px] text-muted">
                Esta suscripción se gestiona desde la tienda de tu teléfono (App Store o Google
                Play): allí puedes cancelarla.
              </p>
            ) : null}
          </div>

          {confirming ? (
            <div className="card border-wheat bg-wheat-soft">
              <b className="text-[13px]">¿Cancelar {tier === 'ORO' ? 'Oro' : 'Plus'}?</b>
              <p className="mt-1 text-[12px] text-wheat-text">
                Conservas todo hasta el {date(subscription?.renewsAt)}. Después vuelves al nivel
                gratuito: tus conexiones, grupos y eventos se quedan contigo.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-wine btn-sm w-auto px-4"
                  disabled={cancel.isPending}
                  onClick={() => void doCancel()}
                >
                  Sí, cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm w-auto px-4"
                  onClick={() => setConfirming(false)}
                >
                  Seguir suscrito
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="h-display mb-2 mt-3 text-[15px] lg:mt-0">Recibos</h2>
          {payments.isLoading ? (
            <div className="card text-sm text-muted">{es.common.loading}</div>
          ) : (payments.data ?? []).length === 0 ? (
            <div className="card text-sm text-muted">Todavía no hay pagos.</div>
          ) : (
            <div className="card px-3.5 py-1">
              {(payments.data ?? []).map((payment) => (
                <div key={payment.id} className="list-row">
                  <div className="flex-1">
                    <b className="text-[12.5px]">
                      Yugo {payment.tier === 'ORO' ? 'Oro' : payment.tier === 'PLUS' ? 'Plus' : ''}
                      {payment.plan ? ` · ${PLAN[payment.plan]}` : ''}
                    </b>
                    <div className="text-[11px] text-muted">
                      {date(payment.createdAt)} · {PROVIDER[payment.provider] ?? payment.provider}
                      {payment.periodEndsAt ? ` · hasta el ${date(payment.periodEndsAt)}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <b className="text-[12.5px]">
                      {payment.currency === 'DOP' ? 'RD$' : 'US$'}{' '}
                      {payment.amount.toLocaleString('es-DO')}
                    </b>
                    <div className="text-[11px] text-muted">
                      {STATUS[payment.status] ?? payment.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Cada recibo también llega a tu correo. Para un reembolso, escríbenos: lo revisan dos
            personas del equipo.
          </p>
        </div>
      </div>
    </div>
  );
}
