'use client';

/**
 * Cola de fotos (RF-ADM-04, RF-PER-02).
 *
 * Una foto a la vez, grande, con las demás fotos aprobadas de la misma
 * persona al lado para comparar, y atajos de teclado: A aprueba, R rechaza,
 * flechas para moverse. La cola general seguía mostrando las fotos como una
 * tarjeta más entre mensajes; aquí el equipo las despacha en segundos, que
 * es lo que decide si alguien nuevo aparece hoy en Descubrir o mañana.
 *
 * Incluye lo que antes quedaba invisible: fotos rechazadas en automático
 * (para poder rescatarlas) y fotos que el clasificador no pudo procesar.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { es, type HeldContentItem } from '@yugo/shared';
import { useHeldPhotos, useResolveHeld } from '@/lib/hooks';
import { BarTop, Panel, PriorityChip } from '@/components/admin';
import { Avatar } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const AUTO_LABEL: Record<string, { label: string; chip: string; hint: string }> = {
  HELD: {
    label: 'Retenida por la IA',
    chip: 'chip-wheat',
    hint: 'El clasificador no estuvo seguro. Tu decisión es la que vale.',
  },
  REJECTED: {
    label: 'Rechazada en automático',
    chip: 'chip-wine',
    hint: 'El clasificador la rechazó. Si es una foto normal, apruébala: la persona la está esperando.',
  },
  PENDING: {
    label: 'Sin clasificar',
    chip: '',
    hint: 'El clasificador falló. Sin tu decisión la foto queda oculta para siempre.',
  },
};

const since = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('es-DO', { month: 'short', year: 'numeric' }).format(new Date(iso))
    : null;

const waiting = (iso: string) => {
  const hours = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 3_600_000));
  return hours < 48
    ? `espera desde hace ${hours} h`
    : `espera desde hace ${Math.round(hours / 24)} días`;
};

export default function PhotoQueuePage() {
  const queue = useHeldPhotos();
  const resolve = useResolveHeld();
  const [index, setIndex] = useState(0);
  const [decided, setDecided] = useState<Record<string, boolean>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const items = useMemo(
    () => (queue.data ?? []).filter((item) => !(item.caseId in decided)),
    [queue.data, decided],
  );
  const current: HeldContentItem | undefined =
    items[Math.min(index, Math.max(items.length - 1, 0))];

  const decide = useCallback(
    async (approve: boolean) => {
      if (!current || resolve.isPending) return;
      const caseId = current.caseId;
      try {
        await resolve.mutateAsync({ caseId, approve });
        setDecided((d) => ({ ...d, [caseId]: approve }));
        setFlash(
          approve ? 'Publicada. Se avisó a la persona.' : 'No publicada. Se avisó a la persona.',
        );
        setIndex((i) => Math.min(i, Math.max(items.length - 2, 0)));
      } catch {
        setFlash('No se pudo guardar la decisión. Inténtalo de nuevo.');
      }
    },
    [current, resolve, items.length],
  );

  // Atajos: solo cuando no se está escribiendo en un campo.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (event.key === 'a' || event.key === 'A') void decide(true);
      else if (event.key === 'r' || event.key === 'R') void decide(false);
      else if (event.key === 'ArrowRight') setIndex((i) => Math.min(items.length - 1, i + 1));
      else if (event.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [decide, items.length]);

  const done = Object.keys(decided).length;
  const auto = current ? AUTO_LABEL[current.autoDecision ?? 'HELD'] : null;

  return (
    <div>
      <BarTop
        title="Fotos por revisar"
        right={
          <span className="chip">
            {items.length} en cola{done > 0 ? ` · ${done} decididas ahora` : ''}
          </span>
        }
      />
      <div className="p-6">
        {queue.isError ? (
          <QueryError error={queue.error} onRetry={() => void queue.refetch()} />
        ) : null}
        {flash ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {flash}
          </div>
        ) : null}

        {queue.isLoading ? (
          <Panel>
            <p className="text-sm text-muted">{es.common.loading}</p>
          </Panel>
        ) : !current ? (
          <Panel>
            <p className="text-sm text-olive-text">
              No hay fotos esperando. Todo lo que subieron los miembros ya tiene respuesta.
            </p>
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Panel>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={current.authorName} size="s" />
                  <div>
                    <div className="text-[12.5px] font-semibold">{current.authorName}</div>
                    <div className="text-[11px] text-muted">
                      {since(current.memberSince)
                        ? `Miembro desde ${since(current.memberSince)} · `
                        : ''}
                      {waiting(current.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <PriorityChip priority={current.priority} />
                  {auto ? <span className={`chip ${auto.chip}`}>{auto.label}</span> : null}
                </div>
              </div>
              {current.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.photoUrl}
                  alt=""
                  className="mx-auto max-h-[560px] w-full rounded-card bg-linen object-contain"
                />
              ) : (
                <p className="rounded-card bg-linen px-4 py-16 text-center text-sm text-muted">
                  No se pudo cargar la foto. Recarga la página para pedir un enlace nuevo.
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-[12px] text-muted">
                <span>
                  {current.risk !== null
                    ? es.admin.heldRisk(Math.round(current.risk * 100))
                    : 'Sin puntaje'}
                </span>
                <span>{auto?.hint}</span>
              </div>
            </Panel>

            <div className="grid content-start gap-4">
              <Panel title="Decisión">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-olive flex-1"
                    disabled={resolve.isPending}
                    onClick={() => void decide(true)}
                  >
                    {es.admin.heldApprove}{' '}
                    <kbd className="ml-2 rounded bg-white/30 px-1.5 text-[10px]">A</kbd>
                  </button>
                  <button
                    type="button"
                    className="btn btn-wine flex-1"
                    disabled={resolve.isPending}
                    onClick={() => void decide(false)}
                  >
                    {es.admin.heldReject}{' '}
                    <kbd className="ml-2 rounded bg-white/30 px-1.5 text-[10px]">R</kbd>
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  >
                    ‹ Anterior
                  </button>
                  <span className="text-muted">
                    {Math.min(index, items.length - 1) + 1} de {items.length}
                  </span>
                  <button
                    type="button"
                    className="underline disabled:opacity-40"
                    disabled={index >= items.length - 1}
                    onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
                  >
                    Siguiente ›
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  Aprobar publica la foto y suma a la completitud del perfil. Rechazar la oculta y
                  la persona recibe un aviso con cómo subir otra. Ambas quedan en la bitácora.
                </p>
              </Panel>

              <Panel title="Sus otras fotos aprobadas">
                {current.memberPhotos && current.memberPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {current.memberPhotos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={url}
                        alt=""
                        className="aspect-square w-full rounded-card object-cover"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">
                    Todavía no tiene ninguna aprobada: esta sería la primera que ven los demás.
                  </p>
                )}
              </Panel>

              <Panel title="Qué se aprueba">
                <ul className="list-disc space-y-1 pl-4 text-[12px] text-muted">
                  <li>Se ve el rostro de la persona, sin lentes oscuros que lo tapen.</li>
                  <li>
                    Es de ella (no un logo, un paisaje ni una foto de grupo donde no se sabe quién
                    es).
                  </li>
                  <li>Vestimenta y contexto dentro del Pacto de conducta.</li>
                  <li>Sin texto de contacto (teléfonos, redes) ni marcas de agua de otras apps.</li>
                </ul>
              </Panel>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
