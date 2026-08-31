'use client';

/**
 * Devocional del día y muro de oración.
 *
 * Las dos cosas que le dan a alguien una razón para abrir Yugo un martes
 * cualquiera, aunque no haya nadie nuevo que conocer — y que le sirven aunque
 * nunca conozca a nadie aquí.
 *
 * Lo que estas pantallas deliberadamente **no** hacen: no cuentan rachas, no
 * marcan los días que faltó, no ponen un cero al lado de una petición sin
 * acompañar. Cada una de esas ausencias es una decisión, no un olvido.
 */
import { useState } from 'react';
import { constancyLabel, es, prayerAuthorLabel, type PrayerRequestItem } from '@yugo/shared';
import {
  useCreatePrayer,
  useCurrentUserId,
  useDevotional,
  useIntercede,
  useMarkPrayerAnswered,
  usePrayerWall,
  useReadDevotional,
} from '@/lib/hooks';
import { Segment } from '@/components/ui';

// ---------------------------------------------------------------------------
// Devocional
// ---------------------------------------------------------------------------

export function DevotionalCard({ compact = false }: { compact?: boolean }) {
  const { data } = useDevotional();
  const read = useReadDevotional();

  if (!data) return null;

  return (
    <section className="card mb-3" aria-label={es.devotional.title}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-wheat-text">
            {es.devotional.title}
          </div>
          <b className="text-[14px]">{data.title}</b>
          <div className="text-[11px] text-muted">{data.reference}</div>
        </div>
        {data.readByMe ? (
          <span className="chip chip-olive whitespace-nowrap">{es.devotional.readByMe}</span>
        ) : null}
      </div>

      {/* Honesto cuando hay un hueco en la programación, en vez de fingir. */}
      {!data.isToday ? (
        <p className="mt-2 text-[11px] text-muted">{es.devotional.notTodayYet}</p>
      ) : null}

      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed">{data.body}</p>

      <div className="mt-3 rounded-lg bg-wheat-soft p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-wheat-text">
          {es.devotional.toThink}
        </div>
        <p className="mt-1 text-[13px]">{data.question}</p>
      </div>

      {/*
        El número de la congregación es lo que convierte una lectura solitaria
        en algo compartido: no importa que 312 personas lo leyeran, importa que
        las de tu iglesia leyeron lo mismo que tú.
      */}
      <p className="mt-3 text-[12px] text-muted">{es.devotional.churchRead(data.churchReadCount)}</p>
      <p className="text-[11px] text-muted">{constancyLabel(data.constancy)}</p>

      {!compact ? <DevotionalReflection /> : null}

      {!data.readByMe && compact ? (
        <button
          type="button"
          className="btn btn-sm btn-olive mt-3 w-full"
          onClick={() => read.mutate({ id: data.id })}
        >
          {es.devotional.readIt}
        </button>
      ) : null}

      {!compact && data.reflections.length > 0 ? (
        <div className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {es.devotional.fromYourChurch}
          </div>
          <ul className="mt-2 space-y-2">
            {data.reflections.map((item) => (
              <li key={item.userId} className="rounded-lg bg-paper p-2.5">
                <div className="text-[11px] font-semibold">{item.name}</div>
                <p className="text-[12px]">{item.reflection}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!compact && data.reflections.length === 0 ? (
        <p className="mt-4 text-[11px] text-muted">{es.devotional.noReflectionsYet}</p>
      ) : null}
    </section>
  );
}

/** El formulario de la reflexión, separado para no re-renderizar la lectura. */
function DevotionalReflection() {
  const { data } = useDevotional();
  const read = useReadDevotional();
  const [draft, setDraft] = useState('');

  if (!data) return null;

  const held = data.myReflectionStatus !== null && data.myReflectionStatus !== 'APPROVED';

  if (data.myReflection) {
    return (
      <div className="mt-3 rounded-lg bg-paper p-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {es.devotional.reflectionLabel}
        </div>
        <p className="mt-1 text-[13px]">{data.myReflection}</p>
        {held ? (
          <p className="mt-1 text-[11px] text-wine">{es.devotional.reflectionHeld}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted" htmlFor="reflection">
        {es.devotional.reflectionLabel}
      </label>
      <textarea
        id="reflection"
        className="input mt-1 min-h-[64px] w-full"
        maxLength={280}
        placeholder={es.devotional.reflectionPlaceholder}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <p className="text-[11px] text-muted">{es.devotional.reflectionHelp}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-olive flex-1"
          disabled={read.isPending}
          onClick={() => {
            read.mutate({ id: data.id, reflection: draft.trim() || undefined });
            setDraft('');
          }}
        >
          {draft.trim() ? es.devotional.save : es.devotional.readIt}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Muro de oración
// ---------------------------------------------------------------------------

export function PrayerWall() {
  const [scope, setScope] = useState<'community' | 'church'>('community');
  const { data } = usePrayerWall(scope);
  const viewerId = useCurrentUserId();
  const items = data ?? [];

  return (
    <section aria-label={es.prayer.title}>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="h-display text-[15px]">{es.prayer.title}</h2>
      </div>

      <Segment
        value={scope}
        onChange={setScope}
        options={[
          { value: 'community', label: es.prayer.tabAll },
          { value: 'church', label: es.prayer.tabChurch },
        ]}
      />

      <PrayerComposer />

      {items.length === 0 ? (
        <p className="card py-6 text-center text-sm text-muted">
          {scope === 'church' ? es.prayer.emptyChurch : es.prayer.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <PrayerCard key={item.id} item={item} viewerId={viewerId ?? null} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PrayerComposer() {
  const create = useCreatePrayer();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [held, setHeld] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-olive mt-3 w-full"
        onClick={() => setOpen(true)}
      >
        {es.prayer.write}
      </button>
    );
  }

  return (
    <div className="card mt-3">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted" htmlFor="prayer-body">
        {es.prayer.bodyLabel}
      </label>
      <textarea
        id="prayer-body"
        className="input mt-1 min-h-[84px] w-full"
        maxLength={600}
        placeholder={es.prayer.bodyPlaceholder}
        value={body}
        onChange={(event) => setBody(event.target.value)}
      />

      <label className="mt-2 flex items-start gap-2 text-[12px]">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={anonymous}
          onChange={(event) => setAnonymous(event.target.checked)}
        />
        <span>
          {es.prayer.anonymous}
          <span className="block text-[11px] text-muted">{es.prayer.anonymousHelp}</span>
        </span>
      </label>

      {held ? <p className="mt-2 text-[11px] text-wine">{es.prayer.held}</p> : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-sm btn-olive flex-1"
          disabled={body.trim().length < 10 || create.isPending}
          onClick={async () => {
            const result = await create.mutateAsync({ body: body.trim(), anonymous });
            setHeld(!result.published);
            if (result.published) {
              setBody('');
              setAnonymous(false);
              setOpen(false);
            }
          }}
        >
          {es.prayer.publish}
        </button>
        <button type="button" className="btn btn-sm flex-1" onClick={() => setOpen(false)}>
          {es.common.cancel}
        </button>
      </div>
    </div>
  );
}

function PrayerCard({ item, viewerId }: { item: PrayerRequestItem; viewerId: string | null }) {
  const intercede = useIntercede();
  const markAnswered = useMarkPrayerAnswered();
  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState('');

  // La autoría se decide por id y nunca por nombre: dos personas se pueden
  // llamar Ana, y cada una vería la petición de la otra como suya.
  const isMine = item.authorId !== null && item.authorId === viewerId;
  const label = prayerAuthorLabel(item, viewerId);

  return (
    <li className={`card m-0 ${item.answeredAt ? 'border-[1.5px] border-olive' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-semibold text-muted">
          {label}
          {item.churchName ? <span className="font-normal"> · {item.churchName}</span> : null}
        </div>
        {item.answeredAt ? (
          <span className="chip chip-olive whitespace-nowrap">{es.prayer.answered}</span>
        ) : null}
      </div>

      <p className="mt-1.5 text-[13px] leading-relaxed">{item.body}</p>

      {item.answeredNote ? (
        <p className="mt-2 rounded-lg bg-olive-soft p-2.5 text-[12px] text-olive-text">
          {item.answeredNote}
        </p>
      ) : null}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        {/* Nunca imprime un cero: eso lo resuelve `intercessionCount`. */}
        <span className="text-[11px] text-muted">
          {es.prayer.intercessionCount(item.intercessions)}
        </span>
        {!item.answeredAt ? (
          <button
            type="button"
            className={`btn btn-sm ${item.iPrayed ? 'chip-olive bg-olive-soft text-olive-text' : 'btn-olive'}`}
            onClick={() => intercede.mutate(item.id)}
          >
            {item.iPrayed ? es.prayer.prayingDone : es.prayer.praying}
          </button>
        ) : null}
      </div>

      {isMine && !item.answeredAt ? (
        closing ? (
          <div className="mt-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-muted" htmlFor={`note-${item.id}`}>
              {es.prayer.answeredNoteLabel}
            </label>
            <textarea
              id={`note-${item.id}`}
              className="input mt-1 min-h-[56px] w-full"
              maxLength={600}
              placeholder={es.prayer.answeredNotePlaceholder}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-olive flex-1"
                onClick={() => {
                  markAnswered.mutate({ id: item.id, note: note.trim() || undefined });
                  setClosing(false);
                }}
              >
                {es.prayer.markAnswered}
              </button>
              <button type="button" className="btn btn-sm flex-1" onClick={() => setClosing(false)}>
                {es.common.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="mt-2 text-[11px] text-muted underline"
            onClick={() => setClosing(true)}
          >
            {es.prayer.markAnswered}
          </button>
        )
      ) : null}
    </li>
  );
}
