'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useProposeIntroduction, useProposedIntroductions } from '@/lib/hooks';

/**
 * Presentación por padrino (RF-ACO-05), del lado del padrino: dos personas
 * que conoce, una nota con el porqué, y la lista de lo que propuso con su
 * resultado. Nunca ve quién dijo que no.
 */
export function ProposeIntroduction({ enabled }: { enabled: boolean }) {
  const proposed = useProposedIntroductions(enabled);
  const propose = useProposeIntroduction();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<{ tone: 'olive' | 'wine'; text: string } | null>(null);

  const valid = a.trim().length >= 3 && b.trim().length >= 3 && note.trim().length >= 20;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setNotice(null);
    try {
      await propose.mutateAsync({ a: a.trim(), b: b.trim(), note: note.trim() });
      setA('');
      setB('');
      setNote('');
      setNotice({ tone: 'olive', text: es.accompaniment.introSent });
    } catch (caught) {
      const message = errorMessage(caught);
      const key = Object.keys(es.accompaniment.introErrors).find((code) => message.includes(code));
      setNotice({ tone: 'wine', text: key ? es.accompaniment.introErrors[key] : message });
    }
  };

  if (!enabled) return null;

  return (
    <section aria-labelledby="intro-title" className="mt-4">
      <form className="card" onSubmit={submit}>
        <h2 id="intro-title" className="text-[13px] font-semibold">
          {es.accompaniment.introTitle}
        </h2>
        <p className="mb-2 mt-1 text-[11.5px] text-muted">{es.accompaniment.introIntro}</p>
        <label className="mb-1 block text-[11px] text-muted" htmlFor="intro-a">
          {es.accompaniment.introPersonA}
        </label>
        <input
          id="intro-a"
          className="field mb-2 w-full"
          value={a}
          autoComplete="off"
          onChange={(event) => setA(event.target.value)}
        />
        <label className="mb-1 block text-[11px] text-muted" htmlFor="intro-b">
          {es.accompaniment.introPersonB}
        </label>
        <input
          id="intro-b"
          className="field mb-2 w-full"
          value={b}
          autoComplete="off"
          onChange={(event) => setB(event.target.value)}
        />
        <label className="mb-1 block text-[11px] text-muted" htmlFor="intro-note">
          {es.accompaniment.introNote}
        </label>
        <textarea
          id="intro-note"
          className="field mb-2 w-full"
          rows={3}
          maxLength={500}
          placeholder={es.accompaniment.introNotePlaceholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {notice ? (
          <p
            role={notice.tone === 'wine' ? 'alert' : 'status'}
            className={`mb-2 text-[12px] ${notice.tone === 'wine' ? 'text-wine' : 'text-olive-text'}`}
          >
            {notice.text}
          </p>
        ) : null}
        <button
          type="submit"
          className="btn btn-olive btn-sm w-auto px-4"
          disabled={!valid || propose.isPending}
        >
          {es.accompaniment.introSend}
        </button>
      </form>

      {(proposed.data ?? []).length > 0 ? (
        <>
          <div className="mb-1.5 mt-4 text-[10.5px] font-semibold tracking-[0.06em] text-muted">
            {es.accompaniment.introMine.toUpperCase()}
          </div>
          {(proposed.data ?? []).map((item) => (
            <div key={item.id} className="card mb-2">
              <div className="flex items-center justify-between gap-2">
                <b className="text-[12.5px]">{item.names.join(' y ')}</b>
                <span
                  className={`chip ${
                    item.status === 'MATCHED'
                      ? 'chip-olive'
                      : item.status === 'PENDING'
                        ? 'chip-wheat'
                        : ''
                  }`}
                >
                  {es.accompaniment.introStatus[item.status]}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-muted">«{item.note}»</p>
            </div>
          ))}
        </>
      ) : null}
    </section>
  );
}
