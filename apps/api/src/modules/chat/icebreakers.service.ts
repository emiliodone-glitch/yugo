import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

/**
 * RF-CON-04: three suggested questions generated from the OTHER person's
 * profile. Template-based (deterministic, free); optional AI generation can
 * be layered on via ICEBREAKER_AI_ENABLED without changing the contract.
 */
@Injectable()
export class IcebreakersService {
  constructor(private readonly prisma: PrismaService) {}

  async forConversation(conversationId: string, requesterId: string): Promise<string[]> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { match: true },
    });
    if (!conversation) return [];
    const otherId =
      conversation.match.userAId === requesterId
        ? conversation.match.userBId
        : conversation.match.userAId;

    const other = await this.prisma.profile.findUnique({
      where: { userId: otherId },
      include: {
        serviceAreas: { include: { serviceArea: true } },
        answers: true,
        church: true,
      },
    });
    if (!other) return [];
    return buildIcebreakers({
      practices: other.serviceAreas.map((sa) => sa.serviceArea.name),
      verse: other.verse,
      occupation: other.occupation,
      churchName: other.church?.name ?? other.churchFreeText,
      yearsInFaith: other.yearsInFaith,
      answers: other.answers.map((a) => ({ question: a.question, answer: a.answer })),
    });
  }
}

export interface IcebreakerProfileFacts {
  practices: string[];
  verse?: string | null;
  occupation?: string | null;
  churchName?: string | null;
  yearsInFaith?: number | null;
  answers: Array<{ question: string; answer: string }>;
}

/** Pure generator — unit-tested; picks the 3 most specific prompts. */
export function buildIcebreakers(facts: IcebreakerProfileFacts): string[] {
  const pool: string[] = [];

  const practiceTemplates: Record<string, string> = {
    Alabanza: 'Vi que sirves en alabanza, ¿cómo llegaste ahí?',
    Niños: 'Vi que sirves con niños, ¿cómo llegaste ahí?',
    Jóvenes: 'Vi que sirves con jóvenes, ¿qué es lo que más disfrutas de eso?',
    Misiones: '¿Cuál ha sido el viaje misionero que más te marcó?',
    'Servicio social': 'Vi que te mueve el servicio social, ¿en qué proyecto andas ahora?',
    'Estudio bíblico': '¿Qué libro de la Biblia estás estudiando en este tiempo?',
    'Medios y sonido': 'Vi que sirves en medios, ¿consola o cámara?',
    Intercesión: '¿Cómo empezaste en el ministerio de intercesión?',
    Oración: '¿Cómo es tu tiempo de oración ideal?',
  };
  for (const practice of facts.practices) {
    const template = practiceTemplates[practice];
    if (template) pool.push(template);
  }

  if (facts.verse) pool.push(`¿Qué es lo que más te habla de ${facts.verse.split(' ')[0]} en este tiempo?`);
  if (facts.answers.length > 0) {
    const a = facts.answers[0];
    pool.push(`Contaste que "${a.answer.slice(0, 60)}"… me gustaría saber más de eso.`);
  }
  if (facts.occupation) pool.push(`¿Qué es lo que más te gusta de tu trabajo como ${facts.occupation.toLowerCase()}?`);
  if (facts.churchName) pool.push(`¿Hace cuánto te congregas en ${facts.churchName}?`);
  if (facts.yearsInFaith && facts.yearsInFaith >= 5) {
    pool.push(`Llevas ${facts.yearsInFaith} años en la fe, ¿qué le dirías a quien va empezando?`);
  }

  // Generic fallbacks keep the list at 3 even for sparse profiles.
  pool.push('¿Qué es lo que más agradeces a Dios este año?');
  pool.push('¿Cuál es tu plan perfecto para un sábado libre?');
  pool.push('¿Qué canción no falta en tu playlist de adoración?');

  return [...new Set(pool)].slice(0, 3);
}
