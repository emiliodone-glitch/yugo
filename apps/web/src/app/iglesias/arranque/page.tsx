'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es } from '@yugo/shared';
import { useChurchCodes, useChurchEvents, useChurchMe, useChurchUsers } from '@/lib/hooks';
import { BarTop, Panel } from '@/components/admin';
import { QueryError } from '@/components/query-error';

/**
 * Arranque por iglesia (estrategia de densidad).
 *
 * En un piloto pequeño nadie encuentra a nadie si entra sola. La forma de
 * que Descubrir tenga caras es que la congregación entre junta: códigos
 * impresos el domingo, un mensaje para el grupo de la iglesia, el equipo
 * del portal invitado y un primer evento publicado. Esta página es esa
 * lista, con lo que ya está hecho marcado con datos reales.
 */
export default function ChurchKickoffPage() {
  const me = useChurchMe();
  const codes = useChurchCodes();
  const events = useChurchEvents();
  const users = useChurchUsers();
  const [copied, setCopied] = useState(false);

  if (me.isError || !me.data) {
    return me.isLoading ? (
      <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>
    ) : (
      <QueryError error={me.error} onRetry={() => void me.refetch()} />
    );
  }

  const church = me.data.church;
  const activeCodes = (codes.data ?? []).filter(
    (code) => !code.usedAt && Date.parse(code.expiresAt) > Date.now(),
  ).length;
  const usedCodes = (codes.data ?? []).filter((code) => !!code.usedAt).length;
  const published = (events.data ?? []).filter((event) => event.status === 'PUBLISHED').length;
  const team = (users.data ?? []).length;
  const approved = church.status === 'APPROVED';

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const message = `Hermanos: nuestra iglesia ya está en Yugo, la app de citas con propósito y comunidad para cristianos. Si eres soltero o soltera y quieres usarla, pídeme tu código de respaldo el domingo y entra en ${origin || 'la web de Yugo'}/registro. Grupos, eventos y el devocional son gratis para todos.`;

  const steps: Array<{
    done: boolean;
    title: string;
    body: string;
    href?: string;
    cta?: string;
  }> = [
    {
      done: approved,
      title: 'La iglesia está aprobada',
      body: approved
        ? 'El equipo de Yugo aprobó la iglesia: ya pueden respaldar miembros y publicar eventos.'
        : 'El equipo de Yugo está revisando la solicitud. Mientras tanto puedes preparar lo demás.',
    },
    {
      done: activeCodes + usedCodes >= 20,
      title: 'Genera un lote de códigos de respaldo',
      body: `${activeCodes} vigentes sin usar · ${usedCodes} canjeados. Un código por persona soltera que quiera entrar; es lo que le da la insignia de tu iglesia.`,
      href: '/iglesias/codigos',
      cta: 'Ir a códigos',
    },
    {
      done: usedCodes >= 5,
      title: 'Imprime las tarjetas y entrégalas el domingo',
      body: 'El lote se imprime en tarjetas recortables. Entregarlas en mano, después del servicio, funciona mucho mejor que mandar el código por mensaje.',
      href: '/iglesias/codigos/imprimir',
      cta: 'Imprimir lote',
    },
    {
      done: team >= 2,
      title: 'Invita a tu equipo al portal',
      body: `${team} ${team === 1 ? 'persona tiene' : 'personas tienen'} acceso. Un editor de eventos y otro administrador evitan que todo dependa de una sola persona.`,
      href: '/iglesias/usuarios',
      cta: 'Invitar',
    },
    {
      done: published >= 1,
      title: 'Publica el primer evento',
      body: `${published} ${published === 1 ? 'evento publicado' : 'eventos publicados'}. Un encuentro de solteros o una vigilia es la primera razón para abrir la app juntos.`,
      href: '/iglesias/eventos/nuevo',
      cta: 'Crear evento',
    },
  ];
  const completed = steps.filter((step) => step.done).length;

  return (
    <div>
      <BarTop
        title="Arranque de la congregación"
        right={
          <span className="chip">
            {completed} de {steps.length} listos
          </span>
        }
      />
      <div className="p-6">
        <div className="grid items-start gap-4 xl:grid-cols-[1.3fr_1fr]">
          <Panel title="Los cinco pasos">
            {steps.map((step, index) => (
              <div key={step.title} className="list-row items-start">
                <span
                  className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                    step.done ? 'bg-olive text-white' : 'bg-linen-2 text-muted'
                  }`}
                >
                  {step.done ? '✓' : index + 1}
                </span>
                <div className="flex-1">
                  <b className="text-[12.5px]">{step.title}</b>
                  <div className="text-[11.5px] text-muted">{step.body}</div>
                </div>
                {step.href && !step.done ? (
                  <Link href={step.href} className="btn btn-olive btn-sm">
                    {step.cta}
                  </Link>
                ) : step.href ? (
                  <Link href={step.href} className="btn btn-ghost btn-sm">
                    Ver
                  </Link>
                ) : null}
              </div>
            ))}
            <p className="mt-3 text-[11px] text-muted">
              Descubrir muestra hasta 30 personas al día y necesita gente cerca para tener sentido.
              Una congregación que entra junta llena esa lista desde el primer día; una persona sola
              se encuentra una pantalla vacía y no vuelve.
            </p>
          </Panel>

          <div className="grid gap-4">
            <Panel title="Mensaje para el grupo de la iglesia">
              <p className="rounded-field bg-linen px-3 py-2 text-[12.5px] leading-relaxed">
                {message}
              </p>
              <button
                type="button"
                className="btn btn-sm mt-2 w-auto px-4"
                onClick={() => {
                  void navigator.clipboard.writeText(message).then(() => setCopied(true));
                }}
              >
                {copied ? 'Copiado ✓' : 'Copiar mensaje'}
              </button>
            </Panel>
            <Panel title="Qué no hace falta">
              <ul className="list-disc space-y-1 pl-4 text-[12px] text-muted">
                <li>
                  No hay que pedir el teléfono de nadie: la persona entra con su propio correo.
                </li>
                <li>No verás quién sale con quién; el portal solo muestra totales.</li>
                <li>No hay costo para la iglesia ni para quien solo usa grupos y eventos.</li>
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
