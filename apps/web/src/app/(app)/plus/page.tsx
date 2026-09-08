'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DEFAULT_PRICES, es, LIMITS } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useCheckout, usePrices, useSubscriptionState } from '@/lib/hooks';
import { Segment } from '@/components/ui';
import { CheckIcon } from '@/components/icons';

type Cycle = 'MONTHLY' | 'ANNUAL';

/**
 * Paywall contextual (RF-PLU-01/02/06, mockup 11).
 *
 * «Continuar» hace algo de verdad: en local activa al instante (proveedor
 * stub) y con Stripe lleva a un Checkout alojado, así la tarjeta nunca pasa
 * por Yugo. Quien ya tiene un nivel ve cambiar de plan o gestionar, no volver
 * a comprar lo mismo.
 */
export default function PaywallPage() {
  const router = useRouter();
  const { data: prices = DEFAULT_PRICES } = usePrices();
  const { data: subscription } = useSubscriptionState();
  const checkout = useCheckout();
  const [cycle, setCycle] = useState<Cycle>('ANNUAL');
  const [selected, setSelected] = useState<'PLUS' | 'ORO'>('ORO');
  const [notice, setNotice] = useState<string | null>(null);

  const priceLabel = (tier: 'PLUS' | 'ORO') => {
    const price = prices[tier][cycle].DOP;
    const formatted = `RD$ ${price.toLocaleString('es-DO')}`;
    return cycle === 'ANNUAL' ? es.paywall.perYear(formatted) : es.paywall.perMonth(formatted);
  };

  const currentTier = subscription?.tier ?? null;
  const sameTier = currentTier === selected;

  const proceed = async () => {
    setNotice(null);
    try {
      const result = await checkout.mutateAsync({ tier: selected, plan: cycle, currency: 'DOP' });
      if (result.mode === 'redirect') {
        window.location.href = result.url;
        return;
      }
      if (result.mode === 'scheduled') {
        setNotice(
          `Listo: pasarás a Plus el ${new Date(result.effectiveAt).toLocaleDateString('es-DO')}, cuando termine tu período Oro. Hasta entonces conservas todo.`,
        );
        return;
      }
      router.push('/plus/gracias');
    } catch (caught) {
      const message = errorMessage(caught);
      setNotice(
        /stripe_not_configured/.test(message)
          ? 'Los pagos con tarjeta todavía no están activos en este entorno. Escríbenos para activarlo.'
          : message,
      );
    }
  };

  return (
    <div className="min-h-dvh bg-ink px-4 pb-24 pt-4 text-white md:pb-8">
      <div className="mx-auto max-w-md">
        <div className="flex items-center justify-between">
          <span className="chip bg-white/10 text-white">
            {currentTier
              ? `Tu nivel actual: ${currentTier === 'ORO' ? 'Oro' : 'Plus'}`
              : es.paywall.limitReached}
          </span>
          <Link href="/perfil" aria-label={es.common.close} className="text-ink-muted2">
            ✕
          </Link>
        </div>

        <h1 className="mt-3.5 font-display text-2xl font-semibold">{es.paywall.chooseLevel}</h1>
        <p className="mb-3 mt-1 text-xs leading-normal text-ink-muted">
          {currentTier
            ? 'Cambia de nivel cuando quieras: subir se prorratea y bajar se aplica al terminar tu período.'
            : es.paywall.usedInterests(LIMITS.DAILY_INTERESTS_FREE)}
        </p>

        <div className="mb-2.5">
          <Segment
            dark
            value={cycle}
            onChange={setCycle}
            options={[
              { value: 'MONTHLY', label: es.paywall.monthly },
              {
                value: 'ANNUAL',
                label: es.paywall.annualSave,
                activeClass: 'bg-wheat text-ink-deep',
              },
            ]}
          />
        </div>

        {/* Plus */}
        <button
          type="button"
          onClick={() => setSelected('PLUS')}
          className={`mb-2 block w-full rounded-card border p-3 text-left transition ${
            selected === 'PLUS' ? 'border-white/60 bg-white/10' : 'border-white/20 bg-white/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <b className="h-display text-[15px] text-white">{es.paywall.plus}</b>
            <b className="text-[12.5px]">{priceLabel('PLUS')}</b>
          </div>
          <div className="mt-2 grid gap-1 text-xs">
            {es.paywall.plusFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-1.5">
                <CheckIcon className="h-[13px] w-[13px] flex-none text-wheat" />
                {feature}
              </div>
            ))}
          </div>
        </button>

        {/* Oro */}
        <button
          type="button"
          onClick={() => setSelected('ORO')}
          className={`relative block w-full rounded-card border-[1.5px] p-3 text-left transition ${
            selected === 'ORO' ? 'border-wheat' : 'border-wheat/50'
          }`}
          style={{
            background: 'linear-gradient(160deg, rgba(224,178,90,.22), rgba(224,178,90,.08))',
          }}
        >
          <span className="chip absolute -top-2.5 right-3 bg-wheat text-ink-deep">
            {es.paywall.mostChosen}
          </span>
          <div className="flex items-center justify-between">
            <b className="h-display text-[15px] text-wheat">{es.paywall.oro}</b>
            <b className="text-[12.5px]">{priceLabel('ORO')}</b>
          </div>
          <div className="mt-0.5 text-[11px] text-ink-muted">{es.paywall.allOfPlus}</div>
          <div className="mt-1.5 grid gap-1 text-xs">
            {es.paywall.oroFeatures.map((feature, index) => (
              <div key={feature} className="flex items-start gap-1.5">
                <CheckIcon className="mt-0.5 h-[13px] w-[13px] flex-none text-wheat" />
                <span>
                  {index === 0 ? (
                    <>
                      <b>Modo invisible:</b> solo te ven a quienes marcas interés
                    </>
                  ) : (
                    feature
                  )}
                </span>
              </div>
            ))}
          </div>
        </button>

        {notice ? (
          <div role="status" className="mt-4 rounded-card bg-white/10 px-3 py-2 text-[12.5px]">
            {notice}
          </div>
        ) : null}

        {sameTier ? (
          <Link href="/perfil/suscripcion" className="btn btn-wheat mt-5">
            Gestionar mi suscripción
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-wheat mt-5"
            disabled={checkout.isPending}
            onClick={() => void proceed()}
          >
            {checkout.isPending
              ? es.common.loading
              : selected === 'ORO'
                ? es.paywall.continueOro
                : es.paywall.continuePlus}
          </button>
        )}
        <p className="mt-2 text-center text-[11px] text-ink-muted2">{es.paywall.cancelAnytime}</p>
        <p className="mt-1 text-center text-[11px] text-ink-muted2">
          Grupos y eventos siguen siendo gratis en cualquier nivel. El pago con tarjeta se hace en
          una página segura de Stripe; Yugo nunca ve tu tarjeta.
        </p>
        {currentTier ? (
          <p className="mt-3 text-center text-[11px]">
            <Link href="/perfil/suscripcion" className="underline">
              Ver recibos o cancelar
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
