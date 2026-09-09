import Link from 'next/link';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';
import { WelcomeInside } from '@/components/welcome-inside';

/**
 * Marco de las pantallas de acceso (entrar, crear perfil, recuperar).
 *
 * En el teléfono es una sola columna, como siempre. En pantalla ancha, la
 * izquierda cuenta qué es Yugo (la promesa, el devocional de hoy, las tres
 * cosas que lo distinguen) y la derecha lleva el formulario en un ancho de
 * lectura. Antes el formulario flotaba solo en el centro de una pantalla de
 * 1440 px: se veía como un móvil estirado, no como una web.
 *
 * `tone` decide el fondo del lado del formulario: oscuro para entrar y
 * recuperar (continúan la bienvenida), claro para el asistente de registro,
 * que es largo y se lee mejor sobre lino.
 */
export function AuthLayout({
  children,
  tone = 'ink',
}: {
  children: React.ReactNode;
  tone?: 'ink' | 'linen';
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)]">
      <aside className="hidden flex-col justify-between bg-ink px-12 py-10 text-white lg:flex xl:px-16">
        <Link href="/" className="flex items-center gap-2.5">
          <YugoMark className="h-9 w-9 text-white" />
          <span className="font-display text-2xl font-semibold">
            Yugo
            <small className="block font-sans text-[10px] font-semibold tracking-[0.08em] text-wheat">
              UNIDOS EN LA MISMA FE
            </small>
          </span>
        </Link>

        <div className="my-10 max-w-md">
          <h2 className="font-display text-[38px] font-semibold leading-[1.1] tracking-[-0.5px]">
            {es.welcome.headline}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{es.welcome.sub}</p>
          <div className="mt-8">
            <WelcomeInside />
          </div>
        </div>

        <div className="flex flex-wrap gap-5 text-[12px] text-ink-muted2">
          <Link href="/explorar" className="hover:text-white">
            {es.explore.cta}
          </Link>
          <Link href="/legal/privacidad" className="hover:text-white">
            Privacidad
          </Link>
          <Link href="/legal/pacto" className="hover:text-white">
            Pacto de conducta
          </Link>
        </div>
      </aside>

      <section
        className={`flex min-h-dvh flex-col ${
          tone === 'ink' ? 'bg-ink text-white' : 'bg-linen text-ink'
        } lg:border-l lg:border-white/10`}
      >
        {children}
      </section>
    </div>
  );
}
