'use client';

import Link from 'next/link';
import { es, intlLocale } from '@yugo/shared';
import { ListSkeleton } from './skeleton';
import { useConnections, useSafetyTips, useWhoMarkedMe } from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import { StarIcon, CheckIcon } from '@/components/icons';
import { IntroductionsCard } from '@/components/introductions-card';

function formatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat(intlLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Santo_Domingo',
    }).format(date);
  }
  const yesterday = new Date(now.getTime() - 86400000);
  if (date.toDateString() === yesterday.toDateString()) return es.common.yesterday;
  return new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(date)
    .replace('.', '');
}

/**
 * La lista de conexiones y conversaciones.
 *
 * Es un componente aparte porque en pantalla ancha vive junto al chat, como
 * columna izquierda, y en el teléfono es la pantalla entera. `activeId`
 * resalta la conversación abierta para que, con la lista a la vista, se sepa
 * cuál se está leyendo.
 */
export function ConnectionsList({ activeId }: { activeId?: string }) {
  const { data: connections = [], isLoading } = useConnections();
  const { data: whoMarked } = useWhoMarkedMe();
  const { data: safety } = useSafetyTips();

  const fresh = connections.filter((c) => c.isNew);
  const conversations = connections.filter((c) => !c.isNew);
  const hrefFor = (connection: (typeof connections)[number]) =>
    `/conexiones/${connection.conversationId ?? connection.matchId}`;
  const isActive = (connection: (typeof connections)[number]) =>
    !!activeId && (connection.conversationId === activeId || connection.matchId === activeId);

  return (
    <div className="px-4 pt-3">
      <div className="flex items-center justify-between pb-2">
        <h1 className="h-display text-[19px]">{es.connections.title}</h1>
        <Link href="/descubrir/te-interesa" className="chip chip-wheat">
          <StarIcon className="h-[11px] w-[11px]" />
          {es.discover.interestedCount(whoMarked?.count ?? 0)}
        </Link>
      </div>

      {isLoading ? <ListSkeleton rows={5} /> : null}

      {/* Presentación por padrino (RF-ACO-05): se responde desde aquí */}
      <IntroductionsCard />

      {/* New connections */}
      <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
        {es.connections.newSection}
      </div>
      <div className="mb-3.5 flex gap-3 overflow-x-auto">
        {fresh.map((connection) => (
          <Link
            key={connection.matchId}
            href={hrefFor(connection)}
            aria-current={isActive(connection) ? 'page' : undefined}
            className={`rounded-card text-center ${isActive(connection) ? 'ring-2 ring-wheat ring-offset-2' : ''}`}
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
          <Link
            key={connection.matchId}
            href={hrefFor(connection)}
            aria-current={isActive(connection) ? 'page' : undefined}
            className={`list-row -mx-2 px-2 ${isActive(connection) ? 'rounded-field bg-linen-2' : ''}`}
          >
            <Avatar
              name={connection.otherUser.displayName}
              size="m"
              photoUrl={connection.otherUser.photoUrl}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <b className="text-[12.5px]">{connection.otherUser.displayName}</b>
                {connection.lastMessage ? (
                  <span className="text-[11px] text-muted">
                    {formatTime(connection.lastMessage.sentAt)}
                  </span>
                ) : null}
              </div>
              <div className="truncate text-xs text-muted">
                {connection.lastMessage
                  ? `${connection.lastMessage.mine ? `${es.common.you}: ` : ''}${connection.lastMessage.body}`
                  : es.connections.newConnectionToday}
              </div>
              {/* La etapa solo se muestra cuando el vínculo avanzó: decir
                  «Conociéndonos» en todas las filas no informa nada. */}
              {connection.stage && connection.stage !== 'KNOWING' ? (
                <span className="chip chip-wheat mt-1">
                  {es.relationship.stages[connection.stage]}
                </span>
              ) : connection.stageProposalPending ? (
                <span className="chip chip-wheat mt-1">{es.relationship.pendingChip}</span>
              ) : null}
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
