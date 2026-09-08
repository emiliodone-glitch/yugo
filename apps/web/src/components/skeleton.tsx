/**
 * Esqueletos de carga: la forma de lo que viene, en vez de «Cargando…».
 *
 * Una página que muestra su estructura mientras espera se siente más rápida
 * aunque tarde lo mismo, y no salta cuando llegan los datos. Respetan
 * prefers-reduced-motion (el pulso lo apaga globals.css).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-field bg-linen-2 ${className}`} />;
}

/** Una tarjeta genérica: título, dos líneas y un pie. */
export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <div className="card m-0" aria-hidden>
      <Skeleton className="h-3.5 w-1/2" />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={`mt-2 h-3 ${index % 2 ? 'w-2/3' : 'w-5/6'}`} />
      ))}
      <Skeleton className="mt-3 h-8 w-24" />
    </div>
  );
}

/** Filas de lista con avatar, para conexiones y grupos. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card m-0 px-3.5 py-1" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 py-3">
          <Skeleton className="h-10 w-10 flex-none rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="mt-1.5 h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Rejilla de tarjetas de perfil (Descubrir). */
export function ProfileGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="card m-0 overflow-hidden p-0">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="p-3.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-2 h-3 w-2/3" />
            <div className="mt-3 flex gap-1.5">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pantalla completa: cabecera y dos o tres tarjetas. */
export function PageSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div className="space-y-3 px-4 pt-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-6 w-2/5" />
      {Array.from({ length: cards }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Conversación: burbujas alternas. */
export function ChatSkeleton() {
  return (
    <div className="space-y-2 px-4 pt-4" aria-hidden>
      {[60, 40, 75, 35, 55].map((width, index) => (
        <div key={index} className={`flex ${index % 2 ? 'justify-end' : ''}`}>
          <Skeleton className="h-9 rounded-[16px]" />
          <style jsx>{`
            div :global(div) {
              width: ${width}%;
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}
