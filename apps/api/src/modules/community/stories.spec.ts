import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StoriesService } from './stories.service';

/**
 * The rules that keep a story worth reading: only a couple who declared they
 * married can tell one, both of them have to agree, and a person reads it
 * before anyone else does.
 */

const A = 'u-a';
const B = 'u-b';

const draft = {
  names: 'Rebeca y Josué',
  churchNames: 'Iglesia Bíblica Emanuel',
  marriedAt: new Date('2026-02-14'),
  body: 'a'.repeat(120),
};

function buildService(options: { stage?: string; story?: Record<string, unknown> | null } = {}) {
  const stories: Array<Record<string, unknown>> = options.story
    ? [
        {
          id: 'st1',
          matchId: 'm1',
          status: 'DRAFT',
          consentAId: true,
          consentBId: false,
          names: draft.names,
          churchNames: draft.churchNames,
          body: draft.body,
          marriedAt: draft.marriedAt,
          reviewNote: null,
          ...options.story,
        },
      ]
    : [];

  const match = {
    id: 'm1',
    userAId: A,
    userBId: B,
    stage: options.stage ?? 'MARRIED',
    userA: { profile: { church: { name: 'Emanuel' } } },
    userB: { profile: { church: { name: 'Monte de Sion' } } },
    get story() {
      return stories[0] ?? null;
    },
  };

  const prisma = {
    match: { findUnique: jest.fn(async () => match) },
    story: {
      findMany: jest.fn(async () => stories),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        stories.find((row) => row.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: 'st-new', status: 'DRAFT', ...data };
        stories.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = stories.find((r) => r.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      delete: jest.fn(async ({ where }: { where: { id: string } }) => {
        const index = stories.findIndex((r) => r.id === where.id);
        return stories.splice(index, 1)[0];
      }),
    },
  };

  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const audit = { log: jest.fn(async (..._args: unknown[]) => undefined) };

  const service = new StoriesService(prisma as never, notifications as never, audit as never);
  return { service, stories, prisma, notifications, audit };
}

describe('StoriesService', () => {
  it('solo una pareja que declaró el matrimonio puede contar su historia', async () => {
    // Si bastara con estar comprometidos, las historias dejarían de significar
    // lo que dicen significar.
    const { service } = buildService({ stage: 'ENGAGED' });
    await expect(service.submit('m1', A, draft)).rejects.toThrow(BadRequestException);

    const view = await service.forCouple('m1', A);
    expect(view.canSubmit).toBe(false);
    expect(view.whyNot).toBe('not_married_yet');
  });

  it('escribirla registra el consentimiento de quien escribe, no el del otro', async () => {
    const { service, stories, notifications } = buildService();
    await service.submit('m1', A, draft);

    expect(stories[0].status).toBe('DRAFT');
    expect(stories[0].consentAId).toBe(true);
    expect(stories[0].consentBId).toBe(false);
    // Solo se avisa a la otra persona; nadie necesita un aviso de su propio acto.
    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify.mock.calls[0][0]).toBe(B);
  });

  it('sin iglesia no hay historia', async () => {
    // Una historia que nadie puede comprobar es publicidad.
    const { service, prisma } = buildService();
    prisma.match.findUnique = jest.fn(async () => ({
      id: 'm1',
      userAId: A,
      userBId: B,
      stage: 'MARRIED',
      userA: { profile: { church: null } },
      userB: { profile: { church: null } },
      story: null,
    })) as never;
    await expect(service.submit('m1', A, { ...draft, churchNames: '' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('sin la iglesia escrita, toma las de los dos perfiles', async () => {
    const { service, stories } = buildService();
    await service.submit('m1', A, { ...draft, churchNames: '' });
    expect(stories[0].churchNames).toBe('Emanuel y Monte de Sion');
  });

  it('solo llega a revisión cuando los dos dijeron que sí', async () => {
    const { service, stories } = buildService({ story: {} });
    const result = await service.consent('m1', B, true);

    expect(result).toEqual({ status: 'IN_REVIEW' });
    expect(stories[0].status).toBe('IN_REVIEW');
  });

  it('decir que no la borra en vez de dejarla esperando', async () => {
    // Una historia que uno de los dos no quiere contar no debería quedarse en
    // una cola a ver si cambia de opinión.
    const { service, stories } = buildService({ story: {} });
    const result = await service.consent('m1', B, false);

    expect(result).toEqual({ deleted: true });
    expect(stories).toHaveLength(0);
  });

  it('publicar exige el consentimiento de los dos, comprobado otra vez', async () => {
    const { service } = buildService({
      story: { status: 'IN_REVIEW', consentAId: true, consentBId: false },
    });
    await expect(service.decide('st1', 'u-mod', true)).rejects.toThrow(ForbiddenException);
  });

  it('aprobar publica, deja rastro y avisa a la pareja', async () => {
    const { service, stories, audit, notifications } = buildService({
      story: { status: 'IN_REVIEW', consentAId: true, consentBId: true },
    });
    const result = await service.decide('st1', 'u-mod', true);

    expect(result.status).toBe('PUBLISHED');
    expect(stories[0].publishedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'STORY_PUBLISHED', targetId: 'st1' }),
    );
    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });

  it('rechazar no publica y devuelve el motivo a la pareja', async () => {
    const { service, stories, notifications } = buildService({
      story: { status: 'IN_REVIEW', consentAId: true, consentBId: true },
    });
    const result = await service.decide('st1', 'u-mod', false, 'Falta confirmar la iglesia.');

    expect(result.status).toBe('REJECTED');
    expect(stories[0].publishedAt).toBeNull();
    expect(notifications.notify.mock.calls[0][3]).toBe('Falta confirmar la iglesia.');
  });

  it('una historia ya decidida no se vuelve a decidir', async () => {
    const { service } = buildService({
      story: { status: 'PUBLISHED', consentAId: true, consentBId: true },
    });
    await expect(service.decide('st1', 'u-mod', false)).rejects.toThrow(BadRequestException);
  });

  it('un extraño no puede ver ni escribir la historia de otros', async () => {
    const { service } = buildService();
    await expect(service.forCouple('m1', 'u-stranger')).rejects.toThrow(NotFoundException);
    await expect(service.submit('m1', 'u-stranger', draft)).rejects.toThrow(NotFoundException);
  });

  it('no se escriben dos historias para el mismo vínculo', async () => {
    const { service } = buildService({ story: {} });
    await expect(service.submit('m1', A, draft)).rejects.toThrow(BadRequestException);
  });
});
