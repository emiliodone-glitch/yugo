'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@yugo/shared';
import {
  CalendarIcon,
  ChatIcon,
  DiscoverIcon,
  GroupIcon,
  HomeIcon,
  UserIcon,
  YugoMark,
} from './icons';
import { ApiStatusBanner, SessionGate } from './session-gate';
import { NotificationBell } from './notification-bell';

const TABS = [
  {
    href: '/inicio',
    get label() {
      return es.tabs.home;
    },
    Icon: HomeIcon,
  },
  {
    href: '/descubrir',
    get label() {
      return es.tabs.discover;
    },
    Icon: DiscoverIcon,
  },
  {
    href: '/conexiones',
    get label() {
      return es.tabs.connections;
    },
    Icon: ChatIcon,
  },
  {
    href: '/comunidad',
    get label() {
      return es.tabs.community;
    },
    Icon: GroupIcon,
  },
  {
    href: '/eventos',
    get label() {
      return es.tabs.events;
    },
    Icon: CalendarIcon,
  },
] as const;

const startsWithAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

/**
 * Member app shell: on mobile, a centered column with the 5-tab bottom bar
 * (exactly the mockups' tabbar); on desktop, a fixed left rail with the same
 * navigation plus profile access.
 *
 * En escritorio el contenido va **centrado** en el espacio que queda a la
 * derecha del riel, con un ancho útil de hasta 1400 px. Antes quedaba pegado
 * al riel y limitado a ~1000 px, y en una pantalla de 1920 la mitad derecha
 * se veía vacía: parecía una web a medio hacer.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  // Lo que se lee con calma —el devocional, el plan Plus, un texto legal— se
  // queda en columna de lectura: un párrafo estirado a 1400 px se lee peor.
  // El muro de oración va a dos columnas en un ancho intermedio.
  const reading = startsWithAny(pathname, ['/devocional', '/plus', '/legal']);
  const medium = startsWithAny(pathname, ['/oracion']);
  const split = startsWithAny(pathname, ['/conexiones']);
  const widthAtXl = reading ? 'xl:max-w-3xl' : medium ? 'xl:max-w-5xl' : 'xl:max-w-[1400px]';
  // Plus tiene fondo oscuro de borde a borde: si solo lo pintara la página,
  // el resto del área quedaría claro y se vería partido.
  const dark = pathname === '/plus';

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-col bg-ink-deep px-3.5 py-4 text-ink-muted md:flex">
        <Link href="/inicio" className="flex items-center gap-2.5 px-2 pb-4 text-white">
          <YugoMark className="h-7 w-7" />
          <span className="font-display text-xl font-semibold">
            Yugo
            <small className="block font-sans text-[10px] font-semibold tracking-[0.08em] text-wheat">
              UNIDOS EN LA MISMA FE
            </small>
          </span>
        </Link>
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[13px] transition ${
              isActive(href)
                ? 'bg-white/10 text-white'
                : 'hover:translate-x-0.5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        ))}
        <div className="mt-auto">
          <NotificationBell active={isActive('/perfil/notificaciones')} />
          <Link
            href="/perfil"
            className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[13px] transition ${
              isActive('/perfil')
                ? 'bg-white/10 text-white'
                : 'hover:translate-x-0.5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <UserIcon className="h-[18px] w-[18px]" />
            {es.tabs.profile}
          </Link>
        </div>
      </aside>

      {/* Content column */}
      <main
        className={`w-full flex-1 pb-24 md:pl-[220px] ${
          // Conexiones ocupa el alto exacto de la ventana (lista y chat con su
          // propio scroll); un relleno inferior haría scroll a toda la página.
          split ? 'xl:pb-0 md:pb-8' : 'md:pb-8'
        } ${dark ? 'bg-ink' : ''}`}
      >
        <div className={`mx-auto w-full max-w-xl md:max-w-2xl xl:px-6 ${widthAtXl}`}>
          <SessionGate>
            <ApiStatusBanner />
            {children}
          </SessionGate>
        </div>
      </main>

      {/* Mobile tab bar (mockup) */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 items-center justify-around border-t border-line bg-white pb-1.5 md:hidden">
        {TABS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-[3px] text-[10px] font-medium ${
              isActive(href) ? 'text-ink' : 'text-muted'
            }`}
          >
            <Icon className="h-[22px] w-[22px]" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Screen header matching the mockups' `top-app` row. */
export function ScreenHeader({
  title,
  right,
  sub,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 pb-1.5 pt-3">
      <div>
        {sub ? <div className="text-xs text-muted">{sub}</div> : null}
        <h1 className="h-display text-[19px] lg:text-[24px]">{title}</h1>
      </div>
      {right}
    </div>
  );
}
