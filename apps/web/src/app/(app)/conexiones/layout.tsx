'use client';

import { usePathname } from 'next/navigation';
import { ConnectionsList } from '@/components/connections-list';

/**
 * Conexiones en pantalla ancha: la lista a la izquierda y la conversación a
 * la derecha, como cualquier mensajería de escritorio. En el teléfono se
 * conserva el flujo de dos pantallas (lista → chat) que ya conocen los
 * miembros de la app.
 *
 * El índice (/conexiones) muestra la lista en ambos casos; en escritorio, la
 * derecha queda con una invitación a elegir una conversación. Al abrir un
 * chat, en el teléfono la lista desaparece y en escritorio se queda al lado
 * con la fila activa resaltada.
 */
export default function ConnectionsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isIndex = pathname === '/conexiones';
  const activeId = isIndex ? undefined : pathname.split('/')[2];

  return (
    <div className="xl:grid xl:h-dvh xl:grid-cols-[360px_minmax(0,1fr)] xl:overflow-hidden">
      <div
        className={`${isIndex ? '' : 'hidden xl:block'} xl:overflow-y-auto xl:border-r xl:border-line xl:bg-linen xl:pb-8`}
      >
        <ConnectionsList activeId={activeId} />
      </div>
      <div className={`${isIndex ? 'hidden xl:flex' : ''} xl:min-h-0 xl:flex-col`}>{children}</div>
    </div>
  );
}
