'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { es, EVENT_TYPES, intlLocale } from '@yugo/shared';
import { useChurchMe, useCreateChurchEvent } from '@/lib/hooks';
import { errorMessage } from '@/lib/api';
import { BarTop, Panel } from '@/components/admin';
import { CITIES } from '@/lib/cities';

/** Crear evento: formulario con vista previa y flujo de revisión (RF-IGL-03). */
export default function NewEventPage() {
  const router = useRouter();
  const me = useChurchMe();
  const create = useCreateChurchEvent();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('CULTO_ESPECIAL');
  const [cost, setCost] = useState('0');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [place, setPlace] = useState('');
  const [city, setCity] = useState(CITIES[0].name);
  const [audience, setAudience] = useState<'CONGREGATION' | 'SINGLES'>('CONGREGATION');
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const typeName = EVENT_TYPES.find((t) => t.slug === type)?.name ?? type;
  const startLabel = start
    ? new Intl.DateTimeFormat(intlLocale(), {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(start))
    : '';

  const save = (submit: boolean) => {
    setFormError(null);
    if (title.trim().length < 3) return setFormError('El título necesita al menos 3 caracteres.');
    if (description.trim().length < 10)
      return setFormError('La descripción necesita al menos 10 caracteres.');
    if (place.trim().length < 5) return setFormError('Indica la dirección del lugar.');
    if (!start) return setFormError('Indica cuándo empieza.');
    const coords = CITIES.find((c) => c.name === city) ?? CITIES[0];
    const amount = Number(cost.replace(/[^\d.]/g, ''));
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        type: type as never,
        startsAt: new Date(start),
        endsAt: end ? new Date(end) : undefined,
        address: place.trim(),
        city,
        lat: coords.lat,
        lng: coords.lng,
        capacity: capacity ? Number(capacity) : undefined,
        audience,
        costAmount: amount > 0 ? amount : undefined,
        costCurrency: amount > 0 ? 'DOP' : undefined,
        submit,
      },
      {
        onSuccess: (result) => {
          setDone(result.status);
          setTimeout(() => router.push('/iglesias/eventos'), 1200);
        },
      },
    );
  };

  return (
    <div>
      <BarTop
        title={es.church.newEvent}
        right={
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={create.isPending}
              onClick={() => save(false)}
            >
              {es.church.saveDraft}
            </button>
            <button
              type="button"
              className="btn btn-olive btn-sm"
              disabled={create.isPending}
              onClick={() => save(true)}
            >
              {es.church.sendToReview}
            </button>
          </div>
        }
      />
      <div className="p-6">
        {done ? (
          <div
            role="status"
            className="mb-4 rounded-card bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {es.church.saved(done)}
          </div>
        ) : null}
        {formError || create.isError ? (
          <div role="alert" className="mb-4 rounded-card bg-wine-soft px-4 py-3 text-sm text-wine">
            {formError ?? errorMessage(create.error)}
          </div>
        ) : null}
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel>
            <FieldLabel>{es.church.fieldTitle}</FieldLabel>
            <input
              className="field mb-3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Noche de adoración de jóvenes adultos"
            />

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
                <FieldLabel>{es.church.fieldCost} (RD$)</FieldLabel>
                <input
                  className="field"
                  inputMode="decimal"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-muted">{es.church.costHint}</p>
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

            {/* Convocar es distinto de publicar: un encuentro del ministerio
                de solteros se mide aparte, con su propio cupo. */}
            <div className="mb-3 flex gap-2.5">
              <div className="flex-1">
                <FieldLabel>Convoca para</FieldLabel>
                <select
                  className="field"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value as 'CONGREGATION' | 'SINGLES')}
                >
                  <option value="CONGREGATION">Toda la congregación</option>
                  <option value="SINGLES">{es.events.singlesBadge}</option>
                </select>
              </div>
              <div className="flex-1">
                <FieldLabel>Cupo</FieldLabel>
                <input
                  className="field"
                  inputMode="numeric"
                  placeholder="Sin límite"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))}
                />
                <p className="mt-1 text-[11px] text-muted">{es.events.capacityHonest}</p>
              </div>
            </div>

            <div className="mb-3 flex gap-2.5">
              <div className="flex-[2]">
                <FieldLabel>{es.church.fieldPlace}</FieldLabel>
                <input
                  className="field"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  placeholder="Av. San Vicente de Paúl 45"
                />
              </div>
              <div className="flex-1">
                <FieldLabel>{es.church.fieldCity}</FieldLabel>
                <select className="field" value={city} onChange={(e) => setCity(e.target.value)}>
                  {CITIES.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <FieldLabel>{es.church.fieldDescription}</FieldLabel>
            <textarea
              className="field h-[90px] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué va a pasar, quién dirige, qué traer…"
            />
          </Panel>

          <div className="grid gap-4">
            <Panel title={es.church.appPreview}>
              <div className="card overflow-hidden p-0">
                <div
                  className="h-20"
                  style={{ background: 'linear-gradient(160deg,#7B2D4B,#22315C)' }}
                />
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="chip chip-wine">{typeName}</span>
                    <span className="text-[11px] capitalize text-muted">{startLabel}</span>
                  </div>
                  <b className="mt-1 block text-[12.5px]">{title || 'Título del evento'}</b>
                  <div className="text-[11px] text-muted">
                    {me.data?.church.name ?? '…'} · {city}
                  </div>
                </div>
              </div>
            </Panel>

            <Panel title={es.church.statusTitle}>
              <span className="text-[11px] text-muted">{es.church.reviewNote}</span>
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
