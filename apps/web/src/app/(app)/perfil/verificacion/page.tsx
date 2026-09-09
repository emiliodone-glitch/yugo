'use client';

import { useState } from 'react';
import { es } from '@yugo/shared';
import {
  useMyProfile,
  useRedeemChurchCode,
  useRequestLeaderEndorsement,
  useVerificationStatus,
} from '@/lib/hooks';
import { DEMO_MODE, errorMessage, getApiClient } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { CheckIcon, PersonSilhouette } from '@/components/icons';
import { PhotoPlaceholder } from '@/components/ui';
import { SelfieCapture } from '@/components/selfie-capture';

const GESTURE_LABELS: Record<string, string> = {
  SMILE: 'Sonríe',
  TURN_LEFT: 'Gira la cabeza a la izquierda',
  TURN_RIGHT: 'Gira la cabeza a la derecha',
  BLINK_TWICE: 'Parpadea dos veces',
  LOOK_UP: 'Mira hacia arriba',
};

interface SelfieSession {
  uploadKey: string;
  uploadUrl: string;
  gestures: string[];
}

/**
 * Selfie con cámara (`camera`), o el flujo sin cámara (`guided`) cuando el
 * navegador no tiene una: la persona igual ve los gestos que se piden.
 */
type SelfieStage = 'idle' | 'camera' | 'guided' | 'submitted';

/** Verificación en tres niveles (RF-VER-01/02/03/04). */
export default function VerificationPage() {
  const { data: status, isLoading } = useVerificationStatus();
  const redeemCode = useRedeemChurchCode();
  const requestLeader = useRequestLeaderEndorsement();
  // Para pedir el respaldo hace falta la iglesia de la persona (en vivo).
  const { data: myProfile } = useMyProfile();

  const [selfieStage, setSelfieStage] = useState<SelfieStage>('idle');
  const [session, setSession] = useState<SelfieSession | null>(null);
  const [uploading, setUploading] = useState(false);
  const [code, setCode] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderName, setLeaderName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const identity = status?.level2;
  const endorsement = status?.level3;
  const leaderPending = status?.leaderRequest?.status === 'PENDING';

  const startSelfie = async () => {
    setError(null);
    try {
      if (DEMO_MODE) {
        setSession({ uploadKey: 'demo', uploadUrl: '', gestures: ['SMILE', 'TURN_LEFT'] });
      } else {
        setSession(await getApiClient().verification.startSelfie());
      }
      setSelfieStage('camera');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const finishSelfie = () => {
    setSelfieStage('submitted');
    setNotice('Recibimos tu selfie. Te avisaremos cuando el equipo la revise.');
  };

  /** La foto capturada sube al almacén firmado y luego se envía a revisión. */
  const uploadSelfie = async (blob: Blob) => {
    setError(null);
    setUploading(true);
    try {
      if (!DEMO_MODE) {
        const current = session ?? (await getApiClient().verification.startSelfie());
        const upload = await fetch(current.uploadUrl, {
          method: 'PUT',
          headers: { 'content-type': 'image/jpeg' },
          body: blob,
        });
        if (!upload.ok) throw new Error('upload_failed');
        await getApiClient().verification.submitSelfie(current.uploadKey, true);
      }
      finishSelfie();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setUploading(false);
    }
  };

  /** Sin cámara: se envía la sesión iniciada tal cual, como hacía antes. */
  const submitWithoutCamera = async () => {
    setError(null);
    try {
      if (!DEMO_MODE) {
        const current = session ?? (await getApiClient().verification.startSelfie());
        await getApiClient().verification.submitSelfie(current.uploadKey, true);
      }
      finishSelfie();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const submitCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await redeemCode.mutateAsync(code);
      setNotice(`¡Listo! Tu perfil muestra "Respaldado por ${result.endorsedBy}".`);
      setCode('');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const submitLeader = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const name = leaderName.trim();
    try {
      await requestLeader.mutateAsync({
        churchId: myProfile?.churchId ?? myProfile?.church?.id ?? 'demo',
        leaderEmail: leaderEmail.trim(),
        leaderName: name || undefined,
      });
      setNotice(es.profile.leaderRequestSent(name || leaderEmail.trim()));
      setLeaderEmail('');
      setLeaderName('');
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  return (
    <div>
      <PageHeader title={es.profile.verification} backHref="/perfil" />
      <div className="px-4 pb-6">
        {isLoading ? (
          <div className="card py-8 text-center text-sm text-muted">{es.common.loading}</div>
        ) : null}

        {notice ? (
          <div role="status" className="card border-0 bg-olive-soft text-[12px] text-olive-text">
            {notice}
          </div>
        ) : null}
        {error ? (
          <div role="alert" className="card border-0 bg-wine-soft text-[12px] text-wine">
            {error}
          </div>
        ) : null}

        {/* Nivel 1 — contacto */}
        <div className="card">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-olive text-white">
              <CheckIcon className="h-3.5 w-3.5" />
            </span>
            <div>
              <b className="text-[12.5px]">Nivel 1 · {es.profile.verificationContact}</b>
              <div className="text-[11px] text-muted">{es.profile.verificationContactDone}</div>
            </div>
          </div>
        </div>

        {/* Nivel 2 — identidad con selfie guiada (RF-VER-01) */}
        <div className="card">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-white ${
                identity?.status === 'APPROVED' ? 'bg-olive' : 'bg-line text-ink'
              }`}
            >
              {identity?.status === 'APPROVED' ? <CheckIcon className="h-3.5 w-3.5" /> : '2'}
            </span>
            <div className="flex-1">
              <b className="text-[12.5px]">Nivel 2 · {es.profile.verificationIdentity}</b>
              <div className="text-[11px] text-muted">
                {identity?.status === 'APPROVED'
                  ? 'Tu identidad está verificada.'
                  : identity?.status === 'PENDING' || selfieStage === 'submitted'
                    ? es.profile.verificationIdentityPending
                    : 'Toma una selfie en vivo siguiendo los gestos que te pidamos.'}
              </div>
            </div>
          </div>

          {identity?.status !== 'APPROVED' && selfieStage === 'idle' ? (
            <button type="button" className="btn btn-olive mt-3" onClick={() => void startSelfie()}>
              Comenzar verificación con selfie
            </button>
          ) : null}

          {selfieStage === 'camera' && session ? (
            <SelfieCapture
              gestures={session.gestures}
              gestureLabels={GESTURE_LABELS}
              busy={uploading}
              onConfirm={uploadSelfie}
              onCancel={() => setSelfieStage('idle')}
              onUnavailable={() => setSelfieStage('guided')}
            />
          ) : null}

          {selfieStage === 'guided' && session ? (
            <div className="mt-3">
              <PhotoPlaceholder className="h-56 rounded-card">
                <div className="absolute inset-0 flex items-center justify-center">
                  <PersonSilhouette className="h-24 w-24 text-white/50" />
                </div>
              </PhotoPlaceholder>
              <div className="mt-2 rounded-field bg-wheat-soft px-3 py-2 text-[12px] text-wheat-text">
                <b>Sigue estos gestos:</b>
                <ol className="mt-1 list-inside list-decimal">
                  {session.gestures.map((gesture) => (
                    <li key={gesture}>{GESTURE_LABELS[gesture] ?? gesture}</li>
                  ))}
                </ol>
              </div>
              <p className="mt-2 text-[11px] text-muted">
                Busca buena luz, sin lentes ni gorra. Tu selfie solo la ve el equipo de
                verificación; nunca se muestra en tu perfil.
              </p>
              <button
                type="button"
                className="btn btn-olive mt-3"
                onClick={() => void submitWithoutCamera()}
              >
                Enviar selfie
              </button>
            </div>
          ) : null}
        </div>

        {/* Nivel 3 — respaldo de iglesia (RF-VER-02/03) */}
        <div className="card">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
                endorsement?.status === 'APPROVED'
                  ? 'bg-olive text-white'
                  : 'bg-wheat text-ink-deep'
              }`}
            >
              {endorsement?.status === 'APPROVED' ? <CheckIcon className="h-3.5 w-3.5" /> : '3'}
            </span>
            <div className="flex-1">
              <b className="text-[12.5px]">Nivel 3 · {es.profile.verificationChurch}</b>
              <div className="text-[11px] text-muted">
                {endorsement?.status === 'APPROVED'
                  ? `Respaldado por ${endorsement.church?.name ?? 'tu iglesia'}.`
                  : es.profile.verificationChurchHint}
              </div>
            </div>
          </div>

          {endorsement?.status !== 'APPROVED' ? (
            <>
              <form onSubmit={submitCode} className="mt-3">
                <label htmlFor="church-code" className="text-[11px] font-medium text-muted">
                  {es.profile.enterChurchCode}
                </label>
                <input
                  id="church-code"
                  className="field mt-1 text-center uppercase tracking-[0.2em]"
                  placeholder="SION-XXXX"
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  maxLength={40}
                />
                <button
                  type="submit"
                  className="btn btn-olive mt-2"
                  disabled={redeemCode.isPending || code.trim().length < 4}
                >
                  {redeemCode.isPending ? es.common.loading : 'Validar código'}
                </button>
              </form>

              <div className="mt-4 border-t border-line pt-3">
                {leaderPending ? (
                  <p
                    role="status"
                    className="rounded-field bg-wheat-soft px-3 py-2 text-[12px] text-wheat-text"
                  >
                    {es.profile.leaderRequestPending}
                    {status?.leaderRequest?.leaderName
                      ? ` · ${status.leaderRequest.leaderName}`
                      : ''}
                  </p>
                ) : (
                  <form onSubmit={submitLeader}>
                    <label htmlFor="leader-email" className="text-[11px] font-medium text-muted">
                      {es.profile.leaderEmail}
                    </label>
                    <input
                      id="leader-email"
                      className="field mt-1"
                      type="email"
                      placeholder="pastor@iglesia.do"
                      value={leaderEmail}
                      onChange={(event) => setLeaderEmail(event.target.value)}
                    />
                    <label
                      htmlFor="leader-name"
                      className="mt-2 block text-[11px] font-medium text-muted"
                    >
                      {es.profile.leaderName}
                    </label>
                    <input
                      id="leader-name"
                      className="field mt-1"
                      type="text"
                      maxLength={80}
                      value={leaderName}
                      onChange={(event) => setLeaderName(event.target.value)}
                    />
                    <button
                      type="submit"
                      className="btn btn-ghost mt-2"
                      disabled={!leaderEmail.includes('@') || requestLeader.isPending}
                    >
                      {requestLeader.isPending ? es.common.loading : es.profile.requestLeader}
                    </button>
                  </form>
                )}
              </div>
            </>
          ) : null}
        </div>

        <p className="text-center text-[11px] text-muted">
          Las insignias se muestran en Descubrir, en tu perfil y en el chat (RF-VER-04).
        </p>
      </div>
    </div>
  );
}
