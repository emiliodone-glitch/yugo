'use client';

import { notFound } from 'next/navigation';
import { useState } from 'react';
import { demoCurrentUser, es } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { useCreatePost, useGroupDetail, useJoinRequests } from '@/lib/hooks';
import { Avatar, Segment } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

type Tab = 'wall' | 'activities' | 'members';

/** Group detail with moderated wall, prayer requests and activities. */
export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const { data: group, isLoading } = useGroupDetail(params.id);
  const createPost = useCreatePost(params.id);

  const [tab, setTab] = useState<Tab>('wall');
  const [draft, setDraft] = useState('');
  const [isPrayer, setIsPrayer] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [localPosts, setLocalPosts] = useState<
    Array<{ id: string; body: string; isPrayer: boolean; held: boolean }>
  >([]);
  const { praying, amen, togglePraying, toggleAmen, activityJoined, toggleActivity } = useDemoStore();

  const isAdmin = group?.myRole === 'ADMIN' || group?.myRole === 'MODERATOR';
  const { data: joinRequests = [] } = useJoinRequests(params.id, !!isAdmin);

  if (isLoading) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }
  if (!group) notFound();

  const posts = group.posts;
  const activities = group.activities;

  const publish = async () => {
    const body = draft.trim();
    if (!body) return;
    // Every post is classified before it is published (RF-COM-08).
    const result = await createPost.mutateAsync({ body, isPrayerRequest: isPrayer });
    const held = result.moderationStatus !== 'APPROVED';
    setLocalPosts((current) => [{ id: result.id, body, isPrayer, held }, ...current]);
    setNotice(
      held ? 'Tu publicación está en revisión: la moderación la revisa antes de mostrarla.' : null,
    );
    setDraft('');
    setIsPrayer(false);
  };

  return (
    <div>
      <PageHeader
        title={group.name}
        backHref="/comunidad"
        right={
          group.isOfficial ? (
            <span className="inline-flex items-center rounded-full bg-ink px-2 py-[3px] text-[10.5px] font-semibold text-white">
              {es.common.official}
            </span>
          ) : null
        }
      />
      <div className="px-4">
        <div className="mb-3 flex items-center gap-2.5">
          <Avatar name={group.name} size="m" square />
          <div>
            <div className="text-[11px] text-muted">
              {es.community.membersCount(group.memberCount)}
              {group.city ? ` · ${group.city}` : ''}
            </div>
            <div className="text-[11px] text-muted">
              {group.category}
              {group.churchName ? ` · ${group.churchName}` : ''}
            </div>
          </div>
        </div>

        <div className="mb-3">
          <Segment
            value={tab}
            onChange={setTab}
            options={[
              { value: 'wall', label: 'Muro' },
              { value: 'activities', label: 'Actividades' },
              {
                value: 'members',
                label: isAdmin && joinRequests.length > 0 ? `Miembros (${joinRequests.length})` : 'Miembros',
              },
            ]}
          />
        </div>

        {tab === 'wall' ? (
          <>
            {/* Composer — text and one image; every post is moderated (RF-COM-04/08) */}
            <div className="card">
              <textarea
                className="field h-20 resize-none"
                placeholder="Comparte algo con el grupo…"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                maxLength={1200}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-muted">
                  <input
                    type="checkbox"
                    checked={isPrayer}
                    onChange={(event) => setIsPrayer(event.target.checked)}
                    className="accent-olive"
                  />
                  {es.community.newPrayerRequest}
                </label>
                <button type="button" className="btn btn-sm btn-olive" onClick={publish}>
                  Publicar
                </button>
              </div>
            </div>

            {notice ? (
              <div className="mb-3 rounded-field bg-wheat-soft px-3 py-2 text-[11px] text-wheat-text">
                {notice}
              </div>
            ) : null}

            {localPosts.map((post) => (
              <div key={post.id} className={`card ${post.held ? 'border-dashed border-wheat' : ''}`}>
                <div className="flex items-center gap-2.5">
                  <Avatar name={demoCurrentUser.displayName} size="s" />
                  <div>
                    <b className="text-xs">{demoCurrentUser.displayName}</b>
                    <div className="text-[11px] text-muted">
                      {post.held ? 'En revisión' : 'hace un momento'}
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-[12.5px]">{post.body}</p>
              </div>
            ))}

            {posts.map((post) => (
              <div key={post.id} className="card">
                <div className="flex items-center gap-2.5">
                  <Avatar name={post.author.displayName} size="s" />
                  <div>
                    <b className="text-xs">{post.author.displayName}</b>
                    <div className="text-[11px] text-muted">
                      {new Intl.DateTimeFormat('es-DO', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'America/Santo_Domingo',
                      }).format(new Date(post.createdAt))}
                    </div>
                  </div>
                </div>
                <p className="mt-1.5 text-[12.5px]">{post.body}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {post.isPrayerRequest ? (
                    <button
                      type="button"
                      onClick={() => togglePraying(post.id)}
                      className={`chip chip-olive ${praying[post.id] ? 'ring-1 ring-olive' : ''}`}
                    >
                      🙏 {es.community.praying} · {post.prayingCount + (praying[post.id] ? 1 : 0)}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => toggleAmen(post.id)} className="chip">
                    {es.community.amen} · {post.amenCount + (amen[post.id] ? 1 : 0)}
                  </button>
                </div>
              </div>
            ))}
          </>
        ) : null}

        {tab === 'activities' ? (
          activities.length === 0 ? (
            <div className="card py-8 text-center text-sm text-muted">
              Este grupo aún no tiene actividades programadas.
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="chip chip-wheat">{es.community.activityChip}</span>
                  <span className="text-[11px] capitalize text-muted">
                    {new Intl.DateTimeFormat('es-DO', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'America/Santo_Domingo',
                    }).format(new Date(activity.startsAt))}
                  </span>
                </div>
                <b className="mt-1 block text-[12.5px]">{activity.title}</b>
                {activity.place ? (
                  <div className="text-[11px] text-muted">{activity.place}</div>
                ) : null}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-muted">
                    {es.community.goingCount(
                      activity.goingCount + (activityJoined[activity.id] ? 1 : 0),
                    )}
                  </span>
                  <button
                    type="button"
                    className={`btn btn-sm ${activityJoined[activity.id] ? 'bg-olive-text' : 'btn-olive'}`}
                    onClick={() => toggleActivity(activity.id)}
                  >
                    {activityJoined[activity.id] ? 'Apuntado ✓' : es.community.joinActivity}
                  </button>
                </div>
              </div>
            ))
          )
        ) : null}

        {tab === 'members' ? (
          <>
            {/* RF-COM-02: cola de solicitudes para grupos con aprobación */}
            {isAdmin && joinRequests.length > 0 ? (
              <div className="card">
                <b className="text-[12.5px]">Solicitudes pendientes</b>
                {joinRequests.map((request) => (
                  <div key={request.id} className="list-row">
                    <Avatar name={request.displayName} size="s" />
                    <div className="min-w-0 flex-1">
                      <b className="text-[12.5px]">{request.displayName}</b>
                      <div className="text-[11px] text-muted">
                        {request.city ? `${request.city} · ` : ''}Nivel {request.verificationLevel}
                      </div>
                      {request.message ? (
                        <div className="mt-0.5 text-[11px] text-muted">{request.message}</div>
                      ) : null}
                    </div>
                    <button type="button" className="btn btn-sm btn-olive">
                      Aceptar
                    </button>
                    <button type="button" className="btn btn-sm btn-ghost">
                      Rechazar
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="card">
              <div className="text-[12.5px] text-muted">
                {es.community.membersCount(group.memberCount)}. Los administradores del grupo pueden
                silenciar o expulsar miembros y reciben los reportes de su grupo (RF-COM-07/08).
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
