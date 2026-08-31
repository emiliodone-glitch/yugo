import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeetingPlanService } from './meeting-plan.service';

/**
 * The two rules that make a safety plan trustworthy: it belongs to the person
 * who wrote it and nobody else, and Yugo never holds or contacts the trusted
 * person.
 */

const ME = 'u-me';
const THEM = 'u-them';
const IN_TWO_DAYS = new Date(Date.now() + 2 * 86_400_000);

function buildService(plans: Array<Record<string, unknown>> = []) {
  const match = { id: 'm1', userAId: ME, userBId: THEM, status: 'ACTIVE' };

  const prisma = {
    match: { findUnique: jest.fn(async () => match) },
    meetingPlan: {
      findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
        plans.find((p) => p.userId === where.userId) ?? null,
      ),
      findMany: jest.fn(async () => plans),
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        plans.find((p) => p.id === where.id) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = {
          id: 'plan-new',
          status: 'PLANNED',
          sharedAt: null,
          checkInAt: null,
          remindedAt: null,
          notes: null,
          trustedContactLabel: null,
          ...data,
        };
        plans.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = plans.find((p) => p.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
    },
  };

  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const service = new MeetingPlanService(prisma as never, notifications as never);
  return { service, plans, prisma, notifications };
}

const seededPlan = (over: Record<string, unknown> = {}) => ({
  id: 'plan1',
  matchId: 'm1',
  userId: ME,
  place: 'Café Mamá Chila',
  meetsAt: IN_TWO_DAYS,
  notes: null,
  trustedContactLabel: 'mi hermana Rosa',
  status: 'PLANNED',
  sharedAt: null,
  checkInAt: null,
  remindedAt: null,
  ...over,
});

describe('MeetingPlanService', () => {
  describe('el plan es de quien lo escribe', () => {
    it('la otra persona del vínculo no puede verlo', async () => {
      // Avisarle a tu hermana dónde vas no es algo que debas negociar con la
      // persona con quien vas a salir.
      const { service } = buildService([seededPlan()]);
      const theirs = await service.mine('m1', THEM);
      expect(theirs.plan).toBeNull();
    });

    it('ni marcarlo como enviado, ni cancelarlo', async () => {
      const { service } = buildService([seededPlan()]);
      await expect(service.markShared('plan1', THEM)).rejects.toThrow(NotFoundException);
      await expect(service.checkIn('plan1', THEM)).rejects.toThrow(NotFoundException);
      await expect(service.cancel('plan1', THEM)).rejects.toThrow(NotFoundException);
    });

    it('un extraño ni siquiera sabe que el vínculo existe', async () => {
      const { service } = buildService([seededPlan()]);
      await expect(service.mine('m1', 'u-stranger')).rejects.toThrow(NotFoundException);
    });
  });

  describe('el contacto de confianza', () => {
    it('se guarda solo cómo le dices, nunca su teléfono', async () => {
      // Guardar el número de alguien que nunca aceptó estar en Yugo sería
      // conservar datos personales de un tercero (Ley 172-13).
      const { service, plans } = buildService();
      await service.create('m1', ME, {
        place: 'Café Mamá Chila',
        meetsAt: IN_TWO_DAYS,
        trustedContactLabel: 'mi hermana Rosa',
      });
      const stored = JSON.stringify(plans[0]);
      expect(plans[0].trustedContactLabel).toBe('mi hermana Rosa');
      expect(stored).not.toMatch(/\+?\d{7,}/);
      expect(Object.keys(plans[0])).not.toContain('trustedContactPhone');
    });

    it('el mensaje lo escribe la app, para que lo mande la persona', async () => {
      const { service } = buildService();
      const plan = await service.create('m1', ME, {
        place: 'Café Mamá Chila',
        meetsAt: IN_TWO_DAYS,
        notes: 'Voy con mi carro',
      });
      expect(plan.shareText).toContain('Café Mamá Chila');
      expect(plan.shareText).toContain('Voy con mi carro');
      expect(plan.shareText).toContain('Te aviso cuando llegue a casa.');
    });

    it('marcar como enviado registra que ocurrió, no a quién', async () => {
      const { service, plans } = buildService([seededPlan()]);
      const result = await service.markShared('plan1', ME);

      expect(result.status).toBe('SHARED');
      expect(plans[0].sharedAt).toBeInstanceOf(Date);
    });
  });

  describe('el check-in de después', () => {
    it('un plan futuro todavía no lo pide', async () => {
      const { service } = buildService([seededPlan()]);
      const { plan } = await service.mine('m1', ME);
      expect(plan?.awaitingCheckIn).toBe(false);
    });

    it('pasadas unas horas, sí', async () => {
      const { service } = buildService([
        seededPlan({ meetsAt: new Date(Date.now() - 5 * 3600_000) }),
      ]);
      const { plan } = await service.mine('m1', ME);
      expect(plan?.awaitingCheckIn).toBe(true);
    });

    it('el recordatorio va a la persona y a nadie más', async () => {
      // No avisamos a terceros en su nombre: no tenemos a quién avisar ni
      // derecho a hacerlo.
      const { service, notifications, plans } = buildService([
        seededPlan({ meetsAt: new Date(Date.now() - 5 * 3600_000) }),
      ]);
      const result = await service.askForCheckIns();

      expect(result.reminded).toBe(1);
      expect(notifications.notify).toHaveBeenCalledTimes(1);
      expect(notifications.notify.mock.calls[0][0]).toBe(ME);
      expect(notifications.notify.mock.calls[0][3]).toContain('mi hermana Rosa');
      expect(plans[0].remindedAt).toBeInstanceOf(Date);
    });

    it('decir «todo bien» cierra el plan', async () => {
      const { service } = buildService([
        seededPlan({ meetsAt: new Date(Date.now() - 5 * 3600_000) }),
      ]);
      const result = await service.checkIn('plan1', ME);
      expect(result.status).toBe('CHECKED_IN');
      expect(result.awaitingCheckIn).toBe(false);
    });
  });

  it('no se planifica un encuentro en el pasado', async () => {
    const { service } = buildService();
    await expect(
      service.create('m1', ME, { place: 'Café', meetsAt: new Date(Date.now() - 3600_000) }),
    ).rejects.toThrow(BadRequestException);
  });

  it('volver a guardar actualiza el plan en vez de crear otro', async () => {
    const { service, plans } = buildService([seededPlan()]);
    await service.create('m1', ME, { place: 'Otro lugar', meetsAt: IN_TWO_DAYS });
    expect(plans).toHaveLength(1);
    expect(plans[0].place).toBe('Otro lugar');
  });
});
