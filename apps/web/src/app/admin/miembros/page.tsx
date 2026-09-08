'use client';

import { useState } from 'react';
import { es, type AdminMemberRow } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import { useAdminMemberAction, useAdminMembers } from '@/lib/hooks';
import { BarTop, DataTable, Panel, Td } from '@/components/admin';
import { Avatar } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activa',
  PAUSED: 'Pausada',
  SUSPENDED: 'Suspendida',
  BANNED: 'Expulsada',
  DELETION_PENDING: 'Eliminación pendiente',
  DELETED: 'Eliminada',
};

/**
 * Miembros (RF-ADM-02): búsqueda por nombre o correo sobre la base real y
 * acciones con motivo (advertir, suspender, expulsar, reincorporar). Antes
 * pintaba los perfiles de demostración con dos filas inventadas.
 */
export default function MembersPage() {
  const [query, setQuery] = useState('');
  const members = useAdminMembers(query);
  const act = useAdminMemberAction();
  const [selected, setSelected] = useState<AdminMemberRow | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const rows = members.data?.items ?? [];

  const run = async (action: 'WARN' | 'SUSPEND' | 'BAN' | 'REINSTATE', days?: number) => {
    if (!selected) return;
    try {
      await act.mutateAsync({ id: selected.id, action, reason: reason.trim(), days });
      setNotice(`Acción «${action}» aplicada a ${selected.displayName}. Quedó en la bitácora.`);
      setSelected(null);
      setReason('');
    } catch (error) {
      setNotice(errorMessage(error));
    }
  };

  return (
    <div>
      <BarTop
        title={es.admin.members}
        right={
          <input
            className="field w-64"
            placeholder="Buscar por nombre o correo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
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
        {members.isError ? (
          <QueryError error={members.error} onRetry={() => void members.refetch()} />
        ) : null}
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div>
            {members.data ? (
              <p className="mb-2 text-[12px] text-muted">
                {members.data.total} miembros{query ? ` que coinciden con «${query}»` : ''}
              </p>
            ) : null}
            <DataTable
              headers={[
                'Miembro',
                'Edad',
                'Ciudad',
                'Verificación',
                'Suscripción',
                'Reportes',
                'Estado',
                '',
              ]}
            >
              {members.isLoading ? (
                <tr>
                  <Td>{es.common.loading}</Td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr key={row.id} className={selected?.id === row.id ? 'bg-linen-2' : ''}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <Avatar name={row.displayName} size="s" />
                      <span>
                        <b className="block">{row.displayName}</b>
                        <span className="text-[11px] text-muted">{row.email ?? '—'}</span>
                      </span>
                    </span>
                  </Td>
                  <Td>{row.age}</Td>
                  <Td>{row.city ?? '—'}</Td>
                  <Td>
                    <span className={`chip ${row.level >= 3 ? 'chip-olive' : ''}`}>
                      Nivel {row.level}
                    </span>
                  </Td>
                  <Td>
                    {row.tier ? (
                      <span className="chip chip-wheat">{row.tier}</span>
                    ) : (
                      <span className="text-muted">Gratuito</span>
                    )}
                  </Td>
                  <Td className={row.reports > 0 ? 'font-semibold text-wine' : ''}>
                    {row.reports}
                  </Td>
                  <Td>
                    <span className={`chip ${row.status === 'ACTIVE' ? '' : 'chip-wine'}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </Td>
                  <Td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSelected(row);
                        setNotice(null);
                      }}
                    >
                      Ver ficha
                    </button>
                  </Td>
                </tr>
              ))}
              {!members.isLoading && rows.length === 0 ? (
                <tr>
                  <Td>Nadie coincide con esa búsqueda.</Td>
                </tr>
              ) : null}
            </DataTable>
          </div>

          <Panel title={selected ? selected.displayName : 'Ficha del miembro'}>
            {!selected ? (
              <p className="text-[12.5px] text-muted">
                Elige «Ver ficha» para ver el historial y aplicar una acción. Toda acción exige
                motivo y queda en la bitácora de auditoría.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 text-[12.5px]">
                  <dt className="text-muted">Correo</dt>
                  <dd className="break-all">{selected.email ?? '—'}</dd>
                  <dt className="text-muted">Perfil</dt>
                  <dd>{selected.completeness}% completo</dd>
                  <dt className="text-muted">Verificación</dt>
                  <dd>Nivel {selected.level}</dd>
                  <dt className="text-muted">Reportes</dt>
                  <dd>
                    {selected.reports} recibidos · {selected.sanctions} sanciones
                  </dd>
                  <dt className="text-muted">Miembro desde</dt>
                  <dd>{new Date(selected.createdAt).toLocaleDateString('es-DO')}</dd>
                  <dt className="text-muted">Estado</dt>
                  <dd>{STATUS_LABEL[selected.status] ?? selected.status}</dd>
                </dl>
                <textarea
                  className="field mb-2 mt-3 h-20 resize-none"
                  placeholder="Motivo (obligatorio, queda en la bitácora)"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <div className="grid gap-1.5">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm w-full"
                    disabled={reason.trim().length < 3 || act.isPending}
                    onClick={() => void run('WARN')}
                  >
                    {es.admin.decisionWarning}
                  </button>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[3, 7, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        className="btn btn-sm w-full bg-wheat text-ink-deep"
                        disabled={reason.trim().length < 3 || act.isPending}
                        onClick={() => void run('SUSPEND', days)}
                      >
                        Suspender {days} d
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btn-wine btn-sm w-full"
                    disabled={reason.trim().length < 3 || act.isPending}
                    onClick={() => void run('BAN')}
                  >
                    {es.admin.decisionBan}
                  </button>
                  {selected.status !== 'ACTIVE' ? (
                    <button
                      type="button"
                      className="btn btn-olive btn-sm w-full"
                      disabled={reason.trim().length < 3 || act.isPending}
                      onClick={() => void run('REINSTATE')}
                    >
                      Reincorporar
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
