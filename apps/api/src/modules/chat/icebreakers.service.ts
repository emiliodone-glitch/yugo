import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ContentService, type IcebreakerTemplates } from '../../common/content.service';

/**
 * RF-CON-04: three suggested questions generated from the OTHER person's
 * profile. Template-based (deterministic, free); optional AI generation can
 * be layered on via ICEBREAKER_AI_ENABLED without changing the contract.
 */
@Injectable()
export class IcebreakersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly content: ContentService,
  ) {}

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
    // Templates are administrable without a deploy (RF-ADM-10).
    const templates = await this.content.icebreakers();
    // El cruce real entre las dos personas, no solo el perfil ajeno.
    const viewer = await this.prisma.profile.findUnique({
      where: { userId: requesterId },
      include: { serviceAreas: { include: { serviceArea: true } } },
    });
    const viewerSlugs = new Set(viewer?.serviceAreas.map((sa) => sa.serviceArea.slug) ?? []);
    const sharedPractices = other.serviceAreas
      .filter((sa) => viewerSlugs.has(sa.serviceArea.slug))
      .map((sa) => sa.serviceArea.name);

    return buildIcebreakers(
      {
        practices: other.serviceAreas.map((sa) => sa.serviceArea.name),
        practiceSlugs: other.serviceAreas.map((sa) => sa.serviceArea.slug),
        verse: other.verse,
        occupation: other.occupation,
        churchName: other.church?.name ?? other.churchFreeText,
        yearsInFaith: other.yearsInFaith,
        answers: other.answers.map((a) => ({ question: a.question, answer: a.answer })),
      },
      templates,
      {
        practices: sharedPractices,
        sameChurch: !!viewer?.churchId && viewer.churchId === other.churchId,
        sameDenomination:
          !!viewer?.denominationId && viewer.denominationId === other.denominationId,
      },
    );
  }
}

export interface IcebreakerProfileFacts {
  practices: string[];
  /** Slugs let the administrable templates key on stable identifiers. */
  practiceSlugs?: string[];
  verse?: string | null;
  occupation?: string | null;
  churchName?: string | null;
  yearsInFaith?: number | null;
  answers: Array<{ question: string; answer: string }>;
}

/** What the two people actually have in common. */
export interface SharedGround {
  /** Practice names both serve in. */
  practices?: string[];
  sameChurch?: boolean;
  sameDenomination?: boolean;
}

const DEFAULT_TEMPLATES: IcebreakerTemplates = {
  byPractice: {
    alabanza: 'Vi que sirves en alabanza, ¿cómo llegaste ahí?',
    ninos: 'Vi que sirves con niños, ¿cómo llegaste ahí?',
    jovenes: 'Vi que sirves con jóvenes, ¿qué es lo que más disfrutas de eso?',
    misiones: '¿Cuál ha sido el viaje misionero que más te marcó?',
    'servicio-social': 'Vi que te mueve el servicio social, ¿en qué proyecto andas ahora?',
    'estudio-biblico': '¿Qué libro de la Biblia estás estudiando en este tiempo?',
    medios: 'Vi que sirves en medios, ¿consola o cámara?',
    intercesion: '¿Cómo empezaste en el ministerio de intercesión?',
    oracion: '¿Cómo es tu tiempo de oración ideal?',
  },
  generic: [
    '¿Qué es lo que más agradeces a Dios este año?',
    '¿Cuál es tu plan perfecto para un sábado libre?',
    '¿Qué canción no falta en tu playlist de adoración?',
  ],
};

/**
 * Pure generator — unit-tested; picks the 3 most specific prompts.
 *
 * Shared ground comes first. A question about something *both* people do
 * ("los dos sirven en alabanza") opens a conversation between equals, while
 * one drawn only from the other person's profile reads like an interview. The
 * prompts from their profile follow, and the generic ones are the floor.
 */
export function buildIcebreakers(
  facts: IcebreakerProfileFacts,
  templates: IcebreakerTemplates = DEFAULT_TEMPLATES,
  shared: SharedGround = {},
): string[] {
  const pool: string[] = [];

  const sharedPractices = (shared.practices ?? []).filter(Boolean);
  if (sharedPractices.length > 0) {
    pool.push(`Los dos sirven en ${sharedPractices[0].toLowerCase()}, ¿cómo llegaste tú?`);
  }
  if (shared.sameChurch && facts.churchName) {
    pool.push(
      `Nos congregamos en ${facts.churchName} y no nos habíamos cruzado, ¿a qué servicio vas?`,
    );
  } else if (shared.sameDenomination && sharedPractices.length === 0) {
    pool.push('¿Qué es lo que más valoras de la iglesia en la que creciste?');
  }

  for (const slug of facts.practiceSlugs ?? []) {
    const template = templates.byPractice[slug];
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
  pool.push(...templates.generic);

  return [...new Set(pool)].slice(0, 3);
}
