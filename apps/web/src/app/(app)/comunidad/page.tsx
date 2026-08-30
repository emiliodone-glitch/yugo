'use client';

import Link from 'next/link';
import { useState } from 'react';
import { demoActivities, demoPosts } from '@yugo/shared';
import { es } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { useGroups, useJoinGroup } from '@/lib/hooks';
import { Avatar, Segment } from '@/components/ui';

type TabValue = 'mine' | 'suggested' | 'prayer';

function formatActivityDate(iso: string): string {
  return new Intl.DateTimeFormat('es-DO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));
}

export default function CommunityPage() {
  const [tab, setTab] = useState<TabValue>('mine');
  const { praying, amen, togglePraying, toggleAmen, activityJoined, toggleActivity } = useDemoStore();

  const { data: groups, isLoading } = useGroups();
  const joinGroup = useJoinGroup();

  const myGroups = groups?.mine ?? [];
  const suggested = groups?.suggested ?? [];
  const prayerPosts = demoPosts.filter((p) => p.isPrayerRequest);
  const post = demoPosts[0];
  const activity = demoActivities[0];

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px]">{es.community.title}</h1>
        <button type="button" className="btn btn-ghost btn-sm">
          {es.community.createGroup}
        </button>
      </div>

      <div className="mb-3">
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

      {isLoading ? (
        <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
      ) : null}

      {tab === 'mine' && myGroups.length >= 2 ? (
        <>
          {/* Official group with prayer request (mockup) */}
          <div className="card p-3">
            <div className="flex items-center justify-between">
              <Link href={`/comunidad/${myGroups[0].id}`} className="flex items-center gap-2.5">
                <Avatar name={myGroups[0].name} size="s" square />
                <div>
                  <b className="text-[12.5px]">{myGroups[0].name}</b>
                  <div className="text-[11px] text-muted">
                    {es.community.membersCount(myGroups[0].memberCount)} ·{' '}
                    {es.community.postsToday(myGroups[0].postsToday ?? 0)}
                  </div>
                </div>
              </Link>
              <span className="inline-flex items-center rounded-full bg-ink px-2 py-[3px] text-[10.5px] font-semibold text-white">
                {es.common.official}
              </span>
            </div>
            <div className="mt-2.5 border-t border-line pt-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={post.author.displayName} size="s" />
                <div>
                  <b className="text-xs">{post.author.displayName}</b>
                  <div className="text-[11px] text-muted">hace 2 h</div>
                </div>
              </div>
              <p className="mt-1.5 text-[12.5px]">{post.body}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => togglePraying(post.id)}
                  className={`chip ${praying[post.id] ? 'chip-olive ring-1 ring-olive' : 'chip-olive'}`}
                >
                  🙏 {es.community.praying} · {post.prayingCount + (praying[post.id] ? 1 : 0)}
                </button>
                <button type="button" onClick={() => toggleAmen(post.id)} className="chip">
                  {es.community.amen} · {post.amenCount + (amen[post.id] ? 1 : 0)}
                </button>
              </div>
            </div>
          </div>

          {/* Group with activity */}
          <div className="card p-3">
            <Link href={`/comunidad/${myGroups[1].id}`} className="flex items-center gap-2.5">
              <Avatar name={myGroups[1].name} size="s" square />
              <div>
                <b className="text-[12.5px]">{myGroups[1].name}</b>
                <div className="text-[11px] text-muted">
                  {es.community.membersCount(myGroups[1].memberCount)}
                </div>
              </div>
            </Link>
            <div className="mt-2.5 rounded-field bg-linen-2 p-2.5">
              <div className="flex items-center justify-between">
                <span className="chip chip-wheat">{es.community.activityChip}</span>
                <span className="text-[11px] capitalize text-muted">
                  {formatActivityDate(activity.startsAt)}
                </span>
              </div>
              <b className="mt-1 block text-[12.5px]">{activity.title}</b>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[11px] text-muted">
                  {es.community.goingCount(activity.goingCount + (activityJoined[activity.id] ? 1 : 0))}
                </span>
                <button
                  type="button"
                  onClick={() => toggleActivity(activity.id)}
                  className={`btn btn-sm ${activityJoined[activity.id] ? 'bg-olive-text' : 'btn-olive'}`}
                >
                  {activityJoined[activity.id] ? 'Apuntado ✓' : es.community.joinActivity}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'suggested'
        ? suggested.map((group) => (
            <div key={group.id} className="card flex items-center justify-between p-3">
              <Link href={`/comunidad/${group.id}`} className="flex items-center gap-2.5">
                <Avatar name={group.name} size="s" square />
                <div>
                  <b className="text-[12.5px]">{group.name}</b>
                  <div className="text-[11px] text-muted">
                    {es.community.membersCount(group.memberCount)}
                    {group.city ? ` · ${group.city}` : ''}
                  </div>
                </div>
              </Link>
              {group.type === 'APPROVAL' ? (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost"
                  onClick={() => joinGroup.mutate({ groupId: group.id })}
                >
                  {es.community.requestJoin}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-sm btn-olive"
                  onClick={() => joinGroup.mutate({ groupId: group.id })}
                >
                  {es.community.join}
                </button>
              )}
            </div>
          ))
        : null}

      {tab === 'prayer'
        ? prayerPosts.map((prayer) => (
            <div key={prayer.id} className="card p-3">
              <div className="flex items-center gap-2.5">
                <Avatar name={prayer.author.displayName} size="s" />
                <div>
                  <b className="text-xs">{prayer.author.displayName}</b>
                  <div className="text-[11px] text-muted">Jóvenes adultos SDE</div>
                </div>
              </div>
              <p className="mt-1.5 text-[12.5px]">{prayer.body}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => togglePraying(prayer.id)}
                  className="chip chip-olive"
                >
                  🙏 {es.community.praying} · {prayer.prayingCount + (praying[prayer.id] ? 1 : 0)}
                </button>
                <button type="button" onClick={() => toggleAmen(prayer.id)} className="chip">
                  {es.community.amen} · {prayer.amenCount + (amen[prayer.id] ? 1 : 0)}
                </button>
              </div>
            </div>
          ))
        : null}
    </div>
  );
}
