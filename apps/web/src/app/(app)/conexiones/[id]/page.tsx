'use client';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  demoConnections,
  demoCurrentUser,
  demoIcebreakers,
  es,
} from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { Avatar } from '@/components/ui';
import { CheckIcon, ChevronLeft } from '@/components/icons';

export default function ChatPage({ params }: { params: { id: string } }) {
  const connection = demoConnections.find((c) => c.matchId === params.id);
  if (!connection) notFound();

  const messages = useDemoStore((s) => s.messages[params.id] ?? []);
  const sendMessage = useDemoStore((s) => s.sendMessage);
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const isNew = messages.length === 0;
  const icebreakers = demoIcebreakers[params.id] ?? [
    '¿Qué es lo que más agradeces a Dios este año?',
    '¿Cuál es tu plan perfecto para un sábado libre?',
    '¿Qué canción no falta en tu playlist de adoración?',
  ];

  const handleSend = (text: string) => {
    const body = text.trim();
    if (!body) return;
    const message = sendMessage(params.id, body);
    setDraft('');
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
          <Avatar name={connection.otherUser.displayName} size="s" />
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
              <MenuItem label={es.connections.inviteToEvent} onClick={() => setMenuOpen(false)} />
              <MenuItem label={es.connections.report} onClick={() => setMenuOpen(false)} wine />
              <MenuItem label={es.connections.block} onClick={() => setMenuOpen(false)} wine />
              <MenuItem
                label={es.connections.disconnect}
                onClick={() => {
                  if (window.confirm(es.connections.disconnectConfirm)) setMenuOpen(false);
                  else setMenuOpen(false);
                }}
                wine
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

        {messages.map((message) => {
          const mine = message.senderId === demoCurrentUser.userId;
          const held = message.moderationStatus === 'HELD';
          const rejected = message.moderationStatus === 'REJECTED';
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
              </div>
            </div>
          );
        })}

        {notice ? (
          <div className="my-2 rounded-field bg-wine-soft px-3 py-2 text-center text-[11px] text-wine">
            {notice}
          </div>
        ) : null}

        <p className="my-2 text-center text-[11px] text-muted">{es.connections.chatRules}</p>
        <div ref={bottomRef} />
      </div>

      {/* Composer — text only in the MVP (RF-CON-05) */}
      <form
        className="flex items-center gap-2 border-t border-line bg-white px-3.5 py-2.5 pb-[76px] md:pb-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          handleSend(draft);
        }}
      >
        <input
          className="field flex-1"
          placeholder={es.connections.writeMessage}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
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
