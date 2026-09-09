'use client';

import Link from 'next/link';
import { es, intlLocale } from '@yugo/shared';
import { useChurchMe, useChurchOfficialGroup } from '@/lib/hooks';
import { BarTop, Panel } from '@/components/admin';
import { Avatar } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const when = (iso: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'short',
    timeZone: 'America/Santo_Domingo',
  })
    .format(new Date(iso))
    .replace('.', '');

/**
 * Grupo oficial de la iglesia (RF-IGL-04): el muro real, con lo publicado y
 * aprobado. Las peticiones anónimas llegan sin nombre también aquí.
 */
export default function OfficialGroupPage() {
  const me = useChurchMe();
  const group = useChurchOfficialGroup();
  const churchName = me.data?.church.name ?? 'tu iglesia';
  const data = group.data;

  return (
    <div>
      <BarTop
        title={data ? `${es.church.officialGroup} · ${data.name}` : es.church.officialGroup}
        right={
          data ? (
            <span className="chip chip-olive">
              {data.memberCount} {data.memberCount === 1 ? 'miembro' : 'miembros'}
            </span>
          ) : null
        }
      />
      <div className="p-6">
        {group.isError ? (
          <QueryError error={group.error} onRetry={() => void group.refetch()} />
        ) : null}
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Muro del grupo">
            {group.isLoading ? (
              <p className="text-sm text-muted">{es.common.loading}</p>
            ) : !data ? (
              <p className="text-sm text-muted">
                El grupo oficial se crea cuando el equipo de Yugo aprueba a la iglesia. Mientras
                tanto no hay muro que moderar.
              </p>
            ) : data.posts.length === 0 ? (
              <p className="text-sm text-muted">
                Todavía nadie publicó en el grupo. Cuando un miembro escriba, lo verás aquí.
              </p>
            ) : (
              data.posts.map((post) => (
                <div key={post.id} className="list-row items-start">
                  <Avatar name={post.author} size="s" />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <b className="text-[12.5px]">{post.author}</b>
                      <span className="text-[11px] text-muted">{when(post.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[12.5px]">{post.body}</p>
                    <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
                      {post.isPrayerRequest ? (
                        <span className="chip">Petición de oración</span>
                      ) : null}
                      {post.reactions > 0 ? <span>Amén · {post.reactions}</span> : null}
                      {post.comments > 0 ? <span>Comentarios · {post.comments}</span> : null}
                    </div>
                  </div>
                  <Link href={`/comunidad/${data.id}`} className="btn btn-ghost btn-sm">
                    Abrir
                  </Link>
                </div>
              ))
            )}
          </Panel>
          <Panel title="Administración">
            <p className="text-[12.5px] leading-relaxed text-muted">
              El grupo oficial de {churchName} se administra desde aquí: publicaciones, miembros y
              moderación propia (RF-IGL-04). Los reportes del grupo llegan a tus administradores
              antes que al equipo de Yugo.
            </p>
            {data ? (
              <Link href={`/comunidad/${data.id}`} className="btn btn-ghost mt-3 w-full">
                Ver el grupo como lo ven los miembros
              </Link>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
