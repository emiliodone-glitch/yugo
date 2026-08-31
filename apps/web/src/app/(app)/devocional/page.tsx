'use client';

import { es } from '@yugo/shared';
import { DevotionalCard } from '@/components/devotional';
import { PageHeader } from '@/components/page-header';

/**
 * El devocional completo, con la reflexión propia y las de la congregación.
 *
 * Tiene pantalla propia y no solo una tarjeta en Inicio porque leerlo con
 * calma es la actividad, no un trámite antes de ver sugerencias.
 */
export default function DevotionalPage() {
  return (
    <div className="pb-4">
      <PageHeader title={es.devotional.title} backHref="/inicio" />
      <div className="px-4">
        <DevotionalCard />
      </div>
    </div>
  );
}
