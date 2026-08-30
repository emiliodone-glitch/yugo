'use client';

import Link from 'next/link';
import { demoDiscover, es } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { AffinityRing, Avatar } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

/** "Guardar para después" list (RF-DES-04). */
export default function SavedProfilesPage() {
  const savedProfiles = useDemoStore((s) => s.savedProfiles);
  const saved = demoDiscover.filter((profile) => savedProfiles[profile.userId]);

  return (
    <div>
      <PageHeader title={es.discover.savedProfiles} backHref="/descubrir" />
      <div className="px-4">
        {saved.length === 0 ? (
          <div className="card py-10 text-center text-sm text-muted">
            Todavía no has guardado ningún perfil. Usa &ldquo;{es.discover.saveForLater}&rdquo; en
            Descubrir.
          </div>
        ) : (
          saved.map((profile) => (
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
                  {profile.denomination} · {profile.distanceLabel}
                </div>
              </div>
              <AffinityRing value={profile.affinity.total} size={40} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
