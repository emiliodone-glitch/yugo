'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useSavedProfiles } from '@/lib/hooks';
import { AffinityRing, Avatar } from '@/components/ui';
import { PageHeader } from '@/components/page-header';
import { ListSkeleton } from '@/components/skeleton';
import { QueryError } from '@/components/query-error';

/** "Guardar para después" list (RF-DES-04): los perfiles guardados de la cuenta. */
export default function SavedProfilesPage() {
  const saved = useSavedProfiles();
  const profiles = saved.data ?? [];

  return (
    <div>
      <PageHeader title={es.discover.savedProfiles} backHref="/descubrir" />
      <div className="px-4">
        {saved.isLoading ? <ListSkeleton rows={3} /> : null}
        {saved.isError ? (
          <QueryError error={saved.error} onRetry={() => void saved.refetch()} />
        ) : null}
        {!saved.isLoading && !saved.isError && profiles.length === 0 ? (
          <div className="card py-10 text-center text-sm text-muted">
            Todavía no has guardado ningún perfil. Usa &ldquo;{es.discover.saveForLater}&rdquo; en
            Descubrir.
            <div className="mt-3">
              <Link href="/descubrir" className="btn btn-sm btn-ghost w-auto px-4">
                {es.discover.title}
              </Link>
            </div>
          </div>
        ) : null}
        {profiles.map((profile) => (
          <Link
            key={profile.userId}
            href={`/descubrir/${profile.userId}`}
            className="card flex items-center gap-3"
          >
            <Avatar name={profile.displayName} size="m" photoUrl={profile.photoUrl} />
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
        ))}
      </div>
    </div>
  );
}
