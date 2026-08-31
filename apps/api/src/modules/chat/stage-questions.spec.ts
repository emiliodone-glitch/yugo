import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StageQuestionsService } from './stage-questions.service';

/**
 * La invariante del módulo: una respuesta no sale del servidor mientras falte
 * la otra. No es un `hidden` en la pantalla — es que el dato no viaja.
 */

const ME = 'u-me';
const THEM = 'u-them';

function buildService(options: { stage?: string; answers?: Array<Record<string, unknown>> } = {}) {
  const answers = options.answers ?? [];
  const match = { id: 'm1', userAId: ME, userBId: THEM, status: 'ACTIVE', stage: options.stage ?? 'COURTSHIP' };

  const prisma = {
    match: { findUnique: jest.fn(async () => match) },
    stageQuestionAnswer: {
      findMany: jest.fn(async () => answers),
      findUnique: jest.fn(async ({ where }: { where: { matchId_userId_questionId: { userId: string; questionId: string } } }) => {
        const { userId, questionId } = where.matchId_userId_questionId;
        return answers.find((a) => a.userId === userId && a.questionId === questionId) ?? null;
      }),
      upsert: jest.fn(async ({ where, create, update }: never) => {
        const w = (where as { matchId_userId_questionId: { userId: string; questionId: string } })
          .matchId_userId_questionId;
        const existing = answers.find((a) => a.userId === w.userId && a.questionId === w.questionId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        answers.push(create as Record<string, unknown>);
        return create;
      }),
    },
  };

  const notifications = { notify: jest.fn(async (..._args: unknown[]) => undefined) };
  const service = new StageQuestionsService(prisma as never, notifications as never);
  return { service, answers, notifications };
}

const answerOf = (userId: string, questionId: string, answer: string) => ({
  userId,
  questionId,
  answer,
});

describe('StageQuestionsService', () => {
  describe('la respuesta ajena no viaja hasta que existen las dos', () => {
    it('si contesté yo sola, la suya llega en null', async () => {
      const { service } = buildService({
        answers: [answerOf(ME, 'dinero-manejo', 'Presupuesto mensual')],
      });
      const view = await service.forCouple('m1', ME);
      const item = view.items.find((i) => i.id === 'dinero-manejo')!;

      expect(item.myAnswer).toBe('Presupuesto mensual');
      expect(item.theirAnswer).toBeNull();
      expect(item.revealed).toBe(false);
    });

    it('si contestó solo la otra persona, la suya tampoco viaja', async () => {
      // Este es el caso que importa: ver la ajena antes de contestar
      // convertiría la pregunta en un examen.
      const { service } = buildService({
        answers: [answerOf(THEM, 'dinero-manejo', 'Nunca he presupuestado')],
      });
      const view = await service.forCouple('m1', ME);
      const item = view.items.find((i) => i.id === 'dinero-manejo')!;

      expect(item.myAnswer).toBeNull();
      expect(item.theirAnswer).toBeNull();
      // Sí se sabe que contestó — eso invita a contestar sin filtrar nada.
      expect(item.theyAnswered).toBe(true);
      expect(JSON.stringify(view)).not.toContain('Nunca he presupuestado');
    });

    it('con las dos, se revelan', async () => {
      const { service } = buildService({
        answers: [
          answerOf(ME, 'dinero-manejo', 'Presupuesto mensual'),
          answerOf(THEM, 'dinero-manejo', 'Nunca he presupuestado'),
        ],
      });
      const item = (await service.forCouple('m1', ME)).items.find((i) => i.id === 'dinero-manejo')!;

      expect(item.revealed).toBe(true);
      expect(item.theirAnswer).toBe('Nunca he presupuestado');
    });

    it('contestar segundo devuelve la ajena en el acto', async () => {
      const { service, notifications } = buildService({
        answers: [answerOf(THEM, 'hijos-quiero', 'Dos, en unos años')],
      });
      const result = await service.answer('m1', ME, 'hijos-quiero', 'Tres, pronto');

      expect(result.revealed).toBe(true);
      expect(result.theirAnswer).toBe('Dos, en unos años');
      // Se avisa a los dos: es el momento que vale la pena avisar.
      expect(notifications.notify).toHaveBeenCalledTimes(2);
    });

    it('no se puede cambiar la propia una vez reveladas', async () => {
      // Corregir a la vista de la ajena es justo lo que el diseño evita.
      const { service } = buildService({
        answers: [
          answerOf(ME, 'hijos-quiero', 'Tres'),
          answerOf(THEM, 'hijos-quiero', 'Ninguno'),
        ],
      });
      await expect(service.answer('m1', ME, 'hijos-quiero', 'Ninguno también')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sí se puede corregir mientras la otra no exista', async () => {
      const { service, answers } = buildService({
        answers: [answerOf(ME, 'hijos-quiero', 'Tres')],
      });
      await service.answer('m1', ME, 'hijos-quiero', 'Dos, mejor dicho');
      expect(answers[0].answer).toBe('Dos, mejor dicho');
    });
  });

  describe('se abren por etapa', () => {
    it('en «conociéndonos» no hay ninguna', async () => {
      const { service } = buildService({ stage: 'KNOWING' });
      const view = await service.forCouple('m1', ME);

      expect(view.items).toHaveLength(0);
      // Y se dice cuántas se abrirían, para que avanzar signifique algo.
      expect(view.lockedAhead).toBeGreaterThan(0);
    });

    it('no se puede contestar una pregunta que la etapa no abrió', async () => {
      const { service } = buildService({ stage: 'INTENTIONAL_FRIENDSHIP' });
      await expect(service.answer('m1', ME, 'hijos-quiero', 'Dos')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('en noviazgo ya están las de dinero e hijos', async () => {
      const { service } = buildService({ stage: 'COURTSHIP' });
      const ids = (await service.forCouple('m1', ME)).items.map((i) => i.id);

      expect(ids).toContain('dinero-manejo');
      expect(ids).toContain('hijos-quiero');
    });
  });

  describe('quién puede', () => {
    it('un extraño no ve ni contesta nada', async () => {
      const { service } = buildService();
      await expect(service.forCouple('m1', 'u-stranger')).rejects.toThrow(NotFoundException);
      await expect(service.answer('m1', 'u-stranger', 'dinero-manejo', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('una pregunta inventada no existe', async () => {
      const { service } = buildService();
      await expect(service.answer('m1', ME, 'pregunta-falsa', 'x')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('avisa a la otra persona que hay algo pendiente, sin filtrar la respuesta', async () => {
    const { service, notifications } = buildService();
    await service.answer('m1', ME, 'dinero-manejo', 'Llevo un presupuesto muy detallado');

    expect(notifications.notify).toHaveBeenCalledTimes(1);
    const [to, , , body] = notifications.notify.mock.calls[0];
    expect(to).toBe(THEM);
    expect(String(body)).not.toContain('presupuesto muy detallado');
    expect(String(body)).toContain('se ven las dos');
  });
});
