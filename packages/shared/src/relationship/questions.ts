/**
 * Conversaciones que importan.
 *
 * Las parejas que se rompen después de casadas rara vez se rompen por algo que
 * nadie podía saber: se rompen por dinero, por familia política, por hijos, por
 * cómo se pelea, por qué se hace un domingo. Son conversaciones que casi nadie
 * tiene a tiempo porque son incómodas de sacar — y una app cuyo propósito
 * declarado es el matrimonio tiene una razón para sacarlas que ninguna otra
 * tiene.
 *
 * Dos decisiones que hacen que esto funcione y no sea un cuestionario más:
 *
 * 1. **Se abren por etapa.** Preguntar por hijos en el primer mensaje espanta;
 *    preguntarlo antes del compromiso llega tarde. Cada bloque se desbloquea
 *    cuando la pareja declaró la etapa que lo justifica.
 *
 * 2. **Las respuestas se revelan a la vez.** Si el segundo ve la respuesta del
 *    primero, contesta a esa respuesta y no a la pregunta. Revelar en simultáneo
 *    es la diferencia entre saber qué piensa la otra persona y saber qué piensa
 *    que quieres oír.
 *
 * No hay puntaje, ni compatibilidad calculada, ni «les falta un 20%». Dos
 * personas que no coinciden aquí no están mal emparejadas: están informadas.
 */
import { RELATIONSHIP_STAGES, STAGE_ORDER, type RelationshipStage } from './stages';

export type QuestionTopic =
  | 'fe'
  | 'familia'
  | 'dinero'
  | 'hijos'
  | 'conflicto'
  | 'vida'
  | 'pasado';

export interface StageQuestion {
  id: string;
  /** La etapa a partir de la cual tiene sentido preguntarlo. */
  unlocksAt: RelationshipStage;
  topic: QuestionTopic;
  text: string;
  /** Por qué está en la lista. Se muestra: nadie contesta bien a ciegas. */
  why: string;
}

export const TOPIC_LABELS: Record<QuestionTopic, string> = {
  fe: 'Fe',
  familia: 'Familia',
  dinero: 'Dinero',
  hijos: 'Hijos',
  conflicto: 'Conflicto',
  vida: 'Vida diaria',
  pasado: 'Historia',
};

/**
 * El banco de preguntas.
 *
 * Deliberadamente pocas y concretas. Una lista de cien preguntas se abandona
 * en la tercera; doce que de verdad importan se contestan.
 */
export const STAGE_QUESTIONS: StageQuestion[] = [
  // --- Amistad intencional: quién eres cuando nadie mira -------------------
  {
    id: 'fe-practica',
    unlocksAt: 'INTENTIONAL_FRIENDSHIP',
    topic: 'fe',
    text: '¿Cómo se ve tu fe un martes cualquiera, cuando no hay servicio ni nadie mirando?',
    why: 'La fe compartida se nota más en la semana que en el domingo.',
  },
  {
    id: 'vida-domingo',
    unlocksAt: 'INTENTIONAL_FRIENDSHIP',
    topic: 'vida',
    text: '¿Cómo sería tu domingo ideal si pudieras diseñarlo entero?',
    why: 'La vida diaria de un matrimonio se parece más a un domingo repetido que a una boda.',
  },
  {
    id: 'familia-origen',
    unlocksAt: 'INTENTIONAL_FRIENDSHIP',
    topic: 'familia',
    text: '¿Qué cosa de la familia en la que creciste quieres repetir, y cuál no?',
    why: 'Casi todos repetimos lo que vimos, salvo lo que decidimos a conciencia no repetir.',
  },
  {
    id: 'conflicto-estilo',
    unlocksAt: 'INTENTIONAL_FRIENDSHIP',
    topic: 'conflicto',
    text: 'Cuando algo te molesta de alguien cercano, ¿lo dices enseguida, esperas, o te callas?',
    why: 'No importa tanto que peleen como cómo pelean. Eso se sabe antes.',
  },

  // --- Noviazgo: lo que decide si esto puede ser una vida ------------------
  {
    id: 'dinero-manejo',
    unlocksAt: 'COURTSHIP',
    topic: 'dinero',
    text: '¿Cómo manejas el dinero hoy: presupuesto, ahorro, deudas? ¿Qué te enseñaron sobre eso en tu casa?',
    why: 'El dinero es la primera causa de conflicto en matrimonios jóvenes, y la más fácil de hablar a tiempo.',
  },
  {
    id: 'dinero-juntos',
    unlocksAt: 'COURTSHIP',
    topic: 'dinero',
    text: 'Si se casaran, ¿todo en una cuenta común, todo separado, o una mezcla?',
    why: 'Casi nadie lo habla antes, y casi todos descubren que asumían cosas distintas.',
  },
  {
    id: 'hijos-quiero',
    unlocksAt: 'COURTSHIP',
    topic: 'hijos',
    text: '¿Quieres tener hijos? ¿Cuántos, y cuándo te gustaría?',
    why: 'Es la diferencia que menos se negocia. Saberlo tarde cuesta años.',
  },
  {
    id: 'familia-limites',
    unlocksAt: 'COURTSHIP',
    topic: 'familia',
    text: '¿Qué papel tendrían tus padres en su matrimonio? ¿Qué decisiones les consultarías?',
    why: 'La familia política no es un tema menor en República Dominicana, y conviene acordarlo antes.',
  },
  {
    id: 'fe-iglesia',
    unlocksAt: 'COURTSHIP',
    topic: 'fe',
    text: 'Si vienen de congregaciones distintas, ¿dónde se congregarían? ¿Quién se mudaría?',
    why: 'La pregunta interdenominacional más práctica, y la que más se pospone.',
  },
  {
    id: 'pasado-saber',
    unlocksAt: 'COURTSHIP',
    topic: 'pasado',
    text: '¿Hay algo de tu historia que crees que la otra persona debería saber antes de seguir?',
    why: 'Contarlo tú es distinto de que se entere después. Nadie te pide detalles: tú decides qué y cuándo.',
  },

  // --- Compromiso: lo concreto de la vida que empieza ----------------------
  {
    id: 'vida-roles',
    unlocksAt: 'ENGAGED',
    topic: 'vida',
    text: '¿Cómo se repartirían la casa, el trabajo y el dinero que entra?',
    why: 'Mientras más concreta la respuesta, más sirve: lo que no se acuerda se hereda del hogar de cada quien, y rara vez coincide.',
  },
  {
    id: 'conflicto-ayuda',
    unlocksAt: 'ENGAGED',
    topic: 'conflicto',
    text: 'Si algo se pusiera difícil entre ustedes, ¿a quién acudirían? ¿Aceptarían consejería?',
    why: 'Decidirlo con calma ahora es más fácil que decidirlo en medio de la crisis.',
  },
];

/** Las preguntas abiertas para una pareja en esta etapa. */
export function questionsFor(stage: RelationshipStage): StageQuestion[] {
  return STAGE_QUESTIONS.filter(
    (question) => STAGE_ORDER[stage] >= STAGE_ORDER[question.unlocksAt],
  );
}

/** Las que se abren justo al llegar a esta etapa, para poder anunciarlas. */
export function questionsUnlockedAt(stage: RelationshipStage): StageQuestion[] {
  return STAGE_QUESTIONS.filter((question) => question.unlocksAt === stage);
}

/**
 * Si esta respuesta puede verse.
 *
 * Solo cuando las dos existen. Ver la del otro antes de contestar convierte la
 * pregunta en un examen: se responde a la respuesta y no a la pregunta.
 */
export function canReveal(mine: string | null, theirs: string | null): boolean {
  return !!mine && !!theirs;
}

/** La siguiente pregunta sin contestar, para sugerir una y no una lista. */
export function nextUnanswered(
  stage: RelationshipStage,
  answeredIds: string[],
): StageQuestion | null {
  const answered = new Set(answeredIds);
  return questionsFor(stage).find((question) => !answered.has(question.id)) ?? null;
}

/** Cuántas preguntas trae cada etapa, para explicar qué se abre al avanzar. */
export const QUESTIONS_BY_STAGE: Record<RelationshipStage, number> = Object.fromEntries(
  RELATIONSHIP_STAGES.map((stage) => [stage, questionsUnlockedAt(stage).length]),
) as Record<RelationshipStage, number>;
