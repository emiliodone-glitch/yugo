'use client';

import { useState } from 'react';
import { es, intlLocale } from '@yugo/shared';
import { errorMessage } from '@/lib/api';
import {
  useChurchInvitations,
  useChurchMe,
  useChurchUsers,
  useInviteChurchUser,
  useRemoveChurchUser,
  useRevokeInvitation,
} from '@/lib/hooks';
import { BarTop, DataTable, Panel, Td } from '@/components/admin';
import { Avatar } from '@/components/ui';
import { QueryError } from '@/components/query-error';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  EVENT_EDITOR: 'Editor de eventos',
};

/**
 * Usuarios del portal (RF-IGL-02): quiénes entran por esta iglesia, invitar a
 * otra cuenta de Yugo y retirar accesos. Solo un administrador puede hacerlo.
 */
export default function PortalUsersPage() {
  const me = useChurchMe();
  const users = useChurchUsers();
  const invite = useInviteChurchUser();
  const remove = useRemoveChurchUser();
  const invitations = useChurchInvitations();
  const revoke = useRevokeInvitation();
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'EVENT_EDITOR'>('EVENT_EDITOR');
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const isAdmin = (me.data?.role ?? 'ADMIN') === 'ADMIN';
  const rows = users.data ?? [];
  const admins = rows.filter((user) => user.role === 'ADMIN').length;

  const submit = async () => {
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFailure('Escribe un correo válido de una cuenta de Yugo.');
      return;
    }
    setFailure(null);
    try {
      const result = await invite.mutateAsync({ email: value, role });
      if (result.invited && result.inviteUrl) {
        setInviteUrl(result.inviteUrl);
        setNotice(
          `${value} todavía no tiene cuenta en Yugo: le enviamos una invitación por correo. También puedes copiarle el enlace; vence en 7 días.`,
        );
      } else {
        setInviteUrl(null);
        setNotice(`${value} ya puede entrar al portal como ${ROLE_LABEL[role].toLowerCase()}.`);
      }
      setEmail('');
      setOpen(false);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  const drop = async (id: string, name: string) => {
    setFailure(null);
    try {
      await remove.mutateAsync(id);
      setNotice(`${name} ya no tiene acceso al portal.`);
    } catch (error) {
      setFailure(errorMessage(error));
    }
  };

  return (
    <div>
      <BarTop
        title={es.church.portalUsers}
        right={
          isAdmin ? (
            <button
              type="button"
              className="btn btn-olive btn-sm"
              onClick={() => setOpen((v) => !v)}
            >
              + Invitar usuario
            </button>
          ) : null
        }
      />
      <div className="p-6">
        {notice ? (
          <div
            role="status"
            className="mb-4 rounded-field bg-olive-soft px-4 py-3 text-sm text-olive-text"
          >
            {notice}
          </div>
        ) : null}
        {failure ? (
          <div role="alert" className="mb-4 rounded-field bg-wine-soft px-4 py-3 text-sm text-wine">
            {failure}
          </div>
        ) : null}
        {inviteUrl ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-field border border-line bg-white px-3 py-2 text-[12px]">
            <code className="flex-1 break-all">{inviteUrl}</code>
            <button
              type="button"
              className="btn btn-sm w-auto px-3"
              onClick={() => {
                void navigator.clipboard.writeText(inviteUrl).then(() => setCopied(true));
              }}
            >
              {copied ? 'Copiado ✓' : 'Copiar enlace'}
            </button>
          </div>
        ) : null}

        {open ? (
          <Panel title="Invitar a una cuenta de Yugo">
            <div className="grid gap-3 md:grid-cols-[1fr_200px_auto]">
              <label className="text-[12px]">
                <span className="mb-1 block text-muted">Correo de la cuenta</span>
                <input
                  className="field"
                  type="email"
                  placeholder="nombre@correo.do"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <label className="text-[12px]">
                <span className="mb-1 block text-muted">Rol</span>
                <select
                  className="field"
                  value={role}
                  onChange={(event) => setRole(event.target.value as 'ADMIN' | 'EVENT_EDITOR')}
                >
                  <option value="EVENT_EDITOR">Editor de eventos</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
              <div className="flex items-end gap-1.5">
                <button
                  type="button"
                  className="btn btn-olive"
                  disabled={invite.isPending}
                  onClick={() => void submit()}
                >
                  Invitar
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                  {es.common.cancel}
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Si la persona ya tiene cuenta en Yugo, entra al portal de inmediato. Si no, recibe un
              enlace de invitación (7 días) que la lleva a crear su cuenta ya vinculada. El editor
              de eventos publica y edita eventos; el administrador además gestiona códigos y
              usuarios.
            </p>
          </Panel>
        ) : null}

        {users.isError ? (
          <QueryError error={users.error} onRetry={() => void users.refetch()} />
        ) : null}
        <DataTable headers={['Usuario', 'Correo', 'Rol', '']}>
          {users.isLoading ? (
            <tr>
              <Td>{es.common.loading}</Td>
            </tr>
          ) : null}
          {rows.map((user) => (
            <tr key={user.id}>
              <Td>
                <span className="flex items-center gap-2">
                  <Avatar name={user.name} size="s" />
                  <b>{user.name}</b>
                  {user.isMe ? <span className="chip">Tú</span> : null}
                </span>
              </Td>
              <Td>{user.email ?? '—'}</Td>
              <Td>
                <span className={`chip ${user.role === 'ADMIN' ? 'chip-olive' : ''}`}>
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
              </Td>
              <Td>
                {isAdmin && !user.isMe ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={remove.isPending}
                    onClick={() => void drop(user.id, user.name)}
                  >
                    Retirar acceso
                  </button>
                ) : user.isMe && admins === 1 && user.role === 'ADMIN' ? (
                  <span className="text-[11px] text-muted">Único administrador</span>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Roles del portal: administrador y editor de eventos (RF-IGL-02).
        </p>

        {(invitations.data ?? []).length > 0 ? (
          <div className="mt-6">
            <h2 className="h-display mb-2 text-[15px]">Invitaciones pendientes</h2>
            <DataTable headers={['Correo', 'Rol', 'Vence', '']}>
              {(invitations.data ?? []).map((invitation) => (
                <tr key={invitation.id}>
                  <Td>{invitation.email}</Td>
                  <Td>{ROLE_LABEL[invitation.role] ?? invitation.role}</Td>
                  <Td>{new Date(invitation.expiresAt).toLocaleDateString(intlLocale())}</Td>
                  <Td>
                    <span className="flex gap-1.5">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void navigator.clipboard.writeText(invitation.inviteUrl)}
                      >
                        Copiar enlace
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={revoke.isPending}
                        onClick={() => revoke.mutate(invitation.id)}
                      >
                        Anular
                      </button>
                    </span>
                  </Td>
                </tr>
              ))}
            </DataTable>
          </div>
        ) : null}
      </div>
    </div>
  );
}
