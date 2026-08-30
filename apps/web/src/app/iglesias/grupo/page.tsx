'use client';

import { demoChurch, demoPosts, es } from '@yugo/shared';
import { BarTop, Panel } from '@/components/admin';
import { Avatar } from '@/components/ui';

export default function OfficialGroupPage() {
  return (
    <div>
      <BarTop
        title={`${es.church.officialGroup} · Jóvenes adultos SDE`}
        right={<span className="chip chip-olive">142 miembros</span>}
      />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          <Panel title="Muro del grupo">
            {demoPosts.map((post) => (
              <div key={post.id} className="list-row items-start">
                <Avatar name={post.author.displayName} size="s" />
                <div className="flex-1">
                  <b className="text-[12.5px]">{post.author.displayName}</b>
                  <p className="mt-0.5 text-[12.5px]">{post.body}</p>
                  <div className="mt-1.5 flex gap-2 text-[11px] text-muted">
                    {post.isPrayerRequest ? <span>🙏 {post.prayingCount} orando</span> : null}
                    <span>Amén · {post.amenCount}</span>
                  </div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm">
                  Moderar
                </button>
              </div>
            ))}
          </Panel>
          <Panel title="Administración">
            <p className="text-[12.5px] leading-relaxed text-muted">
              El grupo oficial de {demoChurch.name} se administra desde aquí: publicaciones,
              miembros y moderación propia (RF-IGL-04). Los reportes del grupo llegan a tus
              administradores antes que al equipo de Yugo.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
