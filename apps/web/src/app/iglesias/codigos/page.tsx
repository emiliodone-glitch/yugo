'use client';

import { useState } from 'react';
import { demoChurch, es } from '@yugo/shared';
import { BarTop, Kpi, Panel } from '@/components/admin';
import { Avatar, EndorsedBadge } from '@/components/ui';

/** Códigos de respaldo — nivel 3 en manos de la iglesia (RF-IGL-05). */
export default function EndorsementCodesPage() {
  const [activeCodes, setActiveCodes] = useState(demoChurch.activeCodes);
  const [requests, setRequests] = useState(demoChurch.endorsementRequests);
  const [generatedNote, setGeneratedNote] = useState(false);

  const resolveRequest = (id: string) => {
    setRequests((current) => current.filter((request) => request.id !== id));
  };

  return (
    <div>
      <BarTop
        title={es.church.endorsementCodes}
        right={
          <button
            type="button"
            className="btn btn-olive btn-sm"
            onClick={() => {
              setActiveCodes((count) => count + 25);
              setGeneratedNote(true);
            }}
          >
            {es.church.generateCodes(25)}
          </button>
        }
      />
      <div className="p-6">
        {generatedNote ? (
          <div className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text">
            25 códigos generados. Son de un solo uso y vencen a los 30 días.
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-1 gap-3.5 md:grid-cols-3">
          <Kpi label={es.church.endorsedMembers} value={demoChurch.endorsedMembers} />
          <Kpi label={es.church.activeCodes} value={activeCodes} small={es.church.codesExpire} />
          <Kpi label={es.church.pendingRequests} value={requests.length} />
        </div>

        <div className="grid items-start gap-4 xl:grid-cols-2">
          <Panel title={es.church.endorsementRequests}>
            {requests.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">No hay solicitudes pendientes.</p>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="list-row">
                  <Avatar name={request.name} size="s" />
                  <div className="flex-1">
                    <b className="text-[12.5px]">{request.name}</b>
                    <div className="text-[11px] text-muted">
                      {es.church.attendsSince(request.attendsSince)}
                      {request.leader ? ` · ${es.church.asksLeader(request.leader)}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-olive btn-sm"
                    onClick={() => resolveRequest(request.id)}
                  >
                    {es.church.confirmEndorsement}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => resolveRequest(request.id)}
                  >
                    {request.gender === 'FEMALE' ? es.church.dontKnowF : es.church.dontKnowM}
                  </button>
                </div>
              ))
            )}
          </Panel>

          <Panel title={es.church.howItWorks}>
            <p className="text-[12.5px] leading-relaxed">
              Entrega un código a cada miembro soltero que quiera usar Yugo. Al ingresarlo, su perfil
              muestra la insignia{' '}
              <EndorsedBadge label={`Respaldado por ${demoChurch.name}`} />. Los códigos son de un
              solo uso y puedes revocar un respaldo en cualquier momento. El portal nunca muestra la
              actividad de citas de tus miembros.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
