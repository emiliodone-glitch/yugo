import { ConflictException } from '@nestjs/common';
import { LIMITS } from '@yugo/shared';
import { AuthService } from './auth.service';

/**
 * Eliminar la cuenta y arrepentirse (RF-AUT-08).
 *
 * Lo que protege: pedir la eliminación deja la cuenta en gracia (no la
 * borra), cierra las sesiones y queda en la bitácora; cancelarla solo es
 * posible mientras dura la gracia y también queda registrado.
 */

const USER_ID = 'u-samuel';
const DAY = 86400000;

function build(user: { status: string; deletionRequestedAt: Date | null } | null) {
  const update = jest.fn().mockResolvedValue({});
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update },
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const tokens = { revokeAll: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(
    prisma as never,
    audit as never,
    {} as never,
    {} as never,
    tokens as never,
    {} as never,
  );
  return { service, update, audit, tokens };
}

describe('AuthService · eliminación con gracia', () => {
  it('requestDeletion deja la cuenta pendiente, cierra sesiones y lo audita', async () => {
    const { service, update, audit, tokens } = build({
      status: 'ACTIVE',
      deletionRequestedAt: null,
    });

    const result = await service.requestDeletion(USER_ID);

    expect(result).toEqual({ graceDays: LIMITS.DELETION_GRACE_DAYS });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ status: 'DELETION_PENDING' }),
      }),
    );
    expect(update.mock.calls[0][0].data.deletionRequestedAt).toBeInstanceOf(Date);
    expect(tokens.revokeAll).toHaveBeenCalledWith(USER_ID);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_DELETION_REQUESTED' }),
    );
  });

  it('restoreAccount vuelve a ACTIVE dentro del plazo y lo audita', async () => {
    const { service, update, audit } = build({
      status: 'DELETION_PENDING',
      deletionRequestedAt: new Date(Date.now() - 3 * DAY),
    });

    const result = await service.restoreAccount(USER_ID);

    expect(result).toEqual({ restored: true });
    expect(update).toHaveBeenCalledWith({
      where: { id: USER_ID },
      data: { status: 'ACTIVE', deletionRequestedAt: null },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ACCOUNT_DELETION_CANCELLED', targetId: USER_ID }),
    );
  });

  it('restoreAccount rechaza una cuenta que no pidió eliminarse', async () => {
    const { service, update } = build({ status: 'ACTIVE', deletionRequestedAt: null });
    await expect(service.restoreAccount(USER_ID)).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it('restoreAccount rechaza cuando el plazo de gracia ya venció', async () => {
    const { service, update } = build({
      status: 'DELETION_PENDING',
      deletionRequestedAt: new Date(Date.now() - (LIMITS.DELETION_GRACE_DAYS + 1) * DAY),
    });
    await expect(service.restoreAccount(USER_ID)).rejects.toMatchObject({
      message: 'grace_period_over',
    });
    expect(update).not.toHaveBeenCalled();
  });
});
