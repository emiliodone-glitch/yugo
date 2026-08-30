'use client';

import Link from 'next/link';
import { useState } from 'react';
import { es, LIMITS } from '@yugo/shared';
import { useActivateBoost, useBoostStatus } from '@/lib/hooks';
import { errorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { StarIcon } from '@/components/icons';

/** RF-DES-10 "Perfil destacado": 24 h en las primeras posiciones. */
export default function BoostPage() {
  const { data: status, isLoading } = useBoostStatus();
  const activate = useActivateBoost();
  const [error, setError] = useState<string | null>(null);

  const activeUntil = status?.activeUntil ? new Date(status.activeUntil) : null;
  const isFree = status?.tier === 'FREE';

  const handleActivate = async () => {
    setError(null);
    try {
      await activate.mutateAsync();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <div>
      <PageHeader title="Perfil destacado" backHref="/perfil" />
      <div className="px-4">
        <div className="card border-0 bg-ink text-white">
          <div className="flex items-center gap-2">
            <StarIcon className="h-4 w-4 text-wheat" />
            <b className="text-[12.5px]">Aparece primero por 24 horas</b>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-muted">
            Tu perfil se muestra en las primeras posiciones de Descubrir de las personas
            compatibles contigo. La regla mutua de edad y el resto de filtros siguen aplicando.
          </p>
        </div>

        {isLoading ? (
          <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
        ) : isFree ? (
          <Link href="/plus" className="card block border-[1.5px] border-wheat bg-wheat-soft">
            <b className="text-[12.5px] text-wheat-text">Destacar tu perfil es de Plus y Oro</b>
            <div className="mt-1 text-[11px] text-wheat-text">
              Plus incluye {LIMITS.FEATURED_PER_WEEK_PLUS} destaque por semana; Oro incluye{' '}
              {LIMITS.FEATURED_PER_WEEK_ORO}.
            </div>
          </Link>
        ) : (
          <>
            <div className="card">
              <div className="flex items-center justify-between text-[12.5px]">
                <span>Destaques disponibles esta semana</span>
                <b>
                  {status?.remaining} / {status?.allowancePerWeek}
                </b>
              </div>
              <div className="bar mt-2">
                <i
                  style={{
                    width: `${((status?.remaining ?? 0) / (status?.allowancePerWeek || 1)) * 100}%`,
                  }}
                />
              </div>
            </div>

            {activeUntil ? (
              <div className="card border-[1.5px] border-wheat bg-wheat-soft">
                <b className="text-[12.5px] text-wheat-text">Tu perfil está destacado ahora</b>
                <div className="mt-1 text-[11px] text-wheat-text">
                  Hasta el{' '}
                  {new Intl.DateTimeFormat('es-DO', {
                    weekday: 'long',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                    timeZone: 'America/Santo_Domingo',
                  }).format(activeUntil)}
                  .
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-wheat"
                disabled={activate.isPending || (status?.remaining ?? 0) <= 0}
                onClick={handleActivate}
              >
                {activate.isPending ? es.common.loading : 'Destacar mi perfil ahora'}
              </button>
            )}

            {error ? (
              <div className="mt-3 rounded-field bg-wine-soft px-3 py-2 text-[12px] text-wine">
                {error}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
