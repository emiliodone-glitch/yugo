'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useSubscriptionState, useWhoMarkedMe } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

/**
 * «Te interesan» (RF-DES-09): la cuenta gratuita ve cuántas personas son;
 * Plus y Oro ven quiénes y el mensaje que dejaron. El conteo y la lista
 * vienen de la API; el plan, de la suscripción real de la cuenta.
 */
export default function InterestedInYouPage() {
  const { data, isLoading } = useWhoMarkedMe();
  const { data: subscription } = useSubscriptionState();
  const isPaid = subscription?.tier != null;
  const count = data?.count ?? 0;
  const profiles = data?.profiles ?? null;

  return (
    <div>
      <PageHeader title={es.discover.interestedInYou} backHref="/conexiones" />
      <div className="px-4 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start lg:gap-x-6">
        <div>
          <div className="card border-0 bg-ink text-white">
            <div className="text-xs text-ink-muted">{es.discover.interestedSub}</div>
            <div className="font-display text-[30px] font-semibold leading-none lg:text-[40px]">
              {isLoading ? '…' : count}
            </div>
          </div>

          {!isPaid ? (
            <Link href="/plus" className="card block border-[1.5px] border-wheat bg-wheat-soft">
              <div className="text-[12.5px] font-semibold text-wheat-text">
                {es.discover.interestedUnlockTitle}
              </div>
              <div className="mt-1 text-[11px] text-wheat-text">
                {es.discover.interestedUnlockBody}
              </div>
            </Link>
          ) : null}
        </div>

        <div>
          {!isLoading && count === 0 ? (
            <div className="card py-8 text-center text-sm text-muted">
              {es.discover.interestedNone}
            </div>
          ) : null}

          {profiles && profiles.length > 0
            ? profiles.map((profile) => (
                <Link
                  key={profile.userId}
                  href={`/descubrir/${profile.userId}`}
                  className="card flex items-center gap-3"
                >
                  <Avatar name={profile.displayName} size="m" />
                  <div className="min-w-0 flex-1">
                    <b className="text-[12.5px]">{profile.displayName}</b>
                    <div className="text-[11px] text-muted">
                      {[profile.denomination, profile.city].filter(Boolean).join(' · ')}
                    </div>
                    {profile.message ? (
                      <p className="mt-1 rounded-field bg-linen-2 px-2.5 py-1.5 text-[12px]">
                        «{profile.message}»
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted">›</span>
                </Link>
              ))
            : null}

          {/* Sin plan, la API no manda perfiles: siluetas borrosas, tantas
              como personas hay, sin inventar nombres. */}
          {!profiles && count > 0 ? (
            <div className="pointer-events-none select-none blur-sm" aria-hidden="true">
              {Array.from({ length: Math.min(count, 4) }, (_, index) => (
                <div key={index} className="card flex items-center gap-3">
                  <span className="h-[46px] w-[46px] flex-none rounded-full bg-linen-2" />
                  <div className="flex-1">
                    <div className="h-3 w-28 rounded bg-linen-2" />
                    <div className="mt-1.5 h-2.5 w-40 rounded bg-linen-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
