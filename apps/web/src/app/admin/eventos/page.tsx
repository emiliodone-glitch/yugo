'use client';

import { useState } from 'react';
import { es, intlLocale } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useAdminEventsInReview,
  useAdminPublishedEvents,
  useDecideEvent,
  useSetEventFeatured,
} from '@/lib/hooks';
import { BarTop, DataTable, Td } from '@/components/admin';
import { QueryError } from '@/components/query-error';

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');

/**
 * Eventos (RF-ADM-06 / RF-EVE-02): la cola de revisión real, aprobar o
 * devolver con nota, y destacar publicados. Antes la lista era la de
 * demostración y los botones no hacían nada.
 */
export default function AdminEventsPage() {
  const inReview = useAdminEventsInReview();
  const published = useAdminPublishedEvents();
  const decide = useDecideEvent();
  const setFeatured = useSetEventFeatured();
  const [notice, setNotice] = useState<string | null>(null);
  const [returning, setReturning] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const act = async (id: string, approve: boolean) => {
    try {
      await decide.mutateAsync({
        id,
        approve,
        note: approve ? undefined : note.trim() || undefined,
      });
      setNotice(
        approve
          ? 'Evento aprobado y publicado: ya aparece en la agenda de la app.'
          : 'Evento devuelto a la iglesia con tu nota.',
      );
      setReturning(null);
      setNote('');
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  const pending = inReview.data ?? [];
  const rows = published.data ?? [];

  return (
    <div>
      <BarTop
        title={es.admin.events}
        right={<span className="chip">{pending.length} en revisión</span>}
      />
      <div className="p-6">
        {notice ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {notice}
          </div>
        ) : null}
        {inReview.isError ? (
          <QueryError error={inReview.error} onRetry={() => void inReview.refetch()} />
        ) : null}

        <h2 className="h-display mb-2 text-[15px]">En revisión (RF-EVE-02)</h2>
        <DataTable headers={['Evento', 'Iglesia', 'Fecha', '']}>
          {pending.map((event) => (
            <tr key={event.id}>
              <Td>
                <b>{event.title}</b>
              </Td>
              <Td>{event.church.name}</Td>
              <Td>{shortDate(event.startsAt)}</Td>
              <Td>
                {returning === event.id ? (
                  <span className="flex flex-wrap items-center gap-1.5">
                    <input
                      className="field w-56 py-1.5 text-[12px]"
                      placeholder="Qué debe corregir la iglesia"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={decide.isPending}
                      onClick={() => void act(event.id, false)}
                    >
                      Devolver
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setReturning(null)}
                    >
                      {es.common.cancel}
                    </button>
                  </span>
                ) : (
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      className="btn btn-olive btn-sm"
                      disabled={decide.isPending}
                      onClick={() => void act(event.id, true)}
                    >
                      Aprobar y publicar
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setReturning(event.id)}
                    >
                      Devolver
                    </button>
                  </span>
                )}
              </Td>
            </tr>
          ))}
          {!inReview.isLoading && pending.length === 0 ? (
            <tr>
              <Td>No hay eventos esperando revisión.</Td>
            </tr>
          ) : null}
        </DataTable>

        <h2 className="h-display mb-2 mt-6 text-[15px]">Publicados</h2>
        {published.isError ? (
          <QueryError error={published.error} onRetry={() => void published.refetch()} />
        ) : null}
        <DataTable headers={['Evento', 'Iglesia', 'Fecha', 'Asistencias', 'Destacado']}>
          {rows.map((event) => (
            <tr key={event.id}>
              <Td>
                <b>{event.title}</b>
              </Td>
              <Td>{event.churchName}</Td>
              <Td>{shortDate(event.startsAt)}</Td>
              <Td>{event.attendances}</Td>
              <Td>
                <button
                  type="button"
                  className={`chip ${event.featured ? 'chip-wheat' : ''}`}
                  disabled={setFeatured.isPending}
                  onClick={() => setFeatured.mutate({ id: event.id, featured: !event.featured })}
                >
                  {event.featured ? '★ Destacado' : 'Destacar'}
                </button>
              </Td>
            </tr>
          ))}
          {!published.isLoading && rows.length === 0 ? (
            <tr>
              <Td>Todavía no hay eventos publicados.</Td>
            </tr>
          ) : null}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Destacar un evento lo lleva a la portada de Inicio de todos los miembros cercanos. Úsalo
          con uno o dos a la vez.
        </p>
      </div>
    </div>
  );
}
