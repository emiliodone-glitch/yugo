import { JourneyService } from './journey.service';
import { notificationsMock } from '../../common/i18n/notifications.testing';

/**
 * Ruta de pareja (RF-REL-05). Lo que protege: nada existe antes del noviazgo;
 * un paso guarda quién y cuándo, sin puntaje; la consejería exige el sí de los
 * dos antes de que la iglesia se entere; solo a una iglesia de la pareja; y la
 * persona que pidió no puede confirmar su propia petición.
 */
function build(options: { stage?: string; churchB?: boolean; pending?: boolean } = {}) {
  const match = {
    id: 'm-1',
    status: 'ACTIVE',
    stage: options.stage ?? 'COURTSHIP',
    userAId: 'u-a',
    userBId: 'u-b',
    conversation: { id: 'conv-1' },
    userA: {
      id: 'u-a',
      email: 'a@yugo.do',
      profile: {
        displayName: 'Mariel',
        church: { id: 'c-1', name: 'Iglesia Bíblica Emanuel' },
        denomination: { slug: 'bautista' },
      },
    },
    userB: {
      id: 'u-b',
      email: 'b@yugo.do',
      profile: {
        displayName: 'Samuel',
        church: options.churchB === false ? null : { id: 'c-2', name: 'Parroquia San Judas' },
        denomination: { slug: 'catolica' },
      },
    },
  };
  const milestones: Array<{ key: string; doneAt: Date; doneById: string }> = [];
  const requests: Array<Record<string, unknown>> = options.pending
    ? [
        {
          id: 'cr-1',
          matchId: 'm-1',
          churchId: 'c-1',
          requestedById: 'u-a',
          status: 'PENDING_PARTNER',
          note: 'Queremos empezar antes de fijar la fecha.',
          createdAt: new Date('2026-09-01'),
          church: { id: 'c-1', name: 'Iglesia Bíblica Emanuel' },
        },
      ]
    : [];
  const prisma = {
    match: { findUnique: jest.fn(async () => match) },
    coupleMilestone: {
      findMany: jest.fn(async () => milestones),
      deleteMany: jest.fn(async ({ where }: { where: { key: string } }) => {
        const index = milestones.findIndex((m) => m.key === where.key);
        if (index >= 0) milestones.splice(index, 1);
        return { count: index >= 0 ? 1 : 0 };
      }),
      upsert: jest.fn(
        async ({ create }: { create: { key: string; doneAt: Date; doneById: string } }) => {
          milestones.push(create);
          return create;
        },
      ),
    },
    counselingRequest: {
      findFirst: jest.fn(async ({ where }: { where: { status?: unknown } }) => {
        const statuses =
          typeof where.status === 'string'
            ? [where.status]
            : ((where.status as { in?: string[] } | undefined)?.in ?? null);
        return requests.find((r) => !statuses || statuses.includes(r.status as string)) ?? null;
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'cr-new', status: 'PENDING_PARTNER', ...data };
        requests.push(row);
        return row;
      }),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        Object.assign(requests[0], data);
        return requests[0];
      }),
    },
    churchUser: { findMany: jest.fn(async () => [{ userId: 'pastor-1' }]) },
  };
  const notifications = notificationsMock();
  const moderation = { moderate: jest.fn(async () => ({ decision: 'APPROVE' })) };
  const service = new JourneyService(prisma as never, notifications as never, moderation as never);
  return { service, prisma, notifications, moderation, requests, milestones };
}

describe('JourneyService', () => {
  it('antes del noviazgo la ruta está cerrada y no consulta nada', async () => {
    const { service, prisma } = build({ stage: 'INTENTIONAL_FRIENDSHIP' });
    const state = await service.state('m-1', 'u-a');
    expect(state.unlocked).toBe(false);
    expect(state.opensAt).toBe('COURTSHIP');
    expect(state.milestones).toHaveLength(0);
    expect(prisma.coupleMilestone.findMany).not.toHaveBeenCalled();
    await expect(service.setMilestone('m-1', 'u-a', 'families', true)).rejects.toThrow(
      'journey_locked',
    );
  });

  it('en noviazgo lista los pasos, los recursos de las dos tradiciones y las dos iglesias', async () => {
    const { service } = build();
    const state = await service.state('m-1', 'u-a');
    expect(state.unlocked).toBe(true);
    expect(state.milestones.map((m) => m.key)).toContain('families');
    expect(state.resources.forYou.map((r) => r.id)).toEqual(
      expect.arrayContaining(['pre-cana', 'saving-marriage']),
    );
    expect(state.resources.general.length).toBeGreaterThan(0);
    expect(state.churches.map((c) => c.name)).toEqual([
      'Iglesia Bíblica Emanuel',
      'Parroquia San Judas',
    ]);
    expect(JSON.stringify(state)).not.toMatch(/percent|score/i);
  });

  it('un paso guarda quién y cuándo, avisa al otro y se puede desmarcar', async () => {
    const { service, notifications } = build();
    const done = await service.setMilestone('m-1', 'u-a', 'pastor', true, new Date('2026-08-30'));
    expect(done.doneAt).toBe(new Date('2026-08-30').toISOString());
    const [to, , , body] = notifications.notify.mock.calls[0] as unknown[];
    expect(to).toBe('u-b');
    expect(String(body)).toContain('Mariel marcó');

    const asOther = await service.state('m-1', 'u-b');
    const pastor = asOther.milestones.find((m) => m.key === 'pastor');
    expect(pastor?.doneByMe).toBe(false);
    expect(pastor?.doneByName).toBe('Mariel');

    expect(await service.setMilestone('m-1', 'u-b', 'pastor', false)).toEqual({
      key: 'pastor',
      doneAt: null,
    });
  });

  it('no deja marcar un paso de una etapa que todavía no declararon', async () => {
    const { service } = build({ stage: 'COURTSHIP' });
    await expect(service.setMilestone('m-1', 'u-a', 'wedding_date', true)).rejects.toThrow(
      'milestone_locked',
    );
  });

  it('la consejería solo se pide a una iglesia de los dos y queda esperando al otro', async () => {
    const { service, notifications, requests } = build();
    await expect(
      service.requestCounseling('m-1', 'u-a', {
        churchId: 'c-otra',
        note: 'Queremos consejería ya.',
      }),
    ).rejects.toThrow('church_not_yours');

    const created = await service.requestCounseling('m-1', 'u-a', {
      churchId: 'c-2',
      note: 'Queremos empezar antes de fijar la fecha.',
    });
    expect(created.status).toBe('PENDING_PARTNER');
    expect(requests).toHaveLength(1);
    // La iglesia no se entera todavía: el único aviso es para la pareja.
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect((notifications.notify.mock.calls[0] as unknown[])[0]).toBe('u-b');

    await expect(
      service.requestCounseling('m-1', 'u-b', {
        churchId: 'c-1',
        note: 'Otra petición más larga.',
      }),
    ).rejects.toThrow('counseling_already_requested');
  });

  it('quien pidió no puede confirmar; la otra persona sí, y entonces la iglesia se entera', async () => {
    const { service, notifications, requests } = build({ pending: true });
    await expect(service.respondCounseling('m-1', 'u-a', true)).rejects.toThrow(
      'cannot_confirm_own_request',
    );

    const result = await service.respondCounseling('m-1', 'u-b', true);
    expect(result.status).toBe('REQUESTED');
    expect(requests[0].status).toBe('REQUESTED');
    const recipients = notifications.notify.mock.calls.map((call) => (call as unknown[])[0]);
    expect(recipients).toEqual(expect.arrayContaining(['u-a', 'u-b', 'pastor-1']));
    const toChurch = notifications.notify.mock.calls.find(
      (call) => (call as unknown[])[0] === 'pastor-1',
    ) as unknown[];
    expect(toChurch[4]).toEqual({ counselingRequestId: 'cr-1' });
  });

  it('«ahora no» cierra la petición sin que la iglesia la vea', async () => {
    const { service, notifications, requests } = build({ pending: true });
    const result = await service.respondCounseling('m-1', 'u-b', false);
    expect(result.status).toBe('DECLINED');
    expect(requests[0].status).toBe('DECLINED');
    const recipients = notifications.notify.mock.calls.map((call) => (call as unknown[])[0]);
    expect(recipients).toEqual(['u-a']);
  });
});
