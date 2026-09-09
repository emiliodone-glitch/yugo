'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@yugo/shared';
import { useAdminDashboard } from '@/lib/hooks';
import { YugoMark } from '@/components/icons';
import { Avatar } from '@/components/ui';
import { StaffGate } from '@/components/staff-gate';

type QueueKey = 'verifications' | 'moderation' | 'photos' | 'churches';

const NAV: Array<
  | { kind: 'link'; href: string; label: string; queue?: QueueKey }
  | { kind: 'section'; label: string }
> = [
  {
    kind: 'link',
    href: '/admin',
    get label() {
      return es.admin.dashboard;
    },
  },
  {
    kind: 'link',
    href: '/admin/miembros',
    get label() {
      return es.admin.members;
    },
  },
  {
    kind: 'link',
    href: '/admin/verificaciones',
    get label() {
      return es.admin.verifications;
    },
    queue: 'verifications',
  },
  {
    kind: 'link',
    href: '/admin/moderacion',
    get label() {
      return es.admin.moderation;
    },
    queue: 'moderation',
  },
  { kind: 'link', href: '/admin/fotos', label: 'Fotos', queue: 'photos' },
  {
    kind: 'section',
    get label() {
      return es.admin.community;
    },
  },
  {
    kind: 'link',
    href: '/admin/organizaciones',
    get label() {
      return es.admin.organizations;
    },
    queue: 'churches',
  },
  {
    kind: 'link',
    href: '/admin/eventos',
    get label() {
      return es.admin.events;
    },
  },
  {
    kind: 'link',
    href: '/admin/grupos',
    get label() {
      return es.admin.groups;
    },
  },
  {
    kind: 'link',
    href: '/admin/devocionales',
    get label() {
      return es.admin.devotionals;
    },
  },
  {
    kind: 'section',
    get label() {
      return es.admin.business;
    },
  },
  {
    kind: 'link',
    href: '/admin/suscripciones',
    get label() {
      return es.admin.subscriptions;
    },
  },
  {
    kind: 'link',
    href: '/admin/reportes',
    get label() {
      return es.admin.reports;
    },
  },
  {
    kind: 'section',
    get label() {
      return es.admin.system;
    },
  },
  {
    kind: 'link',
    href: '/admin/configuracion',
    get label() {
      return es.admin.settings;
    },
  },
  {
    kind: 'link',
    href: '/admin/auditoria',
    get label() {
      return es.admin.rolesAudit;
    },
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
  // Los globos del menú son las colas reales del tablero (antes eran números
  // fijos que nunca bajaban). Sin dato todavía, no se muestra ninguno.
  const { data: dashboard } = useAdminDashboard();
  const queues = dashboard?.queues ?? {};
  const badges: Record<QueueKey, number> = {
    verifications: queues.pendingVerifications ?? 0,
    moderation: (queues.openReports ?? 0) + (queues.heldMessages ?? 0),
    photos: queues.heldPhotos ?? 0,
    churches: queues.pendingChurches ?? 0,
  };

  return (
    <div className="flex min-h-dvh bg-linen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[210px] flex-col gap-0.5 overflow-y-auto bg-ink-deep px-3.5 py-4 text-ink-muted lg:flex">
        <Link href="/admin" className="flex items-center gap-2.5 px-2 pb-4 text-white">
          <YugoMark className="h-[26px] w-[26px]" />
          <span className="font-display text-xl font-semibold">
            Yugo
            <small className="block font-sans text-[10px] font-semibold tracking-[0.08em] text-wheat">
              {es.admin.panelName}
            </small>
          </span>
        </Link>
        {NAV.map((item) =>
          item.kind === 'section' ? (
            <div
              key={item.label}
              className="px-2.5 pb-1 pt-3.5 text-[10px] font-semibold tracking-[0.1em] text-[#7F89A6]"
            >
              {item.label}
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-[13px] ${
                isActive(item.href) ? 'bg-white/10 text-white' : 'hover:text-white'
              }`}
            >
              {item.label}
              {item.queue && badges[item.queue] > 0 ? (
                <span className="ml-auto rounded-full bg-wine px-[7px] py-px text-[10px] font-bold text-white">
                  {badges[item.queue]}
                </span>
              ) : null}
            </Link>
          ),
        )}
        <Link href="/" className="mt-auto px-2.5 py-2 text-[11px] text-[#7F89A6] hover:text-white">
          ← Volver a Yugo
        </Link>
      </aside>

      {/* Mobile top bar for admin */}
      <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-2 bg-ink-deep px-4 py-2.5 text-white lg:hidden">
        <YugoMark className="h-6 w-6" />
        <b className="font-display">Yugo</b>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-wheat">
          {es.admin.panelName}
        </span>
        <span className="ml-auto">
          <Avatar name="Admin" size="s" />
        </span>
      </div>

      {/* En móvil no había forma de moverse entre secciones: quien modera
          desde el teléfono —aprobar una petición de oración un domingo— se
          quedaba en la página en la que entró. */}
      <nav
        aria-label={es.admin.panelName}
        className="fixed inset-x-0 top-[44px] z-10 flex gap-1.5 overflow-x-auto bg-ink px-3 py-2 lg:hidden"
      >
        {NAV.filter((item) => item.kind === 'link').map((item) =>
          item.kind === 'link' ? (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-[12px] ${
                isActive(item.href) ? 'bg-white text-ink' : 'text-ink-muted'
              }`}
            >
              {item.label}
            </Link>
          ) : null,
        )}
      </nav>

      {/* Un landmark real: sin <main> el lector de pantalla no tiene
          dónde saltar y hay que recorrer el menú en cada página. */}
      <main className="w-full pt-[92px] lg:ml-[210px] lg:pt-0">
        <StaffGate>{children}</StaffGate>
      </main>
    </div>
  );
}
