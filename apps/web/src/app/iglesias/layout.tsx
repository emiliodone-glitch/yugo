'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { demoChurch, es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';

const NAV = [
  { href: '/iglesias', label: es.church.home },
  { href: '/iglesias/eventos', label: es.church.events },
  { href: '/iglesias/grupo', label: es.church.officialGroup },
  { href: '/iglesias/codigos', label: es.church.endorsementCodes },
  { href: '/iglesias/metricas', label: es.church.metrics },
  { href: '/iglesias/usuarios', label: es.church.portalUsers },
];

export default function ChurchLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/iglesias' ? pathname === '/iglesias' : pathname.startsWith(href);

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
        <div className="mt-auto px-2.5 py-2 text-xs">
          <b>{demoChurch.name}</b>
          <br />
          {demoChurch.denomination} · {es.church.approved}
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-20 flex items-center gap-2 bg-olive px-4 py-2.5 text-white lg:hidden">
        <YugoMark className="h-6 w-6" />
        <b className="font-display">Yugo</b>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-[#F7F5E4]">
          {es.church.portalName}
        </span>
      </div>

      <div className="w-full pt-12 lg:ml-[210px] lg:pt-0">{children}</div>
    </div>
  );
}
