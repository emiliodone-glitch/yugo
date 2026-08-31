'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { es } from '@yugo/shared';
import {
  useBlockUser,
  useConnections,
  useConversation,
  useDisconnect,
  useEvents,
  useInviteToEvent,
  useReport,
  useSendMessage,
  useCurrentUserId,
  useConversationRealtime,
} from '@/lib/hooks';
import { Avatar } from '@/components/ui';
import {
  AccompanimentCard,
  MeetingPlanCard,
  OurStoryCard,
  RelationshipStageCard,
} from '@/components/relationship';
import { CheckIcon, ChevronLeft } from '@/components/icons';

export default function ChatPage({ params }: { params: { id: string } }) {
  const { data: connections = [], isLoading: connectionsLoading } = useConnections();
  const { data: conversation } = useConversation(params.id);
  const { data: events = [] } = useEvents();
  const sendMessage = useSendMessage(params.id);
  const inviteToEvent = useInviteToEvent(params.id);
  const report = useReport();
  const blockUser = useBlockUser();
  const disconnect = useDisconnect();

  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const connection =
    connections.find((c) => (c.conversationId ?? c.matchId) === params.id) ?? connections[0];
  const messages = conversation?.messages ?? [];
  const icebreakers = conversation?.icebreakers ?? [];
  const currentUserId = useCurrentUserId();
  // RF-CON-03: el mensaje llega solo, sin recargar.
  const { otherIsTyping, theyReadAt, notifyTyping } = useConversationRealtime(
    params.id,
    currentUserId,
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Wait for the list before deciding the conversation does not exist,
  // otherwise the first render 404s while the query is still in flight.
  if (connectionsLoading) {
    return <div className="px-4 pt-10 text-center text-sm text-muted">{es.common.loading}</div>;
  }
  if (!connection) notFound();

  const isNew = messages.length === 0;

  const handleSend = async (text: string) => {
    const body = text.trim();
    if (!body) return;
    setDraft('');
    const message = await sendMessage.mutateAsync(body);
    if (message.moderationStatus === 'HELD') setNotice(es.connections.messageHeld);
    else if (message.moderationStatus === 'REJECTED') setNotice(es.connections.messageRejected);
    else setNotice(null);
  };

  return (
    <div className="flex h-dvh flex-col md:h-[calc(100dvh-0px)]">
      {/* Chat header */}
      <div className="flex items-center justify-between border-b border-line bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Link href="/conexiones" aria-label={es.common.back} className="p-1">
            <ChevronLeft className="h-5 w-5 text-ink" />
          </Link>
          <Avatar
            name={connection.otherUser.displayName}
            size="s"
            photoUrl={connection.otherUser.photoUrl}
          />
          <div>
            <b className="text-[12.5px]">{connection.otherUser.displayName}</b>
            {connection.otherUser.churchName ? (
              <div className="flex items-center gap-1 text-[11px] text-muted">
                <CheckIcon className="h-2.5 w-2.5 text-olive" />
                {connection.otherUser.churchName}
              </div>
            ) : null}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            aria-label="Opciones"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] border border-line bg-white text-ink"
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-10 z-30 w-52 rounded-field border border-line bg-white py-1 shadow-raised">
              <MenuItem
                label={es.connections.inviteToEvent}
                onClick={() => {
                  setMenuOpen(false);
                  setEventPickerOpen(true);
                }}
              />
              <MenuItem
                label={es.connections.report}
                wine
                onClick={() => {
                  setMenuOpen(false);
                  report.mutate({
                    targetType: 'PROFILE',
                    targetId: connection.otherUser.userId,
                    category: 'INAPPROPRIATE',
                  });
                  setNotice('Reporte enviado. El equipo de moderación lo revisará.');
                }}
              />
              <MenuItem
                label={es.connections.block}
                wine
                onClick={() => {
                  setMenuOpen(false);
                  blockUser.mutate(connection.otherUser.userId);
                  setNotice('Bloqueaste a esta persona.');
                }}
              />
              <MenuItem
                label={es.connections.disconnect}
                wine
                onClick={() => {
                  setMenuOpen(false);
                  if (window.confirm(es.connections.disconnectConfirm)) {
                    disconnect.mutate(connection.matchId);
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2">
        <div className="my-3 text-center">
          <span className="chip chip-wheat">{es.connections.newConnectionToday}</span>
        </div>

        <RelationshipStageCard
          matchId={connection.matchId}
          otherName={connection.otherUser.displayName}
        />
        <AccompanimentCard matchId={connection.matchId} />
        <OurStoryCard matchId={connection.matchId} />
        <MeetingPlanCard matchId={connection.matchId} />

        {isNew || messages.length <= 3 ? (
          <div className="card mb-3 border-0 bg-wheat-soft">
            <div className="mb-2 text-[11px] font-semibold text-wheat-text">
              {es.connections.icebreakers}
            </div>
            {icebreakers.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => handleSend(question)}
                className="mb-1.5 block w-full rounded-[10px] bg-white px-2.5 py-2 text-left text-[12.5px] last:mb-0 hover:bg-linen"
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((message, index) => {
          const mine = message.senderId === currentUserId;
          const held = message.moderationStatus === 'HELD';
          const rejected = message.moderationStatus === 'REJECTED';
          // El acuse va solo bajo el último mensaje propio entregado: repetirlo
          // en cada burbuja es ruido.
          const isLastMine =
            mine &&
            !held &&
            !rejected &&
            !messages.slice(index + 1).some((later) => later.senderId === currentUserId);
          const receipt = isLastMine
            ? theyReadAt || message.readAt
              ? es.connections.read
              : message.deliveredAt
                ? es.connections.delivered
                : null
            : null;
          return (
            <div key={message.id} className={`mb-2 flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-[12.5px] leading-snug ${
                  mine
                    ? rejected
                      ? 'bg-wine-soft text-wine line-through'
                      : held
                        ? 'border border-dashed border-wheat bg-wheat-soft text-wheat-text'
                        : 'rounded-br-[4px] bg-ink text-white'
                    : 'rounded-bl-[4px] border border-line bg-white'
                }`}
              >
                {message.body}
                {held ? <div className="mt-1 text-[10px] not-italic">⏳ {es.connections.messageHeld}</div> : null}
                {receipt ? (
                  <div className="mt-1 text-right text-[10px] text-white/70">{receipt}</div>
                ) : null}
              </div>
            </div>
          );
        })}

        {notice ? (
          <div className="my-2 rounded-field bg-wine-soft px-3 py-2 text-center text-[11px] text-wine">
            {notice}
          </div>
        ) : null}

        {/* RF-CON-10: invitar a un evento de la agenda */}
        {eventPickerOpen ? (
          <div className="card border-[1.5px] border-wheat">
            <div className="mb-2 flex items-center justify-between">
              <b className="text-[12.5px]">{es.connections.inviteToEvent}</b>
              <button
                type="button"
                className="text-[11px] text-muted underline"
                onClick={() => setEventPickerOpen(false)}
              >
                {es.common.cancel}
              </button>
            </div>
            {events.slice(0, 4).map((event) => (
              <button
                key={event.id}
                type="button"
                className="mb-1.5 block w-full rounded-[10px] bg-white px-2.5 py-2 text-left text-[12.5px] last:mb-0 hover:bg-linen"
                onClick={async () => {
                  await inviteToEvent.mutateAsync({ id: event.id, title: event.title });
                  setEventPickerOpen(false);
                }}
              >
                {event.title}
                <span className="block text-[11px] text-muted">{event.churchName}</span>
              </button>
            ))}
          </div>
        ) : null}

        <p className="my-2 text-center text-[11px] text-muted">{es.connections.chatRules}</p>
        <div ref={bottomRef} />
      </div>

      {/* Composer — text only in the MVP (RF-CON-05) */}
      <form
        className="relative flex items-center gap-2 border-t border-line bg-white px-3.5 py-2.5 pb-[76px] md:pb-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(draft);
        }}
      >
        {otherIsTyping ? (
          <span
            className="absolute -top-5 left-4 text-[11px] italic text-muted"
            aria-live="polite"
          >
            {connection.otherUser.displayName} {es.connections.typing}
          </span>
        ) : null}
        <input
          className="field flex-1"
          placeholder={es.connections.writeMessage}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            notifyTyping(event.target.value.length > 0);
          }}
          onBlur={() => notifyTyping(false)}
          maxLength={2000}
        />
        <button type="submit" className="btn btn-sm">
          {es.common.send}
        </button>
      </form>
    </div>
  );
}

function MenuItem({ label, onClick, wine }: { label: string; onClick: () => void; wine?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3.5 py-2 text-left text-[12.5px] hover:bg-linen ${
        wine ? 'text-wine' : 'text-body'
      }`}
    >
      {label}
    </button>
  );
}
