'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { es } from '@yugo/shared';
import { apiBaseUrl, apiUrlSource, type ApiUrlSource, DEMO_MODE } from '@/lib/api';
import { YugoMark } from '@/components/icons';

type Probe =
  | { state: 'checking' }
  | { state: 'ok'; ms: number; body: string }
  | { state: 'http'; status: number; ms: number }
  | { state: 'unreachable'; ms: number; message: string };

interface Resolved {
  origin: string;
  base: string;
  source: ApiUrlSource;
}

/**
 * Estado de la conexión web → API, para quien despliega.
 *
 * Existe porque «No se pudo conectar con el servidor» tiene tres causas
 * distintas que se ven iguales desde la pantalla de entrar: una URL de API
 * mal construida, una API caída, o una API que responde pero no está sana.
 * Esta página las separa sin abrir la consola del navegador y dice qué
 * variable tocar. No expone nada sensible: la URL de la API es pública por
 * definición.
 *
 * La dirección se resuelve en el navegador (puede venir de `API_URL` en
 * tiempo de ejecución), por eso se calcula tras montar y no en el render del
 * servidor.
 */
export default function StatusPage() {
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [probe, setProbe] = useState<Probe>({ state: 'checking' });

  useEffect(() => {
    const base = apiBaseUrl();
    setResolved({ origin: window.location.origin, base, source: apiUrlSource() });
    const started = performance.now();
    fetch(`${base}/health`, { headers: { accept: 'application/json' } })
      .then(async (response) => {
        const ms = Math.round(performance.now() - started);
        if (!response.ok) return setProbe({ state: 'http', status: response.status, ms });
        setProbe({ state: 'ok', ms, body: (await response.text()).slice(0, 300) });
      })
      .catch((error: unknown) => {
        setProbe({
          state: 'unreachable',
          ms: Math.round(performance.now() - started),
          message: error instanceof Error ? error.message : String(error),
        });
      });
  }, []);

  const healthUrl = resolved ? `${resolved.base}/health` : '';
  // Sin API_URL ni NEXT_PUBLIC_API_URL válidas, la web apunta a localhost:
  // en un despliegue eso es siempre un error de configuración.
  const apiUrlMissing = resolved?.source === 'default';

  return (
    <div className="min-h-dvh bg-linen">
      <header className="bg-ink text-white">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-4 py-3">
          <YugoMark className="h-7 w-7 text-white" />
          <span className="font-display text-lg font-semibold">Yugo</span>
          <span className="ml-2 text-[12px] text-ink-muted">{es.status.title}</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <div className="card">
          <h1 className="h-display text-[22px]">{es.status.heading}</h1>
          <p className="mt-1 text-[13.5px] text-muted">{es.status.sub}</p>
          <dl className="mt-4 grid gap-2 text-[13.5px]">
            <Row label={es.status.webOrigin} value={resolved?.origin ?? '…'} />
            <Row label={es.status.apiUrl} value={resolved?.base ?? '…'} warn={apiUrlMissing} />
            <Row
              label={es.status.apiUrlSource}
              value={resolved ? es.status.sources[resolved.source] : '…'}
              warn={apiUrlMissing}
              mono={false}
            />
            <Row label={es.status.demoMode} value={DEMO_MODE ? 'true' : 'false'} warn={DEMO_MODE} />
          </dl>
        </div>

        <div
          role="status"
          className={`card ${
            probe.state === 'ok'
              ? 'bg-olive-soft'
              : probe.state === 'checking'
                ? ''
                : 'bg-wine-soft'
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
            {es.status.probe}
          </div>
          {probe.state === 'checking' ? (
            <p className="mt-1 text-[14px]">{es.common.loading}</p>
          ) : probe.state === 'ok' ? (
            <>
              <p className="mt-1 text-[15px] font-semibold text-olive-text">
                {es.status.ok(probe.ms)}
              </p>
              <pre className="mt-2 overflow-x-auto rounded-field bg-white/60 p-2 text-[11.5px]">
                {probe.body}
              </pre>
              <p className="mt-2 text-[13px] text-olive-text">{es.status.okNext}</p>
            </>
          ) : probe.state === 'http' ? (
            <>
              <p className="mt-1 text-[15px] font-semibold text-wine">
                {es.status.http(probe.status)}
              </p>
              <p className="mt-2 text-[13px] text-wine">{es.status.httpHint}</p>
            </>
          ) : (
            <>
              <p className="mt-1 text-[15px] font-semibold text-wine">{es.status.unreachable}</p>
              <p className="mt-1 text-[12px] text-wine/80">{probe.message}</p>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-[13.5px] text-wine">
                {apiUrlMissing ? <li>{es.status.fixUrl}</li> : null}
                <li>
                  {es.status.openHealth}{' '}
                  <a
                    href={healthUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-semibold underline"
                  >
                    {healthUrl}
                  </a>
                </li>
                <li>{es.status.ifHealthWorks}</li>
                <li>{es.status.ifHealthFails}</li>
              </ol>
            </>
          )}
        </div>

        <p className="text-[12.5px] text-muted">
          <Link href="/entrar" className="underline">
            {es.status.backToSignIn}
          </Link>
        </p>
      </main>
    </div>
  );
}

function Row({
  label,
  value,
  warn = false,
  mono = true,
}: {
  label: string;
  value: string;
  warn?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-3">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`break-all ${mono ? 'font-mono text-[12.5px]' : ''} ${
          warn ? 'font-semibold text-wine' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
