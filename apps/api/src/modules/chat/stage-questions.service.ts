import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  canReveal,
  questionsFor,
  STAGE_QUESTIONS,
  type RelationshipStage,
} from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * Conversaciones que importan.
 *
 * Las parejas que se rompen después de casadas rara vez se rompen por algo que
 * nadie podía saber. Se rompen por dinero, por familia política, por hijos, por
 * cómo se pelea. Este servicio saca esas conversaciones a tiempo, que es la
 * única ventaja real de una app cuyo propósito declarado es el matrimonio.
 *
 * La invariante que hace que sirva: **una respuesta no se devuelve nunca
 * mientras falte la propia.** Si el segundo ve la del primero, contesta a esa
 * respuesta y no a la pregunta. Eso no se resuelve escondiéndola en la
 * pantalla — se resuelve no enviándola, que es lo que hace `present()`.
 */
@Injectable()
export class StageQuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async loadMatch(matchId: string, userId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('match_not_found');
    if (match.userAId !== userId && match.userBId !== userId) {
      throw new NotFoundException('match_not_found');
    }
    if (match.status !== 'ACTIVE') throw new BadRequestException('connection_ended');
    return match;
  }

  /**
   * Las preguntas abiertas para esta pareja, con lo que cada quien contestó.
   *
   * La respuesta ajena viaja solo cuando existen las dos. Mientras falte una,
   * el campo llega en null: no es un `hidden` de CSS, es que el dato no sale
   * del servidor.
   */
  async forCouple(matchId: string, userId: string) {
    const match = await this.loadMatch(matchId, userId);
    const otherId = match.userAId === userId ? match.userBId : match.userAId;

    const open = questionsFor(match.stage as RelationshipStage);
    const answers = await this.prisma.stageQuestionAnswer.findMany({
      where: { matchId, questionId: { in: open.map((question) => question.id) } },
    });

    const items = open.map((question) => {
      const mine = answers.find((a) => a.questionId === question.id && a.userId === userId);
      const theirs = answers.find((a) => a.questionId === question.id && a.userId === otherId);
      const revealed = canReveal(mine?.answer ?? null, theirs?.answer ?? null);
      return {
        id: question.id,
        topic: question.topic,
        text: question.text,
        why: question.why,
        myAnswer: mine?.answer ?? null,
        // Aquí está la regla, y es una decisión del servidor.
        theirAnswer: revealed ? (theirs?.answer ?? null) : null,
        theyAnswered: !!theirs,
        revealed,
      };
    });

    return {
      stage: match.stage,
      items,
      answered: items.filter((item) => item.revealed).length,
      total: items.length,
      /** Cuántas se abrirían al avanzar, para que avanzar signifique algo. */
      lockedAhead: STAGE_QUESTIONS.length - open.length,
    };
  }

  /**
   * Contestar. Se puede corregir la propia mientras la otra no exista: una vez
   * reveladas, cambiar la respuesta a la vista de la ajena sería justo lo que
   * el diseño evita.
   */
  async answer(matchId: string, userId: string, questionId: string, answer: string) {
    const match = await this.loadMatch(matchId, userId);
    const question = STAGE_QUESTIONS.find((q) => q.id === questionId);
    if (!question) throw new NotFoundException('question_not_found');

    const open = questionsFor(match.stage as RelationshipStage);
    if (!open.some((q) => q.id === questionId)) {
      throw new BadRequestException('question_locked_for_stage');
    }

    const otherId = match.userAId === userId ? match.userBId : match.userAId;
    const theirs = await this.prisma.stageQuestionAnswer.findUnique({
      where: { matchId_userId_questionId: { matchId, userId: otherId, questionId } },
    });
    const mine = await this.prisma.stageQuestionAnswer.findUnique({
      where: { matchId_userId_questionId: { matchId, userId, questionId } },
    });
    if (mine && theirs) throw new BadRequestException('already_revealed');

    await this.prisma.stageQuestionAnswer.upsert({
      where: { matchId_userId_questionId: { matchId, userId, questionId } },
      update: { answer },
      create: { matchId, userId, questionId, answer },
    });

    if (theirs) {
      // Se revelaron las dos: es el momento que vale la pena avisar.
      await Promise.all([
        this.notifications.notify(
          userId,
          'RELATIONSHIP',
          'Ya pueden verse las dos respuestas',
          `Contestaron «${question.text}».`,
          { matchId },
        ),
        this.notifications.notify(
          otherId,
          'RELATIONSHIP',
          'Ya pueden verse las dos respuestas',
          `Contestaron «${question.text}».`,
          { matchId },
        ),
      ]);
      return { revealed: true, theirAnswer: theirs.answer };
    }

    await this.notifications.notify(
      otherId,
      'RELATIONSHIP',
      'Te dejaron una conversación pendiente',
      `Contestaron «${question.text}». Cuando contestes tú, se ven las dos.`,
      { matchId },
    );
    return { revealed: false, theirAnswer: null };
  }
}
