'use client';

import { useState } from 'react';
import { demoChurch, es, EVENT_TYPES } from '@yugo/shared';
import { BarTop, Panel } from '@/components/admin';

/** Crear evento — form with live in-app preview and review flow (RF-IGL-03). */
export default function NewEventPage() {
  const [title, setTitle] = useState('Noche de adoración de jóvenes adultos');
  const [type, setType] = useState('VIGILIA');
  const [cost, setCost] = useState('Gratis');
  const [start, setStart] = useState('2026-09-04T20:00');
  const [end, setEnd] = useState('2026-09-04T23:00');
  const [place, setPlace] = useState('Av. San Vicente de Paúl 45, Santo Domingo Este');
  const [description, setDescription] = useState(
    'Una noche de alabanza dirigida por el ministerio de jóvenes adultos. Trae a un amigo…',
  );
  const [status, setStatus] = useState<'DRAFT' | 'IN_REVIEW'>('DRAFT');

  const typeName = EVENT_TYPES.find((t) => t.slug === type)?.name ?? type;
  const startLabel = start
    ? new Intl.DateTimeFormat('es-DO', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(start))
    : '';

  return (
    <div>
      <BarTop
        title={es.church.newEvent}
        right={
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus('DRAFT')}>
              {es.church.saveDraft}
            </button>
            <button type="button" className="btn btn-olive btn-sm" onClick={() => setStatus('IN_REVIEW')}>
              {es.church.sendToReview}
            </button>
          </div>
        }
      />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          {/* Form */}
          <Panel>
            <FieldLabel>{es.church.fieldTitle}</FieldLabel>
            <input className="field mb-3" value={title} onChange={(e) => setTitle(e.target.value)} />

            <div className="mb-3 flex gap-2.5">
              <div className="flex-1">
                <FieldLabel>{es.church.fieldType}</FieldLabel>
                <select className="field" value={type} onChange={(e) => setType(e.target.value)}>
                  {EVENT_TYPES.map((eventType) => (
                    <option key={eventType.slug} value={eventType.slug}>
                      {eventType.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <FieldLabel>{es.church.fieldCost}</FieldLabel>
                <input className="field" value={cost} onChange={(e) => setCost(e.target.value)} />
              </div>
            </div>

            <div className="mb-3 flex gap-2.5">
              <div className="flex-1">
                <FieldLabel>{es.church.fieldStart}</FieldLabel>
                <input
                  type="datetime-local"
                  className="field"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <FieldLabel>{es.church.fieldEnd}</FieldLabel>
                <input
                  type="datetime-local"
                  className="field"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </div>
            </div>

            <FieldLabel>{es.church.fieldPlace}</FieldLabel>
            <input className="field mb-3" value={place} onChange={(e) => setPlace(e.target.value)} />

            {/* Map preview with olive pin */}
            <div
              className="relative mb-3 h-[110px] overflow-hidden rounded-lg"
              style={{
                background:
                  'linear-gradient(#e6e2d6 1px,transparent 1px) 0 0/22px 22px,' +
                  'linear-gradient(90deg,#e6e2d6 1px,transparent 1px) 0 0/22px 22px,#EFECE3',
              }}
              role="img"
              aria-label="Ubicación del evento"
            >
              <span
                className="absolute h-[26px] w-[26px] border-[3px] border-white bg-olive shadow-md"
                style={{ left: '55%', top: '36%', borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)' }}
              />
            </div>

            <FieldLabel>{es.church.fieldDescription}</FieldLabel>
            <textarea
              className="field h-[70px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Panel>

          {/* Preview + status */}
          <div className="grid gap-4">
            <Panel title={es.church.appPreview}>
              <div className="card overflow-hidden p-0">
                <div className="h-20" style={{ background: 'linear-gradient(160deg,#7B2D4B,#22315C)' }} />
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="chip chip-wine">{typeName}</span>
                    <span className="text-[11px] capitalize text-muted">{startLabel}</span>
                  </div>
                  <b className="mt-1 block text-[12.5px]">{title || 'Título del evento'}</b>
                  <div className="text-[11px] text-muted">
                    {demoChurch.name} · Santo Domingo Este
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title={es.church.statusTitle}>
              <div className="flex items-start gap-2.5">
                <span className={`chip ${status === 'IN_REVIEW' ? 'chip-wheat' : ''}`}>
                  {status === 'IN_REVIEW' ? es.church.inReview : es.church.draft}
                </span>
                <span className="text-[11px] text-muted">{es.church.reviewNote}</span>
              </div>
            </Panel>

            <Panel title={es.church.checkInTitle}>
              <p className="text-[11px] text-muted">{es.church.checkInNote}</p>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[11px] font-medium text-muted">{children}</div>;
}
