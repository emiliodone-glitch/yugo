import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrayerService } from './prayer.service';

/**
 * Las reglas del muro que no pueden fallar: el anonimato es real (no viaja ni
 * el nombre ni la iglesia), nada se publica sin moderación, y solo quien
 * escribió una petición puede cerrarla.
 */

const ME = 'u-yo';
const OTHER = 'u-otra';

interface Row {
  id: string;
  userId: string;
  body: string;
  anonymous: boolean;
  churchId: string | null;
  moderationStatus: string;
  answeredAt: Date | null;
  answeredNote: string | null;
  createdAt: Date;
  user: { id: string; profile: { displayName: string } | null };
  church: { name: string } | null;
  intercessions: Array<{ userId: string }>;
}

function buildService(options: { rows?: Row[]; decision?: 'APPROVE' | 'HOLD' | 'REJECT' } = {}) {
  const rows = options.rows ?? [];
  const created: Array<Record<string, unknown>> = [];
  const cases: Array<Record<string, unknown>> = [];
  const notifications: Array<{ userId: string; title: string; body: string }> = [];

  const prisma = {
    prayerRequest: {
      findMany: async () => rows,
      findUnique: async ({ where }: { where: { id: string } }) =>
        rows.find((r) => r.id === where.id) ?? null,
      count: async () => 0,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return { id: 'new', ...data };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = rows.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      },
      delete: async () => ({}),
    },
    prayerIntercession: {
      findUnique: async () => null,
      create: async () => ({}),
      delete: async () => ({}),
      count: async () => 1,
    },
    profile: { findUnique: async () => ({ churchId: 'church-1' }) },
    churchUser: { findFirst: async () => null },
    moderationCase: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        cases.push(data);
        return data;
      },
    },
  };

  const moderation = {
    moderate: async () => ({ decision: options.decision ?? 'APPROVE', risk: 0.1, categories: [] }),
  };
  const notifier = {
    notify: async (userId: string, _c: string, title: string, body: string) => {
      notifications.push({ userId, title, body });
    },
  };

  const service = new PrayerService(
    prisma as never,
    moderation as never,
    notifier as never,
  );
  return { service, created, cases, notifications };
}

function row(over: Partial<Row> & { id: string }): Row {
  return {
    userId: OTHER,
    body: 'Por mi mamá.',
    anonymous: false,
    churchId: 'church-1',
    moderationStatus: 'APPROVED',
    answeredAt: null,
    answeredNote: null,
    createdAt: new Date('2026-08-30T10:00:00Z'),
    user: { id: OTHER, profile: { displayName: 'Ana' } },
    church: { name: 'Iglesia Central' },
    intercessions: [],
    ...over,
  };
}

describe('PrayerService — anonimato', () => {
  it('no envía el nombre ni el id de quien escribió una petición anónima', async () => {
    const { service } = buildService({
      rows: [row({ id: 'p1', anonymous: true, userId: OTHER })],
    });

    const [item] = await service.wall(ME);

    expect(item.authorName).toBeNull();
    expect(item.authorId).toBeNull();
    // La prueba de verdad: el nombre no está en ninguna parte del objeto
    // serializado, no solamente en el campo donde iría.
    expect(JSON.stringify(item)).not.toContain('Ana');
    expect(JSON.stringify(item)).not.toContain(OTHER);
  });

  it('tampoco envía la iglesia de una petición anónima', async () => {
    const { service } = buildService({
      rows: [row({ id: 'p1', anonymous: true, churchId: null })],
    });

    const [item] = await service.wall(ME);

    expect(item.churchName).toBeNull();
    expect(item.sameChurch).toBe(false);
    expect(JSON.stringify(item)).not.toContain('Iglesia Central');
  });

  it('quien la escribió sí la reconoce como suya', async () => {
    const { service } = buildService({
      rows: [row({ id: 'p1', anonymous: true, userId: ME, user: { id: ME, profile: { displayName: 'Yo' } } })],
    });

    const [item] = await service.wall(ME);

    expect(item.authorId).toBe(ME);
  });

  it('una petición anónima se guarda sin iglesia, no solo se oculta al leer', async () => {
    const { service, created } = buildService();

    await service.create(ME, 'Tengo una deuda que no he podido contarle a nadie.', true);

    expect(created[0].churchId).toBeNull();
    expect(created[0].anonymous).toBe(true);
  });

  it('una petición firmada sí guarda su iglesia', async () => {
    const { service, created } = buildService();

    await service.create(ME, 'Por mi congregación, que busca local.', false);

    expect(created[0].churchId).toBe('church-1');
  });
});

describe('PrayerService — moderación previa', () => {
  it('lo retenido no se publica y abre un caso', async () => {
    const { service, cases } = buildService({ decision: 'HOLD' });

    const result = await service.create(ME, 'Necesito 20 mil para la operación, escríbeme.', false);

    expect(result.published).toBe(false);
    expect(result.moderationStatus).toBe('HELD');
    expect(cases).toHaveLength(1);
  });

  it('una petición nunca se rechaza sola: «rechazar» queda retenida con prioridad alta', async () => {
    // La pantalla promete «se publica cuando alguien la apruebe». Un rechazo
    // automático dejaría esa promesa sin nadie detrás.
    const { service, created, cases } = buildService({ decision: 'REJECT' });

    const result = await service.create(ME, 'Deposita el dinero en esta cuenta y oro por ti.', false);

    expect(result.moderationStatus).toBe('HELD');
    expect(created[0].moderationStatus).toBe('HELD');
    expect(cases[0].priority).toBe('HIGH');
  });

  it('no se puede orar por una petición que no está aprobada', async () => {
    const { service } = buildService({ rows: [row({ id: 'p1', moderationStatus: 'HELD' })] });

    await expect(service.intercede(ME, 'p1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('un texto más largo del máximo se rechaza antes de moderarlo', async () => {
    const { service } = buildService();

    await expect(service.create(ME, 'a'.repeat(700), false)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('PrayerService — cerrar una petición', () => {
  it('solo quien la escribió puede marcarla contestada', async () => {
    const { service } = buildService({ rows: [row({ id: 'p1', userId: OTHER })] });

    await expect(service.markAnswered(ME, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('no se puede cerrar dos veces', async () => {
    const { service } = buildService({
      rows: [row({ id: 'p1', userId: ME, answeredAt: new Date('2026-08-20T00:00:00Z') })],
    });

    await expect(service.markAnswered(ME, 'p1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('avisa a quienes oraron, y no a quien la escribió', async () => {
    const { service, notifications } = buildService({
      rows: [
        row({
          id: 'p1',
          userId: ME,
          intercessions: [{ userId: OTHER }, { userId: ME }, { userId: 'u-tercera' }],
        }),
      ],
    });

    await service.markAnswered(ME, 'p1', 'Salió el trabajo. Gracias.');

    expect(notifications.map((n) => n.userId).sort()).toEqual([OTHER, 'u-tercera']);
  });

  it('un testimonio retenido no se publica, y quien lo escribió se entera', async () => {
    const { service } = buildService({
      rows: [row({ id: 'p1', userId: ME })],
      decision: 'HOLD',
    });

    const result = await service.markAnswered(ME, 'p1', 'Manden dinero a esta cuenta.');

    expect(result.answeredNote).toBeNull();
    expect(result.noteHeld).toBe(true);
    // La petición sí queda cerrada: el testimonio es lo que espera revisión.
    expect(result.answeredAt).not.toBeNull();
  });

  it('nadie más puede borrar una petición ajena', async () => {
    const { service } = buildService({ rows: [row({ id: 'p1', userId: OTHER })] });

    await expect(service.remove(ME, 'p1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('PrayerService — a quién se avisa al orar', () => {
  it('el aviso nunca dice quién está orando', async () => {
    const { service, notifications } = buildService({ rows: [row({ id: 'p1', userId: OTHER })] });

    await service.intercede(ME, 'p1');

    expect(notifications).toHaveLength(1);
    expect(notifications[0].userId).toBe(OTHER);
    expect(notifications[0].body).not.toContain(ME);
  });

  it('orar por la propia no se notifica a uno mismo', async () => {
    const { service, notifications } = buildService({ rows: [row({ id: 'p1', userId: ME })] });

    await service.intercede(ME, 'p1');

    expect(notifications).toHaveLength(0);
  });
});
