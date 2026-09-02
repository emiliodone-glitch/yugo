import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

/**
 * La cola de retenidos con el contenido delante.
 *
 * Lo que estas pruebas protegen: que un caso retenido siempre trae el texto
 * que hay que juzgar (una cola sin contenido no se puede resolver), que
 * aprobar publica y rechazar retira para cada tipo, y que la persona se entera
 * en los dos casos — «se publicó» importa tanto como «no se publicó».
 */

const ACTOR = 'u-moderador';

interface CaseRow {
  id: string;
  kind: string;
  status: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  createdAt: Date;
  subjectUserId: string | null;
  assigneeId: string | null;
  messageId: string | null;
  postId: string | null;
  photoId: string | null;
  prayerRequestId: string | null;
  prayerAnsweredNoteId: string | null;
  reflectionDevotionalId: string | null;
  reflectionUserId: string | null;
}

function caseRow(over: Partial<CaseRow> & { id: string }): CaseRow {
  return {
    kind: 'AI_HELD',
    status: 'OPEN',
    priority: 'NORMAL',
    createdAt: new Date('2026-08-31T10:00:00Z'),
    subjectUserId: 'u-ana',
    assigneeId: null,
    messageId: null,
    postId: null,
    photoId: null,
    prayerRequestId: null,
    prayerAnsweredNoteId: null,
    reflectionDevotionalId: null,
    reflectionUserId: null,
    ...over,
  };
}

function buildService(options: {
  cases?: CaseRow[];
  prayers?: Array<Record<string, unknown>>;
  reads?: Array<Record<string, unknown>>;
  messages?: Array<Record<string, unknown>>;
}) {
  const cases = options.cases ?? [];
  const prayers = options.prayers ?? [];
  const reads = options.reads ?? [];
  const messages = options.messages ?? [];
  const notifications: Array<{ userId: string; title: string }> = [];
  const audits: string[] = [];

  const prisma = {
    moderationCase: {
      findMany: async () => cases,
      findUnique: async ({ where }: { where: { id: string } }) =>
        cases.find((c) => c.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const c = cases.find((x) => x.id === where.id)!;
        Object.assign(c, data);
        return c;
      },
    },
    profile: { findUnique: async () => ({ displayName: 'Ana' }) },
    prayerRequest: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        prayers.find((p) => p.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const p = prayers.find((x) => x.id === where.id)!;
        Object.assign(p, data);
        return p;
      },
    },
    devotionalRead: {
      findUnique: async ({
        where,
      }: {
        where: { devotionalId_userId: { devotionalId: string; userId: string } };
      }) =>
        reads.find(
          (r) =>
            r.devotionalId === where.devotionalId_userId.devotionalId &&
            r.userId === where.devotionalId_userId.userId,
        ) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { devotionalId_userId: { devotionalId: string; userId: string } };
        data: Record<string, unknown>;
      }) => {
        const r = reads.find(
          (x) =>
            x.devotionalId === where.devotionalId_userId.devotionalId &&
            x.userId === where.devotionalId_userId.userId,
        )!;
        Object.assign(r, data);
        return r;
      },
    },
    message: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        messages.find((m) => m.id === where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const m = messages.find((x) => x.id === where.id)!;
        Object.assign(m, data);
        return m;
      },
    },
    post: { findUnique: async () => null },
    photo: { findUnique: async () => null },
  };
  const audit = { log: async ({ action }: { action: string }) => { audits.push(action); } };
  const notifier = {
    notify: async (userId: string, _c: string, title: string) => {
      notifications.push({ userId, title });
    },
  };

  const storage = { signDownload: async (key: string) => `https://firmada/${key}` };
  const service = new AdminService(
    prisma as never,
    audit as never,
    {} as never,
    notifier as never,
    storage as never,
  );
  return { service, notifications, audits, prayers, reads, cases };
}

describe('heldContent — la cola trae el contenido', () => {
  it('una petición retenida llega con su texto y dice si es anónima', async () => {
    const { service } = buildService({
      cases: [caseRow({ id: 'c1', prayerRequestId: 'p1' })],
      prayers: [
        { id: 'p1', userId: 'u-ana', body: 'Por mi deuda.', anonymous: true, moderationStatus: 'HELD' },
      ],
    });

    const [item] = await service.heldContent();

    expect(item.kind).toBe('prayer');
    expect(item.text).toBe('Por mi deuda.');
    expect(item.context).toContain('anónima');
    // Quien modera sí sabe quién es: es personal del equipo y lo necesita.
    expect(item.authorId).toBe('u-ana');
  });

  it('una reflexión retenida llega con el título del devocional', async () => {
    const { service } = buildService({
      cases: [caseRow({ id: 'c1', reflectionDevotionalId: 'd1', reflectionUserId: 'u-ana' })],
      reads: [
        {
          devotionalId: 'd1',
          userId: 'u-ana',
          reflection: 'Me pegó.',
          reflectionStatus: 'HELD',
          devotional: { title: 'Guarda tu corazón' },
        },
      ],
    });

    const [item] = await service.heldContent();

    expect(item.kind).toBe('reflection');
    expect(item.text).toBe('Me pegó.');
    expect(item.context).toContain('Guarda tu corazón');
  });

  it('un caso cuyo contenido ya no está retenido no aparece', async () => {
    // Se resolvió por otra vía (por ejemplo, la persona borró la petición).
    const { service } = buildService({
      cases: [caseRow({ id: 'c1', prayerRequestId: 'p1' })],
      prayers: [{ id: 'p1', userId: 'u-ana', body: 'x', anonymous: false, moderationStatus: 'APPROVED' }],
    });

    expect(await service.heldContent()).toEqual([]);
  });

  it('un caso sin contenido enlazado no aparece, en vez de romper la cola', async () => {
    // El defecto original: casos creados solo con subjectUserId.
    const { service } = buildService({ cases: [caseRow({ id: 'c1' })] });

    expect(await service.heldContent()).toEqual([]);
  });
});

describe('resolveHeldContent — aprobar publica, rechazar retira', () => {
  it('aprobar una petición la publica en el muro y avisa a quien la escribió', async () => {
    const { service, prayers, notifications, cases } = buildService({
      cases: [caseRow({ id: 'c1', prayerRequestId: 'p1' })],
      prayers: [{ id: 'p1', userId: 'u-ana', body: 'x', anonymous: true, moderationStatus: 'HELD' }],
    });

    const result = await service.resolveHeldContent(ACTOR, 'c1', true);

    expect(result.approved).toBe(true);
    expect(prayers[0].moderationStatus).toBe('APPROVED');
    expect(cases[0].status).toBe('RESOLVED');
    expect(notifications).toEqual([{ userId: 'u-ana', title: 'Tu petición de oración ya está publicada' }]);
  });

  it('rechazarla la retira y también avisa', async () => {
    const { service, prayers, notifications } = buildService({
      cases: [caseRow({ id: 'c1', prayerRequestId: 'p1' })],
      prayers: [{ id: 'p1', userId: 'u-ana', body: 'x', anonymous: false, moderationStatus: 'HELD' }],
    });

    await service.resolveHeldContent(ACTOR, 'c1', false);

    expect(prayers[0].moderationStatus).toBe('REJECTED');
    expect(notifications[0].title).toBe('Tu petición de oración no se publicó');
  });

  it('el testimonio se aprueba sin tocar el estado de la petición', async () => {
    const { service, prayers } = buildService({
      cases: [caseRow({ id: 'c1', prayerAnsweredNoteId: 'p1' })],
      prayers: [
        {
          id: 'p1',
          userId: 'u-ana',
          body: 'x',
          anonymous: false,
          moderationStatus: 'APPROVED',
          answeredNote: 'Salió.',
          answeredNoteStatus: 'HELD',
        },
      ],
    });

    await service.resolveHeldContent(ACTOR, 'c1', true);

    expect(prayers[0].answeredNoteStatus).toBe('APPROVED');
    expect(prayers[0].moderationStatus).toBe('APPROVED');
  });

  it('una reflexión aprobada pasa a verse en la congregación', async () => {
    const { service, reads } = buildService({
      cases: [caseRow({ id: 'c1', reflectionDevotionalId: 'd1', reflectionUserId: 'u-ana' })],
      reads: [{ devotionalId: 'd1', userId: 'u-ana', reflection: 'x', reflectionStatus: 'HELD' }],
    });

    await service.resolveHeldContent(ACTOR, 'c1', true);

    expect(reads[0].reflectionStatus).toBe('APPROVED');
  });

  it('queda en la bitácora', async () => {
    const { service, audits } = buildService({
      cases: [caseRow({ id: 'c1', prayerRequestId: 'p1' })],
      prayers: [{ id: 'p1', userId: 'u-ana', body: 'x', anonymous: false, moderationStatus: 'HELD' }],
    });

    await service.resolveHeldContent(ACTOR, 'c1', true);

    expect(audits).toContain('HELD_CONTENT_APPROVED');
  });

  it('un caso que no existe da 404 y uno que no es retenido da 400', async () => {
    const { service } = buildService({
      cases: [caseRow({ id: 'reporte', kind: 'REPORT', prayerRequestId: 'p1' })],
    });

    await expect(service.resolveHeldContent(ACTOR, 'nada', true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.resolveHeldContent(ACTOR, 'reporte', true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('un caso retenido sin contenido enlazado se rechaza en vez de cerrarse en falso', async () => {
    // Si se cerrara, el moderador creería que resolvió algo y el contenido
    // seguiría retenido para siempre: exactamente el defecto original.
    const { service } = buildService({ cases: [caseRow({ id: 'c1' })] });

    await expect(service.resolveHeldContent(ACTOR, 'c1', true)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
