'use client';

import Link from 'next/link';
import { demoCurrentUser, es } from '@yugo/shared';
import { useDemoStore } from '@/lib/demo-store';
import { Avatar, Toggle } from '@/components/ui';
import { CheckIcon } from '@/components/icons';

export default function ProfilePage() {
  const { pausedProfile, setPausedProfile } = useDemoStore();
  const user = demoCurrentUser;

  return (
    <div className="px-4 pt-4">
      {/* Header */}
      <div className="flex items-center gap-3.5">
        <Avatar name={user.displayName} size="l" />
        <div>
          <h1 className="h-display text-[19px]">
            {user.displayName}, {user.age}
          </h1>
          <div className="text-xs text-muted">
            {user.city} · {user.occupation}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="chip chip-olive">{user.denomination}</span>
            <span className="chip chip-wheat">{es.discover.purposeMarriage}</span>
          </div>
        </div>
      </div>

      {/* Completeness (RF-PER-10) */}
      <div className="card mt-3.5">
        <div className="flex items-center justify-between text-[12.5px]">
          <span>{es.profile.completeness}</span>
          <b>{user.completeness}%</b>
        </div>
        <div className="bar mt-1.5">
          <i style={{ width: `${user.completeness}%` }} />
        </div>
        <div className="mt-1.5 text-[11px] text-muted">
          {es.profile.completenessHint(user.completenessNext.field, user.completenessNext.targetPct)}
        </div>
      </div>

      {/* Verification ladder (RF-VER-04) */}
      <h2 className="h-display mb-2 mt-1 text-[15px]">{es.profile.verification}</h2>
      <div className="card px-3.5 py-1.5">
        <div className="list-row">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-olive text-white">
            <CheckIcon className="h-3 w-3" />
          </span>
          <div className="flex-1">
            <b className="text-[12.5px]">{es.profile.verificationContact}</b>
            <div className="text-[11px] text-muted">{es.profile.verificationContactDone}</div>
          </div>
        </div>
        <div className="list-row">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-olive text-white">
            <CheckIcon className="h-3 w-3" />
          </span>
          <div className="flex-1">
            <b className="text-[12.5px]">{es.profile.verificationIdentity}</b>
            <div className="text-[11px] text-muted">{es.profile.verificationIdentityDone('12 ago')}</div>
          </div>
        </div>
        <div className="list-row">
          <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-wheat text-[11px] font-bold text-ink-deep">
            3
          </span>
          <div className="flex-1">
            <b className="text-[12.5px]">{es.profile.verificationChurch}</b>
            <div className="text-[11px] text-muted">{es.profile.verificationChurchHint}</div>
          </div>
          <button type="button" className="btn btn-sm">
            {es.profile.obtain}
          </button>
        </div>
      </div>

      {/* Plus / Oro card */}
      <Link href="/plus" className="card mt-3 flex items-center justify-between border-0 bg-ink text-white">
        <div>
          <div className="h-display text-[15px] text-wheat">{es.profile.plusOroCard}</div>
          <div className="text-[11px] text-ink-muted">{es.profile.plusOroSub}</div>
        </div>
        <span className="chip bg-wheat text-ink-deep">{es.common.see}</span>
      </Link>

      {/* Settings rows */}
      <div className="mt-1.5">
        <Link href="/perfil/preferencias" className="list-row text-[12.5px]">
          <span>{es.profile.searchPreferences}</span>
          <span className="ml-auto text-muted">›</span>
        </Link>
        <Link href="/perfil/visibilidad" className="list-row text-[12.5px]">
          <span>{es.profile.privacySecurity}</span>
          <span className="ml-auto text-muted">›</span>
        </Link>
        <div className="list-row text-[12.5px]">
          <span>{es.profile.pauseProfile}</span>
          <span className="ml-auto">
            <Toggle on={pausedProfile} onChange={setPausedProfile} label={es.profile.pauseProfile} />
          </span>
        </div>
        <button
          type="button"
          className="list-row w-full text-left text-[12.5px] text-wine"
          onClick={() => window.confirm(es.profile.deleteGrace)}
        >
          {es.profile.deleteAccount}
        </button>
      </div>
      <p className="pb-6 pt-3 text-center text-[11px] text-muted">
        Yugo v0.1 · {es.common.tagline}
      </p>
    </div>
  );
}
