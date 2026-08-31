'use client';

import { es } from '@yugo/shared';
import { PrayerWall } from '@/components/devotional';
import { PageHeader } from '@/components/page-header';

/**
 * El muro de oración de toda la comunidad.
 *
 * Las peticiones vivían enterradas dentro de un grupo: solo oraba por ellas
 * quien ya estaba adentro, que casi siempre es quien menos necesitaba que le
 * contaran.
 */
export default function PrayerPage() {
  return (
    <div className="pb-4">
      <PageHeader title={es.prayer.title} backHref="/inicio" />
      <div className="px-4">
        <PrayerWall />
      </div>
    </div>
  );
}
