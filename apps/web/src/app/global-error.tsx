'use client';

/**
 * Último recurso cuando falla el árbol entero (incluido el layout). Reporta
 * el error si hay Sentry y ofrece volver a intentar, sin dejar la pantalla en
 * blanco. Va sin estilos compartidos a propósito: si el layout falló, puede
 * que la hoja de estilos tampoco esté.
 */
import { useEffect } from 'react';
import { reportError } from '@/lib/error-reporting';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="es-DO">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#FAF8F3',
          color: '#22315C',
          fontFamily: 'system-ui, sans-serif',
          padding: 24,
        }}
      >
        <main style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Algo salió mal</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, opacity: 0.8 }}>
            Ya quedó registrado. Puedes intentar de nuevo; si sigue pasando, cierra y vuelve a abrir
            Yugo.
          </p>
          {error.digest ? (
            <p style={{ fontSize: 11, opacity: 0.6 }}>Referencia: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: '10px 18px',
              borderRadius: 999,
              border: 0,
              background: '#22315C',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}
