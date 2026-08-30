'use client';

import { es } from '@yugo/shared';
import { BarTop, DataTable, Td } from '@/components/admin';
import { Avatar } from '@/components/ui';

const USERS = [
  { name: 'Pastor Luis Reyes', email: 'luis@montedesion.do', role: 'Administrador' },
  { name: 'Keila Torres', email: 'keila@montedesion.do', role: 'Editora de eventos' },
];

export default function PortalUsersPage() {
  return (
    <div>
      <BarTop
        title={es.church.portalUsers}
        right={
          <button type="button" className="btn btn-olive btn-sm">
            + Invitar usuario
          </button>
        }
      />
      <div className="p-6">
        <DataTable headers={['Usuario', 'Correo', 'Rol', '']}>
          {USERS.map((user) => (
            <tr key={user.email}>
              <Td>
                <span className="flex items-center gap-2">
                  <Avatar name={user.name} size="s" />
                  <b>{user.name}</b>
                </span>
              </Td>
              <Td>{user.email}</Td>
              <Td>
                <span className={`chip ${user.role === 'Administrador' ? 'chip-olive' : ''}`}>{user.role}</span>
              </Td>
              <Td>
                <button type="button" className="btn btn-ghost btn-sm">
                  Editar
                </button>
              </Td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-2 text-[11px] text-muted">
          Roles del portal: administrador y editor de eventos (RF-IGL-02).
        </p>
      </div>
    </div>
  );
}
