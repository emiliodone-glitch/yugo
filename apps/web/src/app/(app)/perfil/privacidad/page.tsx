'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { es, intlLocale, LIMITS, SAFETY_TIPS_V1 } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useAccountStatus,
  useDeleteAccount,
  useExportData,
  usePrivacyPreferences,
  useRestoreAccount,
  useSetPrivacyPreferences,
} from '@/lib/hooks';
import { Toggle } from '@/components/ui';
import { ConfirmPanel } from '@/components/confirm-panel';
import { PageHeader } from '@/components/page-header';

function longDate(iso: string): string {
  return new Intl.DateTimeFormat(intlLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(iso));
}

/**
 * Privacidad y seguridad: privacy controls (RF-SEG-07), safety tips
 * (RF-SEG-06) and the Ley 172-13 rights — export and delete (RF-SEG-08).
 *
 * Todo lo que se toca aquí se guarda de verdad: los interruptores leen y
 * escriben las preferencias de la cuenta, «Descargar mis datos» entrega el
 * archivo y eliminar la cuenta programa el borrado con su plazo de gracia,
 * que se puede cancelar desde esta misma pantalla.
 */
export default function PrivacySecurityPage() {
  const prefs = usePrivacyPreferences();
  const setPrefs = useSetPrivacyPreferences();
  const account = useAccountStatus();
  const deleteAccount = useDeleteAccount();
  const restoreAccount = useRestoreAccount();
  const exportData = useExportData();

  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(flashTimer.current);
      if (exportUrl) URL.revokeObjectURL(exportUrl);
    },
    [exportUrl],
  );

  const hideDistance = prefs.data?.hideExactDistance ?? false;
  const hideEventPresence = prefs.data ? !prefs.data.allowEventPresenceVisible : false;

  const save = async (patch: {
    hideExactDistance?: boolean;
    allowEventPresenceVisible?: boolean;
  }) => {
    setError(null);
    try {
      await setPrefs.mutateAsync(patch);
      setSavedFlash(true);
      window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1800);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const exportMine = async () => {
    setError(null);
    try {
      const data = await exportData.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      setExportUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const confirmDelete = async () => {
    setError(null);
    try {
      await deleteAccount.mutateAsync();
      setConfirmingDelete(false);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const exportFilename = `yugo-datos-${new Date().toISOString().slice(0, 10)}.json`;
  const deletion = account.data?.deletionRequestedAt ? account.data : null;

  return (
    <div>
      <PageHeader title={es.profile.privacySecurity} backHref="/perfil" />
      <div className="px-4 pb-6">
        <div className="mb-2 mt-1 flex items-center justify-between">
          <h2 className="h-display text-[15px]">Visibilidad</h2>
          {savedFlash ? (
            <span role="status" className="chip chip-olive">
              {es.common.saved}
            </span>
          ) : null}
        </div>
        {error ? (
          <div role="alert" className="card border-0 bg-wine-soft text-[12px] text-wine">
            {error}
          </div>
        ) : null}
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <b className="text-[12.5px]">Ocultar mi distancia exacta</b>
              <div className="text-[11px] text-muted">
                Las demás personas verán un rango (&ldquo;5–10 km&rdquo;) en lugar del número
                exacto.
              </div>
            </div>
            <Toggle
              on={hideDistance}
              disabled={prefs.isLoading}
              onChange={(value) => void save({ hideExactDistance: value })}
              label="Ocultar distancia exacta"
            />
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
              disabled={prefs.isLoading}
              onChange={(value) => void save({ allowEventPresenceVisible: !value })}
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
          {exportUrl ? (
            <div role="status" className="mt-3">
              <p className="text-[12px] font-semibold text-olive-text">{es.profile.exportReady}</p>
              <a href={exportUrl} download={exportFilename} className="btn btn-olive mt-2">
                {es.profile.exportDownload}
              </a>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-ghost mt-3"
              disabled={exportData.isPending}
              onClick={() => void exportMine()}
            >
              {exportData.isPending ? es.profile.exportPreparing : 'Descargar mis datos'}
            </button>
          )}
        </div>

        <div className="card border-[1.5px] border-wine">
          <b className="text-[12.5px] text-wine">{es.profile.deleteAccount}</b>
          <div className="mt-1 text-[11px] text-muted">
            Tu perfil deja de ser visible de inmediato. Tienes{' '}
            {account.data?.graceDays ?? LIMITS.DELETION_GRACE_DAYS} días para arrepentirte: si
            vuelves a entrar antes, se cancela la eliminación.
          </div>
          {deletion ? (
            <div className="mt-3">
              <p
                role="status"
                className="rounded-field bg-wine-soft px-3 py-2 text-[11px] text-wine"
              >
                {es.profile.deleteScheduled(
                  deletion.deletesAt ? longDate(deletion.deletesAt) : es.profile.deleteGrace,
                )}
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-2"
                disabled={restoreAccount.isPending}
                onClick={() => restoreAccount.mutate()}
              >
                {es.profile.deleteCancel}
              </button>
            </div>
          ) : confirmingDelete ? (
            <ConfirmPanel
              className="mt-3"
              title={es.profile.deleteConfirmTitle}
              body={es.profile.deleteConfirmBody}
              confirmLabel={es.profile.deleteAccount}
              busy={deleteAccount.isPending}
              onConfirm={() => void confirmDelete()}
              onCancel={() => setConfirmingDelete(false)}
            />
          ) : (
            <button
              type="button"
              className="btn btn-wine mt-3"
              disabled={account.isLoading}
              onClick={() => setConfirmingDelete(true)}
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
