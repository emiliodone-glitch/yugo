'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useIntroductions, useRespondIntroduction } from '@/lib/hooks';

/**
 * Presentación por padrino (RF-ACO-05), del lado de quien la recibe.
 *
 * Lo que se ve antes de decir que sí: quién presenta, su nota y la iglesia de
 * la otra persona. Nada que la identifique. Si dices que no, nadie sabrá que
 * fuiste tú; si los dos dicen que sí, nace la conexión y se abre el chat.
 */
export function IntroductionsCard() {
  const router = useRouter();
  const { data: introductions = [] } = useIntroductions();
  const respond = useRespondIntroduction();
  const [notice, setNotice] = useState<string | null>(null);

  if (introductions.length === 0 && !notice) return null;

  const answer = async (id: string, accept: boolean) => {
    setNotice(null);
    try {
      const result = await respond.mutateAsync({ id, accept });
      if (result.matched) {
        setNotice(es.accompaniment.introMatched);
        if (result.conversationId) router.push(`/conexiones/${result.conversationId}`);
      } else if (accept) {
        setNotice(es.accompaniment.introWaitingOther);
      } else {
        setNotice(es.accompaniment.introDeclined);
      }
    } catch (caught) {
      setNotice(errorMessage(caught));
    }
  };

  return (
    <section aria-label={es.accompaniment.introReceivedTitle} className="mb-3">
      {notice ? (
        <p
          role="status"
          className="mb-2 rounded-field bg-olive-soft px-3 py-2 text-[12px] text-olive-text"
        >
          {notice}
        </p>
      ) : null}
      {introductions.map((item) => (
        <article key={item.id} className="card mb-2 border-[1.5px] border-wheat">
          <div className="text-[10.5px] font-semibold tracking-[0.06em] text-wheat-text">
            {es.accompaniment.introReceivedTitle.toUpperCase()}
          </div>
          <b className="mt-1 block text-[13px]">
            {es.accompaniment.introReceivedBy(item.proposer.displayName)}
          </b>
          <p className="mt-1 text-[12.5px] leading-relaxed">«{item.note}»</p>
          <p className="mt-1.5 text-[11.5px] text-muted">
            {es.accompaniment.introReceivedHint(item.otherHint.churchName, item.otherHint.city)}.{' '}
            {es.accompaniment.introReceivedRule}
          </p>
          {item.myStatus === 'ACCEPTED' ? (
            <p className="mt-2 text-[12px] font-semibold text-olive-text">
              {es.accompaniment.introWaitingOther}
            </p>
          ) : (
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                className="btn btn-olive btn-sm w-auto px-4"
                disabled={respond.isPending}
                onClick={() => void answer(item.id, true)}
              >
                {es.accompaniment.introAccept}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm w-auto px-3"
                disabled={respond.isPending}
                onClick={() => void answer(item.id, false)}
              >
                {es.accompaniment.introDecline}
              </button>
            </div>
          )}
        </article>
      ))}
    </section>
  );
}
