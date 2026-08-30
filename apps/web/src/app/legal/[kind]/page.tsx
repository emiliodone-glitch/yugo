import Link from 'next/link';
import { notFound } from 'next/navigation';
import { COVENANT_V1, PRIVACY_V1, TERMS_V1 } from '@yugo/shared';
import { YugoMark } from '@/components/icons';

/** Public legal pages (RF-ADM-10, RF-SEG-08). Store review links to these. */
const DOCUMENTS = {
  terminos: {
    title: 'Términos de servicio',
    version: TERMS_V1.version,
    sections: TERMS_V1.sections,
    footnote: null as string | null,
  },
  privacidad: {
    title: 'Política de privacidad',
    version: PRIVACY_V1.version,
    sections: PRIVACY_V1.sections,
    footnote: PRIVACY_V1.law,
  },
  pacto: {
    title: 'Pacto de conducta',
    version: COVENANT_V1.version,
    sections: COVENANT_V1.points.map((point, index) => ({
      title: `Compromiso ${index + 1}`,
      body: point,
    })),
    footnote:
      'Aceptar el pacto es obligatorio para usar Yugo. Si publicamos una versión nueva, te pediremos aceptarla otra vez.',
  },
} as const;

export function generateStaticParams() {
  return Object.keys(DOCUMENTS).map((kind) => ({ kind }));
}

export default function LegalPage({ params }: { params: { kind: string } }) {
  const document = DOCUMENTS[params.kind as keyof typeof DOCUMENTS];
  if (!document) notFound();

  return (
    <div className="min-h-dvh bg-linen">
      <header className="bg-ink px-6 py-6 text-white">
        <Link href="/" className="flex items-center gap-3">
          <YugoMark className="h-9 w-9" />
          <span className="font-display text-2xl font-semibold">
            Yugo
            <small className="block font-sans text-[10px] font-semibold tracking-[0.08em] text-wheat">
              UNIDOS EN LA MISMA FE
            </small>
          </span>
        </Link>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="h-display text-[26px]">{document.title}</h1>
        <p className="mt-1 text-xs text-muted">
          Versión {document.version} · República Dominicana
        </p>

        <div className="mt-6 space-y-5">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2 className="h-display text-[15px]">{section.title}</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-body">{section.body}</p>
            </section>
          ))}
        </div>

        {document.footnote ? (
          <p className="mt-8 rounded-field bg-linen-2 px-4 py-3 text-[12px] text-muted">
            {document.footnote}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-4 text-[12px] text-muted">
          <Link href="/legal/terminos" className="underline">
            Términos
          </Link>
          <Link href="/legal/privacidad" className="underline">
            Privacidad
          </Link>
          <Link href="/legal/pacto" className="underline">
            Pacto de conducta
          </Link>
          <a href="mailto:privacidad@yugo.do" className="underline">
            privacidad@yugo.do
          </a>
        </div>
      </main>
    </div>
  );
}
