/**
 * Validación de propósito.
 *
 * La moderación de texto lee mensajes, uno por uno. Este módulo lee otra cosa:
 * el **patrón** de una persona a lo largo del tiempo. Alguien puede escribir
 * cien mensajes impecables y aun así estar usando Yugo para coleccionar
 * conexiones — nada en el contenido lo delata, y el comportamiento sí.
 *
 * Tres decisiones de diseño que son el producto entero, no detalles:
 *
 * 1. **Ninguna señal castiga sola.** Lo peor que ocurre de forma automática es
 *    fricción y una conversación privada. Suspender y expulsar sigue siendo de
 *    una persona, con el historial delante.
 *
 * 2. **Los falsos positivos duelen mucho más que los falsos negativos.**
 *    Acusar de insinceridad a alguien sincero es exactamente la herida que
 *    este producto no puede permitirse: esa persona no vuelve y lo cuenta en
 *    su iglesia. Por eso cada señal tiene umbrales de volumen y de antigüedad,
 *    y una cuenta nueva no puede dispararlas.
 *
 * 3. **El puntaje nunca se le muestra a otro miembro.** Un número público se
 *    convertiría en un juego de estatus y la gente aprendería a moverlo en vez
 *    de a comportarse. Sirve para ordenar, para poner fricción y para llenar
 *    una cola de revisión humana. Nada más.
 */

/** Lo que hay que saber de alguien para juzgar su patrón, no su texto. */
export interface MemberActivity {
  /** Días desde el registro. Una cuenta nueva casi no tiene patrón que leer. */
  accountAgeDays: number;
  /** Intereses marcados en los últimos 30 días. */
  interestsSent: number;
  /** Conexiones activas ahora mismo. */
  activeConnections: number;
  /** Conversaciones donde esta persona envió al menos un mensaje aprobado. */
  conversationsStarted: number;
  /** Conversaciones donde ambos escribieron de verdad (ida y vuelta real). */
  conversationsWithReplies: number;
  /** Vínculos que pasaron de «conociéndonos», alguna vez. */
  bondsAdvanced: number;
  /**
   * Mensajes suyos que la moderación retuvo o rechazó por pedir dinero o por
   * intentar mover la conversación fuera de Yugo. El clasificador agrupa las
   * dos cosas bajo `scam_or_money`, así que la señal se nombra por lo que de
   * verdad mide y no por lo que nos gustaría que midiera.
   */
  flaggedContactMessages: number;
  /** Reportes recibidos por «no busca lo que dice buscar». */
  misleadingReports: number;
}

export type PurposeSignalKey =
  | 'interests_without_conversation'
  | 'connections_without_depth'
  | 'no_bond_ever_advanced'
  | 'repeated_flagged_contact'
  | 'misleading_reports';

export interface PurposeSignal {
  key: PurposeSignalKey;
  /** 0..1. Cuánto pesa esta señal cuando se dispara. */
  weight: number;
  /**
   * En español y concreto, porque quien lo lee es una persona del equipo de
   * moderación decidiendo sobre otra persona. Un puntaje sin explicación es
   * una acusación sin pruebas.
   */
  explain: string;
}

/**
 * Umbrales. Se leen aquí y no se esparcen por el código porque son juicios de
 * producto, no constantes técnicas: alguien los va a querer discutir.
 */
export const PURPOSE_THRESHOLDS = {
  /** Debajo de esto no hay patrón: la persona acaba de llegar. */
  MIN_ACCOUNT_AGE_DAYS: 14,
  /** Debajo de esto tampoco: tres intereses no son una tendencia. */
  MIN_INTERESTS_FOR_SIGNAL: 12,
  /** Marcar mucho y no escribirle a casi nadie. */
  CONVERSATION_RATE_FLOOR: 0.25,
  /** Tener conexiones y que ninguna llegue a ser una conversación. */
  DEPTH_RATE_FLOOR: 0.2,
  MIN_CONNECTIONS_FOR_DEPTH: 5,
  /** Tiempo y volumen suficientes como para que «ninguno avanzó» signifique algo. */
  STAGNANT_AFTER_DAYS: 120,
  MIN_CONNECTIONS_FOR_STAGNANT: 6,
  /** Una vez es un despiste; tres veces es una forma de operar. */
  FLAGGED_CONTACT_MESSAGES: 3,
  MISLEADING_REPORTS: 2,
} as const;

export type PurposeBand = 'solid' | 'watch' | 'review';

export interface PurposeAssessment {
  /** 0..100. Cien es «nada que señalar», no «buena persona». */
  score: number;
  band: PurposeBand;
  signals: PurposeSignal[];
  /**
   * Si es false, no hay datos suficientes y el resultado no debe usarse para
   * nada salvo para no hacer nada.
   */
  hasEnoughHistory: boolean;
}

/**
 * Qué señales dispara esta persona.
 *
 * Cada una responde a una pregunta que un pastor haría sin necesidad de datos:
 * ¿le escribe a la gente que dice que le interesa? ¿alguna de esas conversaciones
 * llega a algún lado? ¿en seis meses no hubo ni un vínculo que avanzara?
 */
export function purposeSignals(activity: MemberActivity): PurposeSignal[] {
  const signals: PurposeSignal[] = [];
  const t = PURPOSE_THRESHOLDS;

  const settled = activity.accountAgeDays >= t.MIN_ACCOUNT_AGE_DAYS;

  // Marca interés en mucha gente y luego no le escribe a casi nadie.
  if (settled && activity.interestsSent >= t.MIN_INTERESTS_FOR_SIGNAL) {
    const rate = activity.conversationsStarted / activity.interestsSent;
    if (rate < t.CONVERSATION_RATE_FLOOR) {
      signals.push({
        key: 'interests_without_conversation',
        weight: 0.3,
        explain: `Marcó interés en ${activity.interestsSent} personas y solo inició ${activity.conversationsStarted} conversaciones.`,
      });
    }
  }

  // Tiene conexiones, pero ninguna llega a ser una conversación de verdad.
  if (settled && activity.activeConnections >= t.MIN_CONNECTIONS_FOR_DEPTH) {
    const depth = activity.conversationsWithReplies / activity.activeConnections;
    if (depth < t.DEPTH_RATE_FLOOR) {
      signals.push({
        key: 'connections_without_depth',
        weight: 0.3,
        explain: `Tiene ${activity.activeConnections} conexiones y ${activity.conversationsWithReplies} con conversación de ida y vuelta.`,
      });
    }
  }

  // Tiempo de sobra, conexiones de sobra, y ni un vínculo que avanzara.
  if (
    activity.accountAgeDays >= t.STAGNANT_AFTER_DAYS &&
    activity.activeConnections >= t.MIN_CONNECTIONS_FOR_STAGNANT &&
    activity.bondsAdvanced === 0
  ) {
    signals.push({
      key: 'no_bond_ever_advanced',
      weight: 0.25,
      explain: `Lleva ${activity.accountAgeDays} días y ${activity.activeConnections} conexiones sin que ninguna pasara de «conociéndonos».`,
    });
  }

  // Insistir en pedir dinero o en sacar la conversación de Yugo es el patrón
  // compartido por la estafa y por quien no quiere dejar rastro.
  if (activity.flaggedContactMessages >= t.FLAGGED_CONTACT_MESSAGES) {
    signals.push({
      key: 'repeated_flagged_contact',
      weight: 0.4,
      explain: `La moderación retuvo o rechazó ${activity.flaggedContactMessages} de sus mensajes por pedir dinero o por intentar mover la conversación fuera de Yugo.`,
    });
  }

  // Lo que dicen quienes hablaron con esta persona pesa más que cualquier
  // conteo: son testigos, no métricas.
  if (activity.misleadingReports >= t.MISLEADING_REPORTS) {
    signals.push({
      key: 'misleading_reports',
      weight: 0.5,
      explain: `${activity.misleadingReports} personas reportaron que no busca lo que dice buscar.`,
    });
  }

  return signals;
}

/**
 * El juicio completo.
 *
 * El puntaje baja por señales acumuladas, no por una sola: una persona puede
 * tener una racha rara sin estar usando mal la app, y el sistema debe soportar
 * eso sin molestarla.
 */
export function assessPurpose(activity: MemberActivity): PurposeAssessment {
  const hasEnoughHistory =
    activity.accountAgeDays >= PURPOSE_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS &&
    activity.interestsSent + activity.activeConnections > 0;

  const signals = purposeSignals(activity);
  const penalty = signals.reduce((sum, signal) => sum + signal.weight, 0);
  const score = Math.max(0, Math.round((1 - Math.min(1, penalty)) * 100));

  // Una señal sola nunca llega a revisión humana: hace falta que el patrón se
  // repita por más de un lado, o que alguien lo haya reportado.
  const reported = signals.some((s) => s.key === 'misleading_reports');
  const band: PurposeBand = !hasEnoughHistory
    ? 'solid'
    : reported || penalty >= 0.6
      ? 'review'
      : penalty >= 0.3
        ? 'watch'
        : 'solid';

  return { score, band, signals, hasEnoughHistory };
}

/**
 * La insignia «Perfil con propósito».
 *
 * Se gana con comportamiento y no se compra — igual que el filtro de
 * respaldados es gratis. Cobrar por la señal de confianza empujaría a la gente
 * hacia los perfiles menos verificados, que es lo contrario de lo que este
 * producto necesita.
 *
 * Pide evidencia positiva, no ausencia de sospecha: haber sostenido
 * conversaciones reales y haber avanzado alguna vez con alguien.
 */
export function earnsPurposeBadge(activity: MemberActivity): boolean {
  const assessment = assessPurpose(activity);
  if (assessment.band !== 'solid') return false;
  if (activity.accountAgeDays < PURPOSE_THRESHOLDS.MIN_ACCOUNT_AGE_DAYS) return false;
  return activity.conversationsWithReplies >= 2 || activity.bondsAdvanced >= 1;
}
