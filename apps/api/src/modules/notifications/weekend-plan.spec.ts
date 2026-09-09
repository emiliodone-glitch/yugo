import { WeekendPlanService } from './weekend-plan.service';

/**
 * Plan de domingo (RF-NOT-04). Lo que protege: solo se avisa a quien tiene
 * algo que ver (evento, devocional de mañana o una conexión callada); nunca
 * se manda un plan vacío; la persona que apagó el resumen tampoco recibe
 * esto; y la conexión que se sugiere retomar es la que más días lleva.
 */
const NOW = new Date('2026-09-12T14:00:00Z'); // sábado 10:00 en Santo Domingo

function build(options: {
  event?: boolean;
  devotional?: boolean;
  quietDays?: number[];
  optedOut?: boolean;
}) {
  const users = [
    {
      id: 'u-1',
      email: 'samuel@yugo.do',
      emailVerifiedAt: new Date('2026-01-01'),
      weeklyDigestOptOutAt: options.optedOut ? new Date() : null,
      profile: { displayName: 'Samuel', city: 'Santo Domingo', churchId: 'c-1' },
    },
  ];
  const matches = (options.quietDays ?? []).map((days, index) => ({
    id: `m-${index}`,
    userAId: 'u-1',
    userBId: `u-other-${index}`,
    createdAt: new Date('2026-01-01'),
    conversation: {
      id: `conv-${index}`,
      messages: [{ sentAt: new Date(NOW.getTime() - days * 86_400_000) }],
    },
    userA: { profile: { displayName: 'Samuel' } },
    userB: { profile: { displayName: `Persona ${index}` } },
  }));
  const prisma = {
    user: {
      findMany: jest.fn(async ({ where }: { where: { weeklyDigestOptOutAt: null } }) =>
        users.filter((u) => (where.weeklyDigestOptOutAt === null ? !u.weeklyDigestOptOutAt : true)),
      ),
    },
    event: {
      findFirst: jest.fn(async () =>
        options.event
          ? {
              id: 'e-1',
              title: 'Vigilia de jóvenes',
              startsAt: new Date('2026-09-12T23:00:00Z'),
              church: { name: 'Vida Nueva' },
            }
          : null,
      ),
    },
    devotional: {
      findFirst: jest.fn(async () =>
        options.devotional ? { reference: 'Rut 1:16', title: 'Donde tú vayas' } : null,
      ),
    },
    match: { findMany: jest.fn(async () => matches) },
  };
  const mailer = { send: jest.fn(async () => undefined) };
  const notifications = { notify: jest.fn(async () => undefined) };
  const service = new WeekendPlanService(prisma as never, mailer as never, notifications as never);
  return { service, mailer, notifications };
}

describe('WeekendPlanService', () => {
  it('no manda nada cuando no hay evento, devocional ni conexión callada', async () => {
    const { service, mailer, notifications } = build({});
    expect(await service.run(NOW)).toBe(0);
    expect(mailer.send).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('avisa con el evento, la Palabra de mañana y la conexión que más días lleva callada', async () => {
    const { service, mailer, notifications } = build({
      event: true,
      devotional: true,
      quietDays: [1, 5, 9],
    });
    expect(await service.run(NOW)).toBe(1);
    const [, category, title, body, data] = notifications.notify.mock.calls[0] as unknown[];
    expect(category).toBe('EVENT');
    expect(title).toBe('Tu plan de domingo');
    expect(String(body)).toContain('Vigilia de jóvenes');
    expect(String(body)).toContain('Rut 1:16');
    expect(String(body)).toContain('Persona 2 lleva 9 días');
    expect(String(body)).not.toMatch(/racha|perdiste/i);
    expect(data).toEqual({ eventId: 'e-1' });
    const [, template, input] = mailer.send.mock.calls[0] as unknown[];
    expect(template).toBe('WEEKEND_PLAN');
    expect((input as { quietName: string }).quietName).toBe('Persona 2');
  });

  it('una conexión con mensajes recientes no se sugiere retomar', async () => {
    const { service, notifications } = build({ quietDays: [1, 2] });
    expect(await service.run(NOW)).toBe(0);
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('respeta a quien apagó el resumen por correo', async () => {
    const { service, mailer } = build({ event: true, optedOut: true });
    expect(await service.run(NOW)).toBe(0);
    expect(mailer.send).not.toHaveBeenCalled();
  });
});
