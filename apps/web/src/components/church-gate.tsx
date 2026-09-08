'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { es } from '@yugo/shared';
import { useChurchMe, useRegisterChurch } from '@/lib/hooks';
import { ApiError, DEMO_MODE, errorMessage, hasStoredSession } from '@/lib/api';

/**
 * Puerta del portal de iglesias.
 *
 * Tres situaciones y una respuesta para cada una: sin sesión, a entrar y
 * volver; con sesión pero sin iglesia vinculada (la API responde 403
 * `not_church_user`), el formulario para registrarla; con iglesia pendiente
 * de aprobación, un aviso claro y acceso limitado. Antes, el portal mostraba
 * la iglesia de demo a cualquiera y se quedaba en «Cargando…» ante el 403.
 */
export function ChurchGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useChurchMe();
  const [hasTokens, setHasTokens] = useState<boolean | null>(DEMO_MODE ? true : null);

  useEffect(() => {
    if (DEMO_MODE) return;
    const stored = hasStoredSession();
    setHasTokens(stored);
    if (!stored) router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
  }, [pathname, router]);

  if (DEMO_MODE) return <>{children}</>;
  if (hasTokens === null || hasTokens === false) return null;
  if (me.isLoading) return <div className="p-8 text-center text-sm text-muted">{es.common.loading}</div>;

  if (me.isError) {
    const error = me.error;
    if (error instanceof ApiError && error.status === 403) return <RegisterChurch />;
    return (
      <div role="alert" className="m-6 rounded-card bg-wine-soft px-4 py-3 text-sm text-wine">
        {errorMessage(error)}
      </div>
    );
  }

  const status = me.data?.church.status;
  if (status === 'PENDING') {
    return (
      <div>
        <div className="mx-6 mt-6 rounded-card bg-wheat-soft px-4 py-3 text-sm text-wheat-text">
          <b>{es.gate.churchPendingTitle}</b>
          <p className="mt-1">{es.gate.churchPendingBody(me.data?.church.name ?? '')}</p>
        </div>
        {children}
      </div>
    );
  }
  if (status === 'REJECTED') {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="h-display text-[22px]">{es.gate.churchRejectedTitle}</h1>
        <p className="mt-2 text-sm text-muted">{es.gate.churchRejectedBody}</p>
      </div>
    );
  }
  return <>{children}</>;
}

function RegisterChurch() {
  const register = useRegisterChurch();
  const [form, setForm] = useState({ name: '', city: '', address: '', contactName: '', contactEmail: '' });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  if (register.isSuccess) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="h-display text-[22px]">{es.gate.churchPendingTitle}</h1>
        <p className="mt-2 text-sm text-muted">{es.gate.registerSent}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="h-display text-[22px]">{es.gate.churchOnlyTitle}</h1>
      <p className="mt-2 text-sm text-muted">{es.gate.churchOnlyBody}</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          register.mutate({
            name: form.name.trim(),
            city: form.city.trim() || undefined,
            address: form.address.trim() || undefined,
            contactName: form.contactName.trim() || undefined,
            contactEmail: form.contactEmail.trim() || undefined,
          });
        }}
      >
        <input className="field" placeholder={es.gate.churchName} value={form.name} onChange={set('name')} required minLength={3} />
        <input className="field" placeholder={es.gate.churchCity} value={form.city} onChange={set('city')} />
        <input className="field" placeholder={es.gate.churchAddress} value={form.address} onChange={set('address')} />
        <input className="field" placeholder={es.gate.contactName} value={form.contactName} onChange={set('contactName')} />
        <input className="field" type="email" placeholder={es.gate.contactEmail} value={form.contactEmail} onChange={set('contactEmail')} />
        {register.isError ? (
          <p role="alert" className="text-sm text-wine">
            {errorMessage(register.error)}
          </p>
        ) : null}
        <button type="submit" className="btn btn-olive" disabled={register.isPending}>
          {es.gate.registerChurch}
        </button>
      </form>
    </div>
  );
}
