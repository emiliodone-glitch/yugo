'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es, LIMITS, SAFETY_TIPS_V1 } from '@yugo/shared';
import { Toggle } from '@/components/ui';
import { PageHeader } from '@/components/page-header';

/**
 * Privacidad y seguridad: privacy controls (RF-SEG-07), safety tips
 * (RF-SEG-06) and the Ley 172-13 rights — export and delete (RF-SEG-08).
 */
export default function PrivacySecurityPage() {
  const [hideDistance, setHideDistance] = useState(false);
  const [hideEventPresence, setHideEventPresence] = useState(false);
  const [exported, setExported] = useState(false);
  const [deleteRequested, setDeleteRequested] = useState(false);

  return (
    <div>
      <PageHeader title={es.profile.privacySecurity} backHref="/perfil" />
      <div className="px-4 pb-6">
        <h2 className="h-display mb-2 mt-1 text-[15px]">Visibilidad</h2>
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <b className="text-[12.5px]">Ocultar mi distancia exacta</b>
              <div className="text-[11px] text-muted">
                Las demás personas verán un rango (&ldquo;5–10 km&rdquo;) en lugar del número exacto.
              </div>
            </div>
            <Toggle on={hideDistance} onChange={setHideDistance} label="Ocultar distancia exacta" />
          </div>
        </div>
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <b className="text-[12.5px]">Ocultar que asisto a eventos</b>
              <div className="text-[11px] text-muted">
                Tus conexiones no verán tu nombre en la lista de asistentes.
              </div>
            </div>
            <Toggle
              on={hideEventPresence}
              onChange={setHideEventPresence}
              label="Ocultar asistencia a eventos"
            />
          </div>
        </div>
        <Link href="/perfil/visibilidad" className="list-row text-[12.5px]">
          <span>{es.visibility.title}</span>
          <span className="ml-auto text-muted">›</span>
        </Link>

        {/* Safety tips (RF-SEG-06) */}
        <h2 className="h-display mb-2 mt-4 text-[15px]">Seguridad</h2>
        <div className="card border-0 bg-olive-soft">
          <div className="text-[12.5px] font-semibold text-olive-text">
            {SAFETY_TIPS_V1.firstConnection.title}
          </div>
          <ul className="mt-2 space-y-1.5">
            {SAFETY_TIPS_V1.firstConnection.points.map((point) => (
              <li key={point} className="flex gap-2 text-[11px] leading-relaxed text-olive-text">
                <span aria-hidden>·</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="card border-0 bg-wine-soft">
          <div className="text-[12.5px] font-semibold text-wine">
            {SAFETY_TIPS_V1.scamWarning.title}
          </div>
          <ul className="mt-2 space-y-1.5">
            {SAFETY_TIPS_V1.scamWarning.points.map((point) => (
              <li key={point} className="flex gap-2 text-[11px] leading-relaxed text-wine">
                <span aria-hidden>·</span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Ley 172-13 (RF-SEG-08) */}
        <h2 className="h-display mb-2 mt-4 text-[15px]">Tus datos personales</h2>
        <div className="card">
          <div className="text-[11px] text-muted">
            La Ley 172-13 de República Dominicana te da derecho a acceder, rectificar y eliminar tus
            datos personales.
          </div>
          <button
            type="button"
            className="btn btn-ghost mt-3"
            onClick={() => setExported(true)}
          >
            {exported ? 'Preparando tu descarga…' : 'Descargar mis datos'}
          </button>
          {exported ? (
            <p className="mt-2 text-[11px] text-muted">
              Te avisaremos por correo cuando la copia esté lista. El enlace vence en 24 horas.
            </p>
          ) : null}
        </div>

        <div className="card border-[1.5px] border-wine">
          <b className="text-[12.5px] text-wine">{es.profile.deleteAccount}</b>
          <div className="mt-1 text-[11px] text-muted">
            Tu perfil deja de ser visible de inmediato. Tienes {LIMITS.DELETION_GRACE_DAYS} días para
            arrepentirte: si vuelves a entrar antes, se cancela la eliminación.
          </div>
          {deleteRequested ? (
            <div className="mt-3 rounded-field bg-wine-soft px-3 py-2 text-[11px] text-wine">
              {es.profile.deleteGrace}
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-wine mt-3"
              onClick={() => {
                if (window.confirm(es.profile.deleteGrace)) setDeleteRequested(true);
              }}
            >
              {es.profile.deleteAccount}
            </button>
          )}
        </div>

        <div className="mt-4 flex justify-center gap-4 text-[11px] text-muted">
          <Link href="/legal/terminos" className="underline">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="underline">
            Política de privacidad
          </Link>
          <Link href="/legal/pacto" className="underline">
            Pacto de conducta
          </Link>
        </div>
      </div>
    </div>
  );
}
