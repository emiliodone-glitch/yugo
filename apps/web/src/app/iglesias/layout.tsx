'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';
import { ChurchGate } from '@/components/church-gate';
import { useChurchMe } from '@/lib/hooks';

/** Nombre y estado de la iglesia de quien entró, no el de la demo. */
function ChurchFooter() {
  const { data } = useChurchMe();
  if (!data) return null;
  const status =
    data.church.status === 'APPROVED'
      ? es.church.approved
      : data.church.status === 'PENDING'
        ? es.gate.churchPendingTitle
        : data.church.status;
  return (
    <div className="mt-auto px-2.5 py-2 text-xs">
      <b>{data.church.name}</b>
      <br />
      {status}
    </div>
  );
}

const NAV = [
  { href: '/iglesias', label: es.church.home },
  { href: '/iglesias/arranque', label: 'Arranque' },
  { href: '/iglesias/eventos', label: es.church.events },
  { href: '/iglesias/solteros', label: es.singlesMinistry.title },
  { href: '/iglesias/consejeria', label: es.church.counseling },
  { href: '/iglesias/grupo', label: es.church.officialGroup },
  { href: '/iglesias/codigos', label: es.church.endorsementCodes },
  { href: '/iglesias/metricas', label: es.church.metrics },
  { href: '/iglesias/usuarios', label: es.church.portalUsers },
];

export default function ChurchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/iglesias' ? pathname === '/iglesias' : pathname.startsWith(href);

  // El enlace de invitación lo abre alguien que todavía no tiene cuenta ni rol
  // de iglesia: va sin la puerta del portal y sin su menú.
  if (pathname.startsWith('/iglesias/invitacion')) return <>{children}</>;

  return (
    <div className="flex min-h-dvh bg-linen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[210px] flex-col gap-0.5 bg-olive px-3.5 py-4 text-[#F7F5E4] lg:flex">
        <Link href="/iglesias" className="flex items-center gap-2.5 px-2 pb-4 text-white">
          <YugoMark className="h-[26px] w-[26px]" />
          <span className="font-display text-xl font-semibold">
            Yugo
            <small className="block font-sans text-[10px] font-semibold tracking-[0.08em] text-[#F7F5E4]">
              {es.church.portalName}
            </small>
          </span>
        </Link>
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-[9px] px-2.5 py-2 text-[13px] ${
              isActive(item.href) ? 'bg-black/15 text-white' : 'hover:text-white'
            }`}
          >
            {item.label}
          </Link>
        ))}
        <ChurchFooter />
        <Link href="/" className="px-2.5 py-2 text-[11px] text-[#F7F5E4] hover:text-white">
          ← Volver a Yugo
        </Link>
      </aside>

      <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-2 bg-olive px-4 py-2.5 text-white lg:hidden">
        <YugoMark className="h-6 w-6" />
        <b className="font-display">Yugo</b>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[#F7F5E4]">
          {es.church.portalName}
        </span>
      </div>

      {/* Un landmark real: sin <main> el lector de pantalla no tiene
          dónde saltar y hay que recorrer el menú en cada página. */}
      <main className="w-full pt-12 lg:ml-[210px] lg:pt-0">
        <ChurchGate>{children}</ChurchGate>
      </main>
    </div>
  );
}
