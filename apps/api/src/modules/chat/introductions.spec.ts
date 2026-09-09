import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IntroductionsService } from './introductions.service';

/**
 * Presentación por padrino (RF-ACO-05). Las reglas que la hacen defendible:
 * solo un padrino activo propone; ninguna de las dos personas ve a la otra
 * antes de que las dos acepten; un «no» cierra sin decir quién fue; el «sí»
 * doble crea la conexión igual que un interés mutuo.
 */

const MENTOR = 'u-mentor';
const A = 'u-a';
const B = 'u-b';

interface Row {
  id: string;
  proposerId: string;
  userAId: string;
  userBId: string;
  note: string;
  statusA: string;
  statusB: string;
  status: string;
  matchId: string | null;
  createdAt: Date;
  expiresAt: Date;
  resolvedAt: Date | null;
}

function build(options: { mentorActive?: boolean; row?: Partial<Row>; matchStatus?: string } = {}) {
  const users = {
    [A]: {
      id: A,
      email: 'ana@yugo.do',
      phone: null,
      gender: 'FEMALE',
      status: 'ACTIVE',
      profile: { displayName: 'Ana', city: 'Santo Domingo', church: { name: 'Emanuel' } },
    },
    [B]: {
      id: B,
      email: 'luis@yugo.do',
      phone: null,
      gender: 'MALE',
      status: 'ACTIVE',
      profile: { displayName: 'Josué', city: 'Santiago', church: { name: 'Monte de Sion' } },
    },
    [MENTOR]: {
      id: MENTOR,
      email: 'pastor@yugo.do',
      phone: null,
      gender: 'MALE',
      status: 'ACTIVE',
      profile: {
        displayName: 'Pastor Luis',
        city: 'Santo Domingo',
        church: { name: 'Vida Nueva' },
      },
    },
  };
  const rows: Row[] = options.row
    ? [
        {
          id: 'i1',
          proposerId: MENTOR,
          userAId: A,
          userBId: B,
          note: 'Los dos sirven en jóvenes y creo que se entenderían.',
          statusA: 'PENDING',
          statusB: 'PENDING',
          status: 'PENDING',
          matchId: null,
          createdAt: new Date('2026-09-01'),
          expiresAt: new Date('2099-01-01'),
          resolvedAt: null,
          ...options.row,
        },
      ]
    : [];
  const matches: Array<{ id: string; userAId: string; userBId: string; status: string }> =
    options.matchStatus ? [{ id: 'm1', userAId: A, userBId: B, status: options.matchStatus }] : [];

  const withUsers = (row: Row) => ({
    ...row,
    proposer: users[MENTOR],
    userA: users[A],
    userB: users[B],
  });

  const prisma = {
    mentorProfile: {
      findUnique: jest.fn(async () =>
        options.mentorActive === false ? null : { userId: MENTOR, active: true },
      ),
    },
    user: {
      findFirst: jest.fn(async ({ where }: { where: { OR: Array<{ email?: string }> } }) => {
        const email = where.OR[0].email;
        return Object.values(users).find((user) => user.email === email) ?? null;
      }),
    },
    block: { findFirst: jest.fn(async () => null) },
    match: {
      findUnique: jest.fn(async () => matches[0] ?? null),
      upsert: jest.fn(async () => {
        const match = {
          id: 'm-new',
          userAId: A,
          userBId: B,
          status: 'ACTIVE',
          conversation: { id: 'c-new' },
        };
        matches.push(match);
        return match;
      }),
    },
    introduction: {
      findFirst: jest.fn(async () => rows.find((row) => row.status === 'PENDING') ?? null),
      findMany: jest.fn(async () => rows.map(withUsers)),
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) =>
          rows.find((row) => row.id === where.id) ?? null,
      ),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) =>
        withUsers(rows.find((row) => row.id === where.id) as Row),
      ),
      create: jest.fn(async ({ data }: { data: Partial<Row> }) => {
        const row = Object.assign(
          {
            id: 'i-new',
            statusA: 'PENDING',
            statusB: 'PENDING',
            status: 'PENDING',
            matchId: null,
            createdAt: new Date(),
            resolvedAt: null,
          },
          data,
        ) as Row;
        rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const row = rows.find((item) => item.id === where.id) as Row;
        Object.assign(row, data);
        return row;
      }),
    },
    profile: {
      findUnique: jest.fn(async ({ where }: { where: { userId: string } }) => ({
        displayName: users[where.userId as keyof typeof users]?.profile.displayName ?? 'Miembro',
      })),
    },
  };
  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const moderation = {
    moderate: jest.fn(async () => ({ decision: 'APPROVE', risk: 0, categories: [] })),
  };
  const service = new IntroductionsService(
    prisma as never,
    notifications as never,
    moderation as never,
  );
  return { service, prisma, rows, notifications };
}

describe('IntroductionsService', () => {
  it('solo un padrino activo puede proponer', async () => {
    const { service } = build({ mentorActive: false });
    await expect(
      service.propose(MENTOR, { a: 'ana@yugo.do', b: 'luis@yugo.do', note: 'x'.repeat(30) }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propone, avisa a las dos personas y no revela a ninguna la identidad de la otra', async () => {
    const { service, notifications } = build();
    const result = await service.propose(MENTOR, {
      a: 'ana@yugo.do',
      b: 'luis@yugo.do',
      note: 'Los dos sirven en jóvenes y creo que se entenderían.',
    });
    expect(result.status).toBe('PENDING');
    expect(notifications.notify).toHaveBeenCalledTimes(2);

    const mine = await service.mine(A);
    expect(mine).toHaveLength(1);
    expect(mine[0].otherHint).toEqual({ churchName: 'Monte de Sion', city: 'Santiago' });
    expect(JSON.stringify(mine[0])).not.toContain('Josué');
  });

  it('rechaza presentar a dos personas ya conectadas o del mismo género', async () => {
    const { service } = build({ matchStatus: 'ACTIVE' });
    await expect(
      service.propose(MENTOR, { a: 'ana@yugo.do', b: 'luis@yugo.do', note: 'x'.repeat(30) }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const { service: service2 } = build();
    await expect(
      service2.propose(MENTOR, { a: 'luis@yugo.do', b: 'pastor@yugo.do', note: 'x'.repeat(30) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('un «no» cierra la presentación y al padrino no se le dice quién fue', async () => {
    const { service, rows, notifications } = build({ row: {} });
    const result = await service.respond('i1', B, false);
    expect(result.status).toBe('DECLINED');
    expect(rows[0].status).toBe('DECLINED');
    const [, , title, body] = notifications.notify.mock.calls[0];
    expect(String(title)).toContain('no se concretó');
    expect(String(body)).not.toContain('Luis');
  });

  it('el primer «sí» espera; el segundo crea la conexión y avisa a los tres', async () => {
    const { service, rows, prisma, notifications } = build({ row: {} });
    const first = await service.respond('i1', A, true);
    expect(first.status).toBe('PENDING');
    expect(rows[0].statusA).toBe('ACCEPTED');
    expect(prisma.match.upsert).not.toHaveBeenCalled();

    const second = await service.respond('i1', B, true);
    expect(second.status).toBe('MATCHED');
    expect(second.conversationId).toBe('c-new');
    expect(rows[0].status).toBe('MATCHED');
    expect(rows[0].matchId).toBe('m-new');
    expect(notifications.notify).toHaveBeenCalledTimes(3);
  });

  it('una persona ajena no puede responder', async () => {
    const { service } = build({ row: {} });
    await expect(service.respond('i1', 'u-otro', true)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
