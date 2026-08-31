import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AccompanimentService } from './accompaniment.service';

/**
 * The rules that make acompañamiento defensible: consent from all three,
 * revocable by any of them, and a mentor who can never reach a message.
 */

const A = 'u-a';
const B = 'u-b';
const MENTOR = 'u-mentor';
const CODE = 'PADRINOS-ABC123';

interface FakeAccompaniment {
  id: string;
  matchId: string;
  mentorId: string;
  status: string;
  invitedById: string;
  consentAId: boolean;
  consentBId: boolean;
  mentorAcceptedAt: Date | null;
  activeAt: Date | null;
  endedAt: Date | null;
  endedById: string | null;
}

function buildService(options: {
  stage?: string;
  accompaniment?: Partial<FakeAccompaniment>;
  mentorEndorsed?: boolean;
  mentorActive?: boolean;
} = {}) {
  const match = {
    id: 'm1',
    userAId: A,
    userBId: B,
    status: 'ACTIVE',
    stage: options.stage ?? 'INTENTIONAL_FRIENDSHIP',
    stageChangedAt: new Date('2026-06-01'),
  };

  const rows: FakeAccompaniment[] = options.accompaniment
    ? [
        {
          id: 'acc1',
          matchId: 'm1',
          mentorId: MENTOR,
          status: 'INVITED',
          invitedById: A,
          consentAId: true,
          consentBId: false,
          mentorAcceptedAt: null,
          activeAt: null,
          endedAt: null,
          endedById: null,
          ...options.accompaniment,
        },
      ]
    : [];

  const withMatch = (row: FakeAccompaniment) => ({
    ...row,
    match: {
      ...match,
      userA: { profile: { displayName: 'Ana', church: { name: 'Emanuel' } } },
      userB: { profile: { displayName: 'Luis', church: { name: 'Monte de Sion' } } },
      stageHistory: [{ toStage: 'INTENTIONAL_FRIENDSHIP', createdAt: new Date('2026-06-01') }],
    },
    mentor: {
      profile: { displayName: 'Pedro', church: { name: 'Emanuel' } },
      mentorProfile: { spouseName: 'Marta', marriedSince: 2009, bio: null },
    },
  });

  const prisma = {
    match: {
      findUnique: jest.fn(async () => match),
      findUniqueOrThrow: jest.fn(async () => match),
    },
    verification: {
      findFirst: jest.fn(async () => (options.mentorEndorsed === false ? null : { id: 'v3' })),
    },
    mentorProfile: {
      findUnique: jest.fn(async ({ where }: { where: { code?: string; userId?: string } }) => {
        if (where.code && where.code !== CODE) return null;
        if (where.userId && where.userId !== MENTOR) return null;
        return {
          userId: MENTOR,
          code: CODE,
          active: options.mentorActive !== false,
          spouseName: 'Marta',
          user: { profile: { displayName: 'Pedro' } },
        };
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
    },
    accompaniment: {
      findMany: jest.fn(async () => rows.map(withMatch)),
      findFirst: jest.fn(async ({ where }: { where: { status?: unknown } }) => {
        const wanted =
          typeof where.status === 'string'
            ? [where.status]
            : ((where.status as { in?: string[] })?.in ?? ['INVITED', 'ACTIVE']);
        return rows.find((row) => wanted.includes(row.status)) ?? null;
      }),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
        const row = rows.find((r) => r.id === where.id);
        return row ? withMatch(row) : null;
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: { id: string } }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        return withMatch(row);
      }),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: 'acc-new',
          status: 'INVITED',
          consentAId: false,
          consentBId: false,
          mentorAcceptedAt: null,
          activeAt: null,
          endedAt: null,
          endedById: null,
          ...data,
        } as FakeAccompaniment;
        rows.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeAccompaniment> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
  };

  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const audit = { log: jest.fn(async (..._args: unknown[]) => undefined) };

  const service = new AccompanimentService(
    prisma as never,
    notifications as never,
    audit as never,
  );
  return { service, prisma, rows, notifications, audit, match };
}

describe('AccompanimentService', () => {
  describe('lo que un padrino nunca puede ver', () => {
    it('la lista del padrino no trae conversación ni mensajes', async () => {
      const { service } = buildService({
        accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
      });
      const [bond] = await service.forMentor(MENTOR);

      // Explícito a propósito: si alguien añade estos campos algún día, esta
      // prueba lo detiene antes de que llegue a producción.
      expect(bond).not.toHaveProperty('conversationId');
      expect(bond).not.toHaveProperty('messages');
      expect(bond).not.toHaveProperty('lastMessage');
      expect(bond).not.toHaveProperty('unreadCount');
      expect(Object.keys(bond).sort()).toEqual(
        ['bothConsented', 'churches', 'id', 'names', 'since', 'stage', 'stageChangedAt', 'status'],
      );
    });

    it('el detalle tampoco: solo la etapa y cómo llegaron a ella', async () => {
      const { service } = buildService({
        accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
      });
      const detail = await service.detailForMentor('acc1', MENTOR);

      expect(Object.keys(detail).sort()).toEqual(
        ['churches', 'history', 'id', 'names', 'since', 'stage', 'stageChangedAt'],
      );
      expect(JSON.stringify(detail)).not.toContain('conversation');
    });

    it('un extraño no puede leer un acompañamiento ajeno', async () => {
      const { service } = buildService({
        accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
      });
      await expect(service.detailForMentor('acc1', 'u-stranger')).rejects.toThrow(NotFoundException);
    });

    it('un padrino invitado pero todavía no aceptado no ve nada', async () => {
      const { service } = buildService({ accompaniment: { status: 'INVITED' } });
      await expect(service.detailForMentor('acc1', MENTOR)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('consentimiento de los tres', () => {
    it('invitar deja constancia del consentimiento de quien invita, no del otro', async () => {
      const { service, rows } = buildService();
      await service.invite('m1', A, CODE);

      const row = rows[0];
      expect(row.status).toBe('INVITED');
      expect(row.consentAId).toBe(true);
      expect(row.consentBId).toBe(false);
    });

    it('no se activa hasta que los tres dijeron que sí', async () => {
      const { service, rows } = buildService({ accompaniment: {} });

      // Falta la otra persona: aceptar el padrino no basta.
      await service.mentorRespond('acc1', MENTOR, true);
      expect(rows[0].status).toBe('INVITED');

      const result = await service.consent('m1', B, true);
      expect(result.status).toBe('ACTIVE');
    });

    it('nadie puede inscribir a su pareja por su cuenta', async () => {
      const { service, rows } = buildService({ accompaniment: { mentorAcceptedAt: new Date() } });
      // A ya consintió al invitar; volver a consentir como A no activa nada.
      const result = await service.consent('m1', A, true);
      expect(result.status).toBe('INVITED');
      expect(rows[0].consentBId).toBe(false);
    });

    it('decir que no termina la invitación en vez de dejarla colgando', async () => {
      const { service, rows } = buildService({ accompaniment: {} });
      const result = await service.consent('m1', B, false);

      expect(result.status).toBe('DECLINED');
      expect(rows[0].endedById).toBe(B);
    });
  });

  describe('el acompañamiento se puede terminar', () => {
    it.each([
      ['la persona que invitó', A],
      ['la otra persona', B],
      ['el propio padrino', MENTOR],
    ])('%s puede terminarlo sin dar explicaciones', async (_label, actor) => {
      const { service, rows } = buildService({
        accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
      });
      const result = await service.end('acc1', actor);

      expect(result.status).toBe('ENDED');
      expect(rows[0].endedById).toBe(actor);
    });

    it('un extraño no puede terminar un acompañamiento ajeno', async () => {
      const { service } = buildService({
        accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
      });
      await expect(service.end('acc1', 'u-stranger')).rejects.toThrow(NotFoundException);
    });
  });

  describe('quién puede acompañar y cuándo', () => {
    it('un vínculo en «conociéndonos» todavía no tiene qué acompañar', async () => {
      const { service } = buildService({ stage: 'KNOWING' });
      await expect(service.invite('m1', A, CODE)).rejects.toThrow(BadRequestException);

      const view = await service.forCouple('m1', A);
      expect(view.canInvite).toBe(false);
      expect(view.whyNot).toBe('needs_intentional_friendship');
    });

    it('un código que no existe no revela nada', async () => {
      const { service } = buildService();
      await expect(service.invite('m1', A, 'PADRINOS-NOEXISTE')).rejects.toThrow(NotFoundException);
    });

    it('un matrimonio que se dio de baja ya no recibe parejas', async () => {
      const { service } = buildService({ mentorActive: false });
      await expect(service.invite('m1', A, CODE)).rejects.toThrow(NotFoundException);
    });

    it('no se puede acompañar el propio vínculo', async () => {
      const { service, prisma } = buildService();
      prisma.mentorProfile.findUnique = jest.fn(async () => ({
        userId: A,
        code: CODE,
        active: true,
        user: { profile: { displayName: 'Ana' } },
      })) as never;
      await expect(service.invite('m1', A, CODE)).rejects.toThrow(BadRequestException);
    });

    it('una pareja a la vez', async () => {
      const { service } = buildService({ accompaniment: { status: 'ACTIVE' } });
      await expect(service.invite('m1', A, CODE)).rejects.toThrow(BadRequestException);
    });

    it('acompañar exige el respaldo de una iglesia', async () => {
      const { service } = buildService({ mentorEndorsed: false });
      await expect(service.enableMentor('u-nuevo', {})).rejects.toThrow(ForbiddenException);
    });

    it('quien tiene respaldo nivel 3 recibe un código para compartir', async () => {
      const { service } = buildService();
      const profile = (await service.enableMentor('u-nuevo', { spouseName: 'Marta' })) as {
        code: string;
      };
      expect(profile.code).toMatch(/^PADRINOS-[0-9A-F]{6}$/);
    });
  });

  it('avisa a los padrinos cuando la pareja avanza', async () => {
    const { service, notifications } = buildService({
      accompaniment: { status: 'ACTIVE', consentBId: true, mentorAcceptedAt: new Date() },
    });
    await service.notifyStageAdvance('m1', 'Noviazgo');

    expect(notifications.notify).toHaveBeenCalledWith(
      MENTOR,
      'ACCOMPANIMENT',
      expect.any(String),
      expect.stringContaining('Noviazgo'),
      expect.anything(),
    );
  });
});
