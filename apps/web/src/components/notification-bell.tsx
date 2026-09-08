'use client';

import Link from 'next/link';
import { es } from '@yugo/shared';
import { useSession, useUnreadNotifications } from '@/lib/hooks';

/**
 * Entrada a Notificaciones en el riel de escritorio, con el número de no
 * leídas en vivo (RF-NOT-01). Solo consulta cuando hay sesión: en «explorar
 * sin cuenta» no hay nada que contar ni socket que abrir.
 */
export function NotificationBell({ active }: { active: boolean }) {
  const session = useSession();
  const { data: unread = 0 } = useUnreadNotifications(!!session.data);

  return (
    <Link
      href="/perfil/notificaciones"
      className={`flex items-center gap-2.5 rounded-[9px] px-2.5 py-2.5 text-[13px] transition ${
        active ? 'bg-white/10 text-white' : 'hover:text-white'
      }`}
      aria-label={
        unread > 0 ? `${es.notifications.title}: ${unread} sin leer` : es.notifications.title
      }
    >
      <svg
        viewBox="0 0 24 24"
        className="h-[18px] w-[18px]"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden
      >
        <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z" strokeLinejoin="round" />
        <path d="M10 20a2 2 0 0 0 4 0" strokeLinecap="round" />
      </svg>
      {es.notifications.title}
      {unread > 0 ? (
        <span className="ml-auto rounded-full bg-wine px-[7px] py-px text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
