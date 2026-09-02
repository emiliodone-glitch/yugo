'use client';

/**
 * Devocionales · calendario.
 *
 * Existe porque el devocional se construyó sin nadie que lo alimentara: había
 * catorce sembrados y el día quince la app iba a decir «el de hoy todavía no
 * está publicado» para siempre. La reserva —días consecutivos programados a
 * partir de hoy— es lo primero que se ve, en grande, porque es el número que
 * evita eso.
 *
 * Un devocional ya leído no se toca: lo que alguien leyó fue lo que leyó, y
 * «27 de tu iglesia lo leyeron hoy» tiene que seguir significando que leyeron
 * lo mismo.
 */
import { useState } from 'react';
import { es, type DevotionalDraft, type ScheduledDevotional } from '@yugo/shared';
import { useDevotionalSchedule, useRemoveDevotional, useUpsertDevotional } from '@/lib/hooks';
import { BarTop, Panel } from '@/components/admin';

const EMPTY: DevotionalDraft = { reference: '', title: '', body: '', question: '' };

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function longDate(day: string): string {
  const text = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${day}T12:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function DevotionalsAdminPage() {
  const { data, isLoading } = useDevotionalSchedule();
  const upsert = useUpsertDevotional();
  const remove = useRemoveDevotional();

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DevotionalDraft>(EMPTY);
  const [saved, setSaved] = useState<string | null>(null);

  const items = data?.items ?? [];
  const today = data?.today ?? new Date().toISOString().slice(0, 10);
  const runway = data?.runwayDays ?? 0;

  // El primer día sin devocional a partir de hoy: donde hay que escribir.
  // Es barato y la lista es corta; no vale la pena memorizarlo.
  const taken = new Set(items.map((d) => d.publishOn));
  let nextFree = today;
  while (taken.has(nextFree)) nextFree = addDays(nextFree, 1);

  const startEditing = (date: string, existing?: ScheduledDevotional) => {
    setEditing(date);
    setSaved(null);
    setDraft(
      existing
        ? {
            reference: existing.reference,
            title: existing.title,
            body: existing.body,
            question: existing.question,
          }
        : EMPTY,
    );
  };

  const canSave =
    draft.reference.trim().length >= 3 &&
    draft.title.trim().length >= 3 &&
    draft.body.trim().length >= 40 &&
    draft.question.trim().length >= 10;

  const tone = runway === 0 ? 'wine' : runway < 7 ? 'wheat' : 'olive';

  return (
    <div>
      <BarTop
        title={es.admin.devotionalsTitle}
        right={
          <button type="button" className="btn btn-sm btn-olive" onClick={() => startEditing(nextFree)}>
            {es.admin.writeFor(longDate(nextFree))}
          </button>
        }
      />
      <div className="p-6">
        {/* La reserva, en grande. Es el número que evita el defecto. */}
        <section
          aria-label={es.admin.runwayHelp}
          className={`mb-4 rounded-card border-0 p-5 ${
            tone === 'wine'
              ? 'bg-wine-soft text-wine'
              : tone === 'wheat'
                ? 'bg-wheat-soft text-wheat-text'
                : 'bg-olive-soft text-olive-text'
          }`}
        >
          <div className="font-display text-[34px] font-semibold leading-none">
            {es.admin.runway(runway)}
          </div>
          <p className="mt-2 text-[13px]">
            {runway === 0 ? es.admin.runwayNone : runway < 7 ? es.admin.runwayLow : es.admin.runwayOk}
          </p>
          <p className="mt-1 text-[11px]">{es.admin.runwayHelp}</p>
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
          <Panel title={es.admin.devotionals}>
            {isLoading ? (
              <p className="text-sm text-muted">{es.common.loading}</p>
            ) : (
              <ul className="divide-y divide-line">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 py-2.5">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => startEditing(item.publishOn, item)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">{longDate(item.publishOn)}</span>
                        {item.isToday ? (
                          <span className="chip chip-olive">{es.admin.todayLabel}</span>
                        ) : item.isPast ? (
                          <span className="chip">{es.admin.past}</span>
                        ) : (
                          <span className="chip chip-wheat">{es.admin.scheduled}</span>
                        )}
                      </div>
                      <div className="truncate text-[13px] font-semibold">{item.title}</div>
                      <div className="text-[11px] text-muted">
                        {item.reference} · {es.admin.readsCount(item.reads)}
                      </div>
                    </button>
                    {item.reads === 0 && !item.isPast ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => remove.mutate(item.id)}
                      >
                        {es.admin.removeDevotional}
                      </button>
                    ) : null}
                  </li>
                ))}
                <li className="py-2.5">
                  <button
                    type="button"
                    className="text-[12px] text-olive-text underline"
                    onClick={() => startEditing(nextFree)}
                  >
                    {es.admin.nextFree}: {longDate(nextFree)}
                  </button>
                </li>
              </ul>
            )}
          </Panel>

          <Panel title={editing ? es.admin.writeFor(longDate(editing)) : es.admin.nextFree}>
            {!editing ? (
              <p className="text-sm text-muted">{es.admin.pickOrWrite}</p>
            ) : (
              <DevotionalForm
                date={editing}
                draft={draft}
                onChange={setDraft}
                locked={items.find((d) => d.publishOn === editing)?.reads ?? 0}
                canSave={canSave}
                saving={upsert.isPending}
                saved={saved === editing}
                onSave={async () => {
                  await upsert.mutateAsync({ date: editing, draft });
                  setSaved(editing);
                }}
                onCancel={() => setEditing(null)}
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DevotionalForm({
  date,
  draft,
  onChange,
  locked,
  canSave,
  saving,
  saved,
  onSave,
  onCancel,
}: {
  date: string;
  draft: DevotionalDraft;
  onChange: (next: DevotionalDraft) => void;
  locked: number;
  canSave: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const field = (key: keyof DevotionalDraft) => ({
    value: draft[key],
    disabled: locked > 0,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ ...draft, [key]: event.target.value }),
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSave && locked === 0) onSave();
      }}
    >
      {locked > 0 ? (
        <p className="rounded-field bg-wheat-soft px-3 py-2 text-[12px] text-wheat-text">
          {es.admin.lockedRead(locked)}
        </p>
      ) : null}

      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {es.admin.fieldDate}
        <input className="input mt-1" value={date} readOnly />
      </label>

      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {es.admin.fieldReference}
        <input className="input mt-1" placeholder="Proverbios 4:23" maxLength={80} {...field('reference')} />
      </label>

      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {es.admin.fieldTitle}
        <input className="input mt-1" maxLength={120} {...field('title')} />
      </label>

      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {es.admin.fieldBody}
        <textarea className="input mt-1 min-h-[140px]" maxLength={2000} {...field('body')} />
        <span className="mt-1 block font-normal normal-case tracking-normal">
          {es.admin.fieldBodyHelp} · {draft.body.trim().length}/2000
        </span>
      </label>

      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {es.admin.fieldQuestion}
        <textarea className="input mt-1 min-h-[64px]" maxLength={300} {...field('question')} />
        <span className="mt-1 block font-normal normal-case tracking-normal">
          {es.admin.fieldQuestionHelp}
        </span>
      </label>

      {saved ? <p className="text-[12px] text-olive-text">{es.admin.savedDevotional}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          className="btn btn-sm btn-olive"
          disabled={!canSave || saving || locked > 0}
        >
          {es.admin.saveDevotional}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>
          {es.common.cancel}
        </button>
      </div>
    </form>
  );
}
