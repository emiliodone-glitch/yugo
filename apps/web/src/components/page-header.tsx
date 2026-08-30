import Link from 'next/link';
import { es } from '@yugo/shared';
import { ChevronLeft } from './icons';

/** Back-navigation header used by secondary member screens. */
export function PageHeader({
  title,
  backHref,
  right,
}: {
  title: string;
  backHref: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-4 pb-1.5 pt-3">
      <Link
        href={backHref}
        aria-label={es.common.back}
        className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] border border-line bg-white"
      >
        <ChevronLeft className="h-4 w-4 text-ink" />
      </Link>
      <h1 className="h-display flex-1 text-[19px]">{title}</h1>
      {right}
    </div>
  );
}
