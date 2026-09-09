'use client';

import { es, intlLocale } from '@yugo/shared';
import { ApiError, errorMessage } from '@/lib/api';
import { useEventTicket, useSetAttendance } from '@/lib/hooks';
import { QrCode } from '@/components/qr-code';
import { PageHeader } from '@/components/page-header';
import { PageSkeleton } from '@/components/skeleton';
import { QueryError } from '@/components/query-error';

/** La API responde 409 `not_going` cuando la persona no marcó asistencia. */
function isNotGoing(error: unknown): boolean {
  if (error instanceof ApiError) return error.code === 'not_going' || error.status === 409;
  return error instanceof Error && error.message === 'not_going';
}

function whenLabel(iso: string): string {
  const raw = new Intl.DateTimeFormat(intlLocale(), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * La entrada personal de un encuentro (RF-EVE-06): un QR grande con el
 * código, para enseñarlo en la puerta. Quien recibe lo escanea o lo escribe;
 * es la única vez que la iglesia ve un nombre, y es el de quien está delante.
 */
export default function EventTicketPage({ params }: { params: { id: string } }) {
  const ticket = useEventTicket(params.id, true);
  const setAttendance = useSetAttendance();

  const markGoing = async () => {
    await setAttendance.mutateAsync({ eventId: params.id, status: 'GOING' });
    await ticket.refetch();
  };

  return (
    <div className="pb-6">
      <PageHeader title={es.events.ticketTitle} backHref={`/eventos/${params.id}`} />
      <div className="px-4">
        {ticket.isLoading ? <PageSkeleton cards={1} /> : null}

        {ticket.isError && isNotGoing(ticket.error) ? (
          <div className="card py-8 text-center">
            <p className="text-sm text-muted">{es.events.ticketNotGoing}</p>
            <button
              type="button"
              className="btn btn-olive mt-3 w-auto px-6"
              disabled={setAttendance.isPending}
              onClick={() => void markGoing()}
            >
              {setAttendance.isPending ? es.common.loading : es.events.going}
            </button>
            {setAttendance.isError ? (
              <p role="alert" className="mt-2 text-[12px] text-wine">
                {errorMessage(setAttendance.error)}
              </p>
            ) : null}
          </div>
        ) : ticket.isError ? (
          <QueryError error={ticket.error} onRetry={() => void ticket.refetch()} />
        ) : null}

        {ticket.data ? (
          <div className="mx-auto max-w-sm">
            <div className="card flex flex-col items-center px-5 py-6 text-center">
              <div className="rounded-card border border-line bg-white p-3">
                <QrCode value={ticket.data.code} size={240} label={es.events.ticketTitle} />
              </div>
              <p className="mt-4 font-mono text-[22px] font-semibold tracking-[0.18em] text-ink">
                {ticket.data.code}
              </p>
              <h2 className="h-display mt-4 text-[18px]">{ticket.data.title}</h2>
              <p className="mt-1 text-[12.5px] text-muted">{whenLabel(ticket.data.startsAt)}</p>
              {ticket.data.place ? (
                <p className="text-[12.5px] text-muted">{ticket.data.place}</p>
              ) : null}
              {ticket.data.checkedInAt ? (
                <p
                  role="status"
                  className="mt-4 rounded-field bg-olive-soft px-3 py-2 text-[12px] font-semibold text-olive-text"
                >
                  {es.events.ticketCheckedIn(whenLabel(ticket.data.checkedInAt))}
                </p>
              ) : (
                <p className="mt-4 text-[12px] text-muted">{es.events.ticketHint}</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
