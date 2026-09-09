'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';

/**
 * Cáscara del modo explorar: la misma marca que la bienvenida, sin la
 * navegación de miembros, y con «Entrar» y «Crear mi perfil» siempre a la
 * vista. Quien llega aquí todavía no es nadie para el sistema, y eso está
 * bien: viene a mirar.
 */
export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-linen">
      <header className="sticky top-0 z-20 bg-ink text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <YugoMark className="h-7 w-7 text-white" />
            <span className="font-display text-lg font-semibold">Yugo</span>
          </Link>
          <nav
            aria-label="Explorar"
            className="hidden items-center gap-4 text-[13px] text-ink-muted sm:flex"
          >
            <Link href="/explorar" className="hover:text-white">
              {es.explore.cta}
            </Link>
            <Link href="/historias" className="hover:text-white">
              {es.stories.title}
            </Link>
            <Link href="/legal/pacto" className="hover:text-white">
              {es.covenant.title}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/entrar"
              className="rounded-full border border-white/40 px-3.5 py-1.5 text-[13px] font-semibold text-white"
            >
              {es.explore.enter}
            </Link>
            <Link
              href="/registro"
              className="rounded-full bg-wheat px-3.5 py-1.5 text-[13px] font-semibold text-ink"
            >
              {es.explore.create}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6">{children}</main>
    </div>
  );
}
