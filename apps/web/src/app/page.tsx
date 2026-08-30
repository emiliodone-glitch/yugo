import Link from 'next/link';
import { es } from '@yugo/shared';
import { YugoMark } from '@/components/icons';

/** Bienvenida — the promise in one sentence; serene, no hearts or flames. */
export default function WelcomePage() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 py-8">
        <div>
          <YugoMark className="h-14 w-14 text-white" />
          <h1 className="mt-5 font-display text-[34px] font-semibold leading-[1.1] tracking-[-0.5px]">
            Conoce a alguien
            <br />
            que ya ora
            <br />
            como tú.
          </h1>
          <p className="mt-3.5 max-w-sm text-[13.5px] leading-relaxed text-ink-muted">
            {es.welcome.sub}
          </p>
        </div>

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="chip bg-white/10 text-white">{es.welcome.chipVerified}</span>
            <span className="chip bg-white/10 text-white">{es.welcome.chipAdults}</span>
          </div>
          <Link href="/registro" className="btn btn-wheat">
            {es.welcome.createProfile}
          </Link>
          <Link
            href="/inicio"
            className="btn mt-2 border-[1.5px] border-white/40 bg-transparent text-white"
          >
            {es.welcome.haveAccount}
          </Link>
          <p className="mt-3 text-center text-[11px] text-ink-muted2">{es.welcome.socialHint}</p>
          <div className="mt-6 flex justify-center gap-5 text-[11px] text-ink-muted2">
            <Link href="/admin" className="hover:text-white">
              Panel administrativo
            </Link>
            <Link href="/iglesias" className="hover:text-white">
              Portal de iglesias
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
