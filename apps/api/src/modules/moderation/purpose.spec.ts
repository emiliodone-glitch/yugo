import { PurposeService } from './purpose.service';

/**
 * Lo que se prueba aquí no son los umbrales — eso vive en `@yugo/shared` con
 * sus propias pruebas — sino las consecuencias: a quién se le abre un caso, a
 * quién se le habla en privado, y sobre todo qué NO pasa automáticamente.
 */

const NOW = Date.now();
const daysAgo = (n: number) => new Date(NOW - n * 86400_000);

function buildService(options: {
  interests?: number;
  connections?: number;
  conversationsStarted?: number;
  conversationsWithReplies?: number;
  stageChanges?: number;
  flagged?: number;
  reports?: number;
  accountAgeDays?: number;
  badge?: boolean;
  openCase?: boolean;
  recentNudge?: boolean;
} = {}) {
  const cases: Array<Record<string, unknown>> = options.openCase
    ? [{ id: 'c1', kind: 'PURPOSE', subjectUserId: 'u1', status: 'OPEN' }]
    : [];
  const profile = { userId: 'u1', purposeBadge: options.badge ?? false };

  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn(async () => ({
        createdAt: daysAgo(options.accountAgeDays ?? 90),
      })),
      findMany: jest.fn(async () => [{ id: 'u1' }]),
    },
    interest: { count: jest.fn(async () => options.interests ?? 10) },
    match: { count: jest.fn(async () => options.connections ?? 3) },
    message: {
      groupBy: jest.fn(async () =>
        Array.from({ length: options.conversationsStarted ?? 8 }, (_, i) => ({
          conversationId: `c${i}`,
        })),
      ),
      count: jest.fn(async () => options.flagged ?? 0),
    },
    relationshipStageChange: {
      findMany: jest.fn(async () =>
        Array.from({ length: options.stageChanges ?? 1 }, (_, i) => ({ matchId: `m${i}` })),
      ),
    },
    report: { count: jest.fn(async () => options.reports ?? 0) },
    profile: {
      findUnique: jest.fn(async () => profile),
      update: jest.fn(async ({ data }: { data: { purposeBadge: boolean } }) => {
        profile.purposeBadge = data.purposeBadge;
        return profile;
      }),
    },
    moderationCase: {
      findFirst: jest.fn(async () => cases[0] ?? null),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        cases.push(data);
        return data;
      }),
    },
    notification: {
      findFirst: jest.fn(async () => (options.recentNudge ? { id: 'n1' } : null)),
    },
    $queryRaw: jest.fn(async () => [{ count: BigInt(options.conversationsWithReplies ?? 4) }]),
  };

  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const audit = { log: jest.fn(async (..._args: unknown[]) => undefined) };

  const service = new PurposeService(prisma as never, notifications as never, audit as never);
  return { service, prisma, cases, profile, notifications, audit };
}

describe('PurposeService', () => {
  describe('lo que nunca pasa solo', () => {
    it('nadie es suspendido ni expulsado por una señal', async () => {
      // Lo más fuerte que ocurre automáticamente es que una persona del
      // equipo mire el caso. Sancionar sigue siendo de un humano.
      const { service, prisma, notifications } = buildService({
        interests: 80,
        conversationsStarted: 1,
        connections: 20,
        conversationsWithReplies: 0,
        flagged: 9,
        reports: 6,
      });
      await service.sweep();

      expect(prisma.user).not.toHaveProperty('update');
      expect(
        notifications.notify.mock.calls.some((call) => /suspend|expuls|banne/i.test(String(call[3]))),
      ).toBe(false);
    });

    it('una cuenta nueva no recibe ni caso ni aviso', async () => {
      const { service, cases, notifications } = buildService({
        accountAgeDays: 4,
        interests: 60,
        conversationsStarted: 0,
        connections: 12,
        conversationsWithReplies: 0,
      });
      await service.sweep();

      expect(cases).toHaveLength(0);
      expect(notifications.notify).not.toHaveBeenCalled();
    });

    it('el mismo patrón no abre un caso nuevo cada noche', async () => {
      // Reabrirlo cada barrido enterraría la cola bajo la misma persona.
      const { service, prisma } = buildService({ reports: 4, openCase: true });
      await service.sweep();
      expect(prisma.moderationCase.create).not.toHaveBeenCalled();
    });

    it('el aviso privado no se repite dentro de 30 días', async () => {
      const { service, notifications } = buildService({
        interests: 40,
        conversationsStarted: 2,
        recentNudge: true,
      });
      await service.sweep();
      expect(notifications.notify).not.toHaveBeenCalled();
    });
  });

  describe('lo que sí pasa', () => {
    it('un patrón fuerte abre un caso con la evidencia en español', async () => {
      const { service, cases, audit } = buildService({ reports: 4 });
      await service.sweep();

      expect(cases).toHaveLength(1);
      const notes = cases[0].internalNotes as { signals: Array<{ explain: string }> };
      expect(notes.signals[0].explain).toContain('reportaron');
      expect(cases[0].subjectUserId).toBe('u1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'PURPOSE_CASE_OPENED' }),
      );
    });

    it('un patrón leve solo produce una conversación privada, sin acusar', async () => {
      const { service, cases, notifications } = buildService({
        interests: 40,
        conversationsStarted: 2,
      });
      await service.sweep();

      expect(cases).toHaveLength(0);
      expect(notifications.notify).toHaveBeenCalledTimes(1);
      const body = String(notifications.notify.mock.calls[0][3]);
      expect(body).toContain('No hay problema en tomarse su tiempo');
      expect(body).not.toMatch(/sanci|castig|advertencia final/i);
    });

    it('la insignia se otorga y se retira sola', async () => {
      const { service, profile } = buildService({ conversationsWithReplies: 5 });
      await service.sweep();
      expect(profile.purposeBadge).toBe(true);

      const retirada = buildService({
        badge: true,
        interests: 40,
        conversationsStarted: 2,
        conversationsWithReplies: 0,
        stageChanges: 0,
      });
      await retirada.service.sweep();
      expect(retirada.profile.purposeBadge).toBe(false);
    });
  });

  describe('lo que ve cada quien', () => {
    it('la persona ve si ganó la insignia, nunca su puntaje ni sus señales', async () => {
      // Un número visible se convierte en un juego y la gente aprende a
      // moverlo en vez de a comportarse.
      const { service } = buildService({ interests: 40, conversationsStarted: 2 });
      const mine = await service.mine('u1');

      expect(Object.keys(mine).sort()).toEqual([
        'badge',
        'bondsAdvanced',
        'conversationsWithReplies',
      ]);
      expect(mine).not.toHaveProperty('score');
      expect(mine).not.toHaveProperty('signals');
      expect(mine).not.toHaveProperty('band');
    });

    it('moderación sí ve el puntaje, la banda y cada explicación', async () => {
      const { service } = buildService({ reports: 4 });
      const assessment = await service.assess('u1');

      expect(assessment.band).toBe('review');
      expect(assessment.score).toBeLessThan(100);
      expect(assessment.signals[0].explain).toBeTruthy();
    });
  });

  it('un vínculo que avanzó y luego terminó sigue contando', async () => {
    // Se lee el historial y no la etapa actual: borrarlo castigaría a quien lo
    // intentó de verdad y no funcionó.
    const { service, prisma } = buildService({ stageChanges: 2 });
    const activity = await service.activityOf('u1');

    expect(activity.bondsAdvanced).toBe(2);
    expect(prisma.relationshipStageChange.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ distinct: ['matchId'] }),
    );
  });
});
