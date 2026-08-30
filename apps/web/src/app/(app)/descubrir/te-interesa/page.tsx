'use client';

import Link from 'next/link';
import { demoCurrentUser, demoDiscover, es } from '@yugo/shared';
import { AffinityRing, Avatar } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

/**
 * "Te interesa a…" (RF-DES-09): free accounts see only the count; Plus and
 * Oro see the full profiles and any interest message.
 */
export default function InterestedInYouPage() {
  const isPaid = demoCurrentUser.subscription.tier !== null;
  const admirers = demoDiscover.slice(0, 4);

  return (
    <div>
      <PageHeader title={es.discover.interestedInYou} backHref="/conexiones" />
      <div className="px-4">
        <div className="card border-0 bg-ink text-white">
          <div className="text-xs text-ink-muted">Personas que marcaron interés en ti</div>
          <div className="font-display text-[30px] font-semibold leading-none">
            {admirers.length}
          </div>
        </div>

        {!isPaid ? (
          <Link href="/plus" className="card block border-[1.5px] border-wheat bg-wheat-soft">
            <div className="text-[12.5px] font-semibold text-wheat-text">
              Descubre quiénes son con Yugo Plus
            </div>
            <div className="mt-1 text-[11px] text-wheat-text">
              La cuenta gratuita ve la cantidad; Plus y Oro ven los perfiles completos.
            </div>
          </Link>
        ) : null}

        <div className={isPaid ? '' : 'pointer-events-none select-none blur-sm'}>
          {admirers.map((profile) => (
            <Link
              key={profile.userId}
              href={`/descubrir/${profile.userId}`}
              className="card flex items-center gap-3"
            >
              <Avatar name={profile.displayName} size="m" />
              <div className="min-w-0 flex-1">
                <b className="text-[12.5px]">
                  {profile.displayName}, {profile.age}
                </b>
                <div className="text-[11px] text-muted">
                  {profile.denomination} · {profile.city} · {profile.distanceLabel}
                </div>
              </div>
              <AffinityRing value={profile.affinity.total} size={40} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
