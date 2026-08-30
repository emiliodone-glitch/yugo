'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';
import { Avatar } from '@/components/ui';

const NAV: Array<
  | { kind: 'link'; href: string; label: string; badge?: number; badgeClass?: string }
  | { kind: 'section'; label: string }
> = [
  { kind: 'link', href: '/admin', label: es.admin.dashboard },
  { kind: 'link', href: '/admin/miembros', label: es.admin.members },
  { kind: 'link', href: '/admin/verificaciones', label: es.admin.verifications, badge: 23 },
  { kind: 'link', href: '/admin/moderacion', label: es.admin.moderation, badge: 9 },
  { kind: 'section', label: es.admin.community },
  { kind: 'link', href: '/admin/organizaciones', label: es.admin.organizations, badge: 4 },
  { kind: 'link', href: '/admin/eventos', label: es.admin.events },
  { kind: 'link', href: '/admin/grupos', label: es.admin.groups },
  { kind: 'section', label: es.admin.business },
  { kind: 'link', href: '/admin/suscripciones', label: es.admin.subscriptions },
  { kind: 'link', href: '/admin/reportes', label: es.admin.reports },
  { kind: 'section', label: es.admin.system },
  { kind: 'link', href: '/admin/configuracion', label: es.admin.settings },
  { kind: 'link', href: '/admin/auditoria', label: es.admin.rolesAudit },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

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
              {item.badge ? (
                <span className="ml-auto rounded-full bg-wine px-[7px] py-px text-[10px] font-bold text-white">
                  {item.badge}
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

      <div className="w-full pt-12 lg:ml-[210px] lg:pt-0">{children}</div>
    </div>
  );
}
