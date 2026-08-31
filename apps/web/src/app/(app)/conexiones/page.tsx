'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useConnections, useSafetyTips, useWhoMarkedMe } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { StarIcon, CheckIcon } from '@/components/icons';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat('es-DO', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Santo_Domingo',
    }).format(date);
  }
  const yesterday = new Date(now.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return es.common.yesterday;
  return new Intl.DateTimeFormat('es-DO', { weekday: 'short', timeZone: 'America/Santo_Domingo' })
    .format(date)
    .replace('.', '');
}

export default function ConnectionsPage() {
  const { data: connections = [], isLoading } = useConnections();
  const { data: whoMarked } = useWhoMarkedMe();
  const { data: safety } = useSafetyTips();

  const fresh = connections.filter((c) => c.isNew);
  const conversations = connections.filter((c) => !c.isNew);

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px]">{es.connections.title}</h1>
        <Link href="/descubrir/te-interesa" className="chip chip-wheat">
          <StarIcon className="h-[11px] w-[11px]" />
          {es.discover.interestedCount(whoMarked?.count ?? 0)}
        </Link>
      </div>

      {isLoading ? (
        <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
      ) : null}

      {/* New connections */}
      <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
        {es.connections.newSection}
      </div>
      <div className="mb-3.5 flex gap-3">
        {fresh.map((connection) => (
          <Link
            key={connection.matchId}
            href={`/conexiones/${connection.matchId}`}
            className="text-center"
          >
            <Avatar
              name={connection.otherUser.displayName}
              size="m"
              highlight
              photoUrl={connection.otherUser.photoUrl}
            />
            <div className="mt-1 text-[11px] text-muted">{connection.otherUser.displayName}</div>
          </Link>
        ))}
      </div>

      {/* Conversations */}
      <div className="mb-0.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
        {es.connections.conversations}
      </div>
      <div>
        {conversations.map((connection) => (
          <Link key={connection.matchId} href={`/conexiones/${connection.matchId}`} className="list-row">
            <Avatar
              name={connection.otherUser.displayName}
              size="m"
              photoUrl={connection.otherUser.photoUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <b className="text-[12.5px]">{connection.otherUser.displayName}</b>
                {connection.lastMessage ? (
                  <span className="text-[11px] text-muted">{formatTime(connection.lastMessage.sentAt)}</span>
                ) : null}
              </div>
              <div className="truncate text-xs text-muted">
                {connection.lastMessage
                  ? `${connection.lastMessage.mine ? `${es.common.you}: ` : ''}${connection.lastMessage.body}`
                  : es.connections.newConnectionToday}
              </div>
            </div>
            {connection.unreadCount > 0 ? (
              <span className="h-2 w-2 flex-none rounded-full bg-wine" aria-label="No leído" />
            ) : connection.otherUser.badges.endorsedBy ? (
              <span className="inline-flex flex-none items-center gap-1 rounded-full bg-ink px-2 py-[3px] text-[10.5px] font-semibold text-white">
                <CheckIcon className="h-[11px] w-[11px]" />
                {es.common.verified}
              </span>
            ) : null}
          </Link>
        ))}
      </div>

      {/* Safety tips before a first date (RF-SEG-06) */}
      <div className="card mt-3.5 border-0 bg-olive-soft">
        <div className="text-[12.5px] font-semibold text-olive-text">
          {safety?.firstConnection.title ?? es.connections.safetyTitle}
        </div>
        <div className="mt-1 text-[11px] text-olive-text">
          {safety?.firstConnection.points.slice(0, 3).join(' ') ?? es.connections.safetyBody}
        </div>
      </div>
    </div>
  );
}
