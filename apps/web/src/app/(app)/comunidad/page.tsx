'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es, type GroupSummary } from '@yugo/shared';
import { useGroups, useJoinGroup } from '@/lib/hooks';
import { Avatar, Segment } from '@/components/ui';
import { PrayerWall } from '@/components/devotional';
import { QueryError } from '@/components/query-error';

type TabValue = 'mine' | 'suggested' | 'prayer';

/**
 * Comunidad: mis grupos, los sugeridos y el muro de oración. Todo viene de
 * la API (antes «Mis grupos» pintaba dos tarjetas fijas de demostración con
 * una petición inventada, y «Oración» otra lista fija).
 */
export default function CommunityPage() {
  const [tab, setTab] = useState<TabValue>('mine');
  const groups = useGroups();
  const joinGroup = useJoinGroup();
  const [joined, setJoined] = useState<Record<string, 'joined' | 'pending'>>({});

  const myGroups = groups.data?.mine ?? [];
  const suggested = groups.data?.suggested ?? [];

  const join = async (group: GroupSummary) => {
    const result = await joinGroup.mutateAsync({ groupId: group.id });
    const pending = (result as { pending?: boolean } | null)?.pending;
    setJoined((current) => ({ ...current, [group.id]: pending ? 'pending' : 'joined' }));
  };

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px] lg:text-[24px]">{es.community.title}</h1>
        <Link href="/oracion" className="btn btn-ghost btn-sm w-auto">
          {es.prayer.title}
        </Link>
      </div>

      <div className="mb-3 lg:max-w-xl">
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: 'mine', label: es.community.myGroups },
            { value: 'suggested', label: es.community.suggested },
            { value: 'prayer', label: es.community.prayer },
          ]}
        />
      </div>

      {groups.isError && tab !== 'prayer' ? (
        <QueryError error={groups.error} onRetry={() => void groups.refetch()} />
      ) : null}
      {groups.isLoading && tab !== 'prayer' ? (
        <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
      ) : null}

      {tab === 'mine' && !groups.isLoading ? (
        myGroups.length === 0 ? (
          <div className="card py-8 text-center">
            <p className="text-sm text-muted">{es.community.myGroupsEmpty}</p>
            <button
              type="button"
              className="btn btn-sm btn-olive mt-3 w-auto px-5"
              onClick={() => setTab('suggested')}
            >
              {es.community.seeSuggested}
            </button>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4 xl:grid-cols-3">
            {myGroups.map((group) => (
              <Link
                key={group.id}
                href={`/comunidad/${group.id}`}
                className="card block p-3.5 hover:border-olive"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={group.name} size="m" square />
                    <div className="min-w-0">
                      <b className="block truncate text-[13.5px]">{group.name}</b>
                      <div className="text-[11px] text-muted">
                        {es.community.membersCount(group.memberCount)}
                        {group.postsToday ? ` · ${es.community.postsToday(group.postsToday)}` : ''}
                      </div>
                    </div>
                  </div>
                  {group.isOfficial ? (
                    <span className="inline-flex flex-none items-center rounded-full bg-ink px-2 py-[3px] text-[10.5px] font-semibold text-white">
                      {es.common.official}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="chip">{group.category}</span>
                  {group.churchName ? (
                    <span className="chip chip-olive">{group.churchName}</span>
                  ) : null}
                  {group.city ? <span className="chip">{group.city}</span> : null}
                </div>
                <div className="mt-3 text-[12px] font-semibold text-olive-text">
                  {es.community.openGroup} ›
                </div>
              </Link>
            ))}
          </div>
        )
      ) : null}

      {tab === 'suggested' && !groups.isLoading ? (
        suggested.length === 0 ? (
          <div className="card py-8 text-center text-sm text-muted">
            {es.community.suggestedEmpty}
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-4">
            {suggested.map((group) => {
              const state = joined[group.id];
              return (
                <div key={group.id} className="card flex items-center justify-between gap-3 p-3.5">
                  <Link
                    href={`/comunidad/${group.id}`}
                    className="flex min-w-0 items-center gap-2.5"
                  >
                    <Avatar name={group.name} size="m" square />
                    <div className="min-w-0">
                      <b className="block truncate text-[13.5px]">{group.name}</b>
                      <div className="text-[11px] text-muted">
                        {es.community.membersCount(group.memberCount)}
                        {group.city ? ` · ${group.city}` : ''}
                        {' · '}
                        {group.type === 'APPROVAL' ? es.community.withApproval : es.community.open}
                      </div>
                    </div>
                  </Link>
                  {state === 'joined' ? (
                    <span className="chip chip-olive">{es.community.join} ✓</span>
                  ) : state === 'pending' ? (
                    <span className="chip chip-wheat">{es.church.inReview}</span>
                  ) : (
                    <button
                      type="button"
                      className={`btn btn-sm w-auto px-4 ${group.type === 'APPROVAL' ? 'btn-ghost' : 'btn-olive'}`}
                      disabled={joinGroup.isPending}
                      onClick={() => void join(group)}
                    >
                      {group.type === 'APPROVAL' ? es.community.requestJoin : es.community.join}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {tab === 'prayer' ? (
        <div className="lg:max-w-3xl">
          <PrayerWall showTitle={false} />
        </div>
      ) : null}
    </div>
  );
}
