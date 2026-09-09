import type { Metadata, Viewport } from 'next';
import { DM_Sans, Fraunces } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { ErrorReporting } from '@/lib/error-reporting';
import './globals.css';

// La dirección de la API se lee del entorno del servidor en cada petición
// (ver `runtimeConfigScript`), así que ninguna página puede quedar congelada
// en el build: todas se sirven dinámicas.
export const dynamic = 'force-dynamic';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-fraunces',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export const metadata: Metadata = {
  title: 'Yugo — Unidos en la misma fe',
  description:
    'Plataforma de citas con propósito, comunidad y eventos para cristianos de todas las denominaciones.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Yugo', statusBarStyle: 'default' },
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#22315C',
};

/**
 * Configuración que el navegador necesita y que no debe hornearse al construir.
 *
 * `API_URL` la lee el servidor web al servir la página y la deja en
 * `window.__YUGO_API_URL__`. Así, en Railway se cambia la variable y la web
 * apunta al sitio correcto sin reconstruir; con `NEXT_PUBLIC_API_URL` una
 * referencia sin resolver quedaba grabada en el bundle y la única salida era
 * otro build. Se serializa con JSON y se escapa `<` para que ningún valor
 * pueda cerrar la etiqueta.
 */
function runtimeConfigScript(): string {
  const safe = (value: string) => JSON.stringify(value).replace(/</g, '\\u003c');
  const apiUrl = process.env.API_URL ?? '';
  // SENTRY_DSN_WEB (RNF-08) y la versión desplegada llegan por el mismo camino
  // para poder activar el reporte de errores sin reconstruir.
  const sentryDsn = process.env.SENTRY_DSN_WEB ?? '';
  const release = process.env.RAILWAY_GIT_COMMIT_SHA ?? '';
  return (
    `window.__YUGO_API_URL__=${safe(apiUrl)};` +
    `window.__YUGO_SENTRY_DSN__=${safe(sentryDsn)};` +
    `window.__YUGO_RELEASE__=${safe(release)};`
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-DO" className={`${fraunces.variable} ${dmSans.variable}`}>
      <head>
        <script
          id="yugo-runtime-config"
          dangerouslySetInnerHTML={{ __html: runtimeConfigScript() }}
        />
      </head>
      <body>
        <ErrorReporting />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
