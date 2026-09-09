'use client';

import Link from 'next/link';
import { TrackView } from '@/components/track-view';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';
import { WelcomeInside } from '@/components/welcome-inside';
import { LanguageSwitch } from '@/lib/locale';

/**
 * Bienvenida: la promesa en una frase, serena, sin corazones ni llamas.
 *
 * En el teléfono es una sola columna con los botones al alcance del pulgar.
 * En pantalla ancha, dos columnas: la promesa y las acciones a la izquierda
 * y, a la derecha, lo que hay dentro (el devocional de hoy y las tres cosas
 * que distinguen a Yugo), para que el espacio cuente algo en vez de quedar
 * vacío.
 */
export default function WelcomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink text-white">
      <TrackView name="welcome_view" />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 py-8 md:grid md:max-w-5xl md:grid-cols-[minmax(0,1fr)_400px] md:items-center md:gap-14 md:px-10">
        <div className="md:py-6">
          <YugoMark className="h-14 w-14 text-white" />
          <h1 className="mt-5 font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.5px] md:text-[46px]">
            {es.welcome.headline}
          </h1>
          <p className="mt-3.5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted md:text-[15px]">
            {es.welcome.sub}
          </p>

          {/* En el teléfono, un vistazo compacto entre el texto y los botones. */}
          <div className="mt-6 md:hidden">
            <WelcomeInside compact />
          </div>

          <div className="mt-8">
            <div className="mb-4 flex flex-wrap gap-2">
              <span className="chip bg-white/10 text-white">{es.welcome.chipVerified}</span>
              <span className="chip bg-white/10 text-white">{es.welcome.chipAdults}</span>
            </div>
            <div className="md:max-w-sm">
              <Link href="/registro" className="btn btn-wheat">
                {es.welcome.createProfile}
              </Link>
              <Link
                href="/entrar"
                className="btn mt-2 border-[1.5px] border-white/40 bg-transparent text-white"
              >
                {es.welcome.haveAccount}
              </Link>
              <Link
                href="/explorar"
                className="mt-3 block text-center text-[13px] font-semibold text-ink-muted underline-offset-4 hover:text-white hover:underline"
              >
                {es.explore.cta} ›
              </Link>
              <p className="mt-3 text-center text-[11px] text-ink-muted2">
                {es.welcome.socialHint}
              </p>
              {/* RNF-06: la diáspora llega con el teléfono en inglés. */}
              <LanguageSwitch className="mt-4 justify-center" />
            </div>
            <div className="mt-6 flex justify-center gap-5 text-[11px] text-ink-muted2 md:justify-start">
              <Link href="/admin" className="hover:text-white">
                Panel administrativo
              </Link>
              <Link href="/iglesias" className="hover:text-white">
                Portal de iglesias
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <WelcomeInside />
        </div>
      </div>
    </div>
  );
}
