/**
 * Demo-mode state: the whole UI works against the shared fixtures with
 * realistic interactions, including a client-side moderation imitation so the
 * "message held / rejected" flows can be seen. In live mode the same screens
 * call the API instead — see runtime.ts.
 */
import { create } from 'zustand';
import {
  demoCurrentUser,
  demoDailySummary,
  demoDevotional,
  demoDevotionalSchedule,
  demoEvents,
  demoHeldContent,
  demoPrayerRequests,
  demoMessages,
  seatFor,
  LIMITS,
  validateStageProposal,
  hasAdvanced,
  type ChatMessage,
  type CoupleAccompaniment,
  type CoupleStory,
  type DevotionalDraft,
  type DevotionalSchedule,
  type DevotionalToday,
  type DevotionalReadResult,
  type HeldContentItem,
  type PrayerRequestItem,
  type StageQuestionsView,
  canReveal,
  questionsFor,
  STAGE_QUESTIONS,
  type MeetingPlan,
  type MeetingPlanInput,
  type RelationshipStage,
  type StoryDraftInput,
} from '@yugo/shared';

/** Per-connection stage state, mirroring what the API returns. */
export interface DemoRelationship {
  stage: RelationshipStage;
  stageChangedAt: string | null;
  proposal: { stage: RelationshipStage; byMe: boolean; proposedAt: string } | null;
  history: Array<{ toStage: RelationshipStage; createdAt: string }>;
}

interface DemoState {
  interestsUsed: number;
  interestsLimit: number | null;
  sentInterests: Record<string, boolean>;
  savedProfiles: Record<string, boolean>;
  passedProfiles: Record<string, boolean>;
  lastPassed: string | null;
  undosUsed: number;
  eventStatus: Record<string, 'GOING' | 'INTERESTED' | 'WAITLIST' | undefined>;
  activityJoined: Record<string, boolean>;
  praying: Record<string, boolean>;
  amen: Record<string, boolean>;
  messages: Record<string, ChatMessage[]>;
  invisibleMode: boolean;
  showOroBadge: boolean;
  travelModeOn: boolean;
  pausedProfile: boolean;
  /** RF-DES-10: featured until, so the demo reflects the activation. */
  boostActiveUntil: string | null;
  boostUsedThisWeek: number;
  /** Etapas del vínculo, por matchId. */
  relationships: Record<string, DemoRelationship>;
  markInterest: (userId: string) => 'ok' | 'limit';
  passProfile: (userId: string) => void;
  undoPass: () => string | null;
  saveProfile: (userId: string) => void;
  setEventStatus: (
    eventId: string,
    status: 'GOING' | 'INTERESTED' | undefined,
  ) => 'GOING' | 'INTERESTED' | 'WAITLIST' | undefined;
  toggleActivity: (activityId: string) => void;
  togglePraying: (postId: string) => void;
  toggleAmen: (postId: string) => void;
  sendMessage: (conversationId: string, body: string) => ChatMessage;
  setInvisibleMode: (on: boolean) => void;
  setShowOroBadge: (on: boolean) => void;
  setTravelMode: (on: boolean) => void;
  setPausedProfile: (on: boolean) => void;
  activateBoost: () => string;
  proposeStage: (matchId: string, stage: RelationshipStage) => 'ok' | 'invalid';
  respondToStage: (matchId: string, accept: boolean) => void;
  /** Acompañamiento por matchId, tal como lo devuelve la API. */
  accompaniment: Record<string, CoupleAccompaniment>;
  inviteMentor: (
    matchId: string,
    code: string,
  ) => 'ok' | 'mentor_code_not_found' | 'needs_intentional_friendship' | 'already_accompanied';
  consentToMentor: (matchId: string, agree: boolean) => void;
  endAccompaniment: (matchId: string) => void;
  /** Borrador de la historia de cada pareja, tal como lo devuelve la API. */
  storyDrafts: Record<string, NonNullable<CoupleStory['story']>>;
  submitStory: (matchId: string, input: StoryDraftInput) => void;
  /** Respuestas a las conversaciones que importan, por matchId y pregunta. */
  questionAnswers: Record<string, Record<string, { mine?: string; theirs?: string }>>;
  answerStageQuestion: (
    matchId: string,
    questionId: string,
    answer: string,
  ) => { revealed: boolean; theirAnswer: string | null };
  consentToStory: (matchId: string, agree: boolean) => void;
  /** Plan del primer encuentro, por matchId. Es de quien lo escribe. */
  meetingPlans: Record<string, MeetingPlan>;
  saveMeetingPlan: (matchId: string, input: MeetingPlanInput) => MeetingPlan;
  updateMeetingPlan: (matchId: string, patch: Partial<MeetingPlan>) => MeetingPlan;
  cancelMeetingPlan: (matchId: string) => void;

  /** Devocional del día: lo leído y lo escrito, en esta sesión de demo. */
  devotional: DevotionalToday;
  readDevotional: (reflection?: string) => DevotionalReadResult;

  /** Cola de retenidos del panel, para que la demo enseñe el flujo completo. */
  held: HeldContentItem[];
  resolveHeld: (caseId: string, approve: boolean) => { done: boolean; approved: boolean };

  /** Calendario de devocionales del panel. */
  devotionalSchedule: DevotionalSchedule;
  upsertDevotional: (date: string, draft: DevotionalDraft) => { id: string; publishOn: string; created: boolean };
  removeDevotional: (id: string) => void;

  /** Muro de oración. */
  prayers: PrayerRequestItem[];
  intercede: (id: string) => { iPrayed: boolean; intercessions: number };
  createPrayer: (body: string, anonymous: boolean) => { id: string; published: boolean };
  markPrayerAnswered: (id: string, note?: string) => { noteHeld: boolean };
}

/**
 * El mensaje que la persona manda desde su propio teléfono.
 *
 * Se arma aquí para que la demo diga exactamente lo mismo que la API, y
 * porque un texto completo escrito con calma es mejor que lo que uno teclea
 * con nervios.
 */
function demoShareText(input: MeetingPlanInput): string {
  const when = new Intl.DateTimeFormat('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Santo_Domingo',
  }).format(new Date(input.meetsAt));
  const lines = [
    'Voy a conocer en persona a alguien que conocí en Yugo.',
    `Dónde: ${input.place}`,
    `Cuándo: ${when}`,
  ];
  if (input.notes) lines.push(`Nota: ${input.notes}`);
  lines.push('Te aviso cuando llegue a casa.');
  return lines.join('\n');
}

const DAY = 24 * 3600_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString();

/** The default for any connection nobody has moved. */
export const NEW_RELATIONSHIP: DemoRelationship = {
  stage: 'KNOWING',
  stageChangedAt: null,
  proposal: null,
  history: [],
};

/**
 * Seeded so the demo shows the states that matter without anyone having to
 * click through: a bond that already advanced, one waiting on an answer from
 * us, and everything else at the start. Two of them sit on connections that
 * appear in the conversation list, so the stage chip there is visible too.
 */
const demoRelationships: Record<string, DemoRelationship> = {
  'm-daniela': {
    stage: 'INTENTIONAL_FRIENDSHIP',
    stageChangedAt: ago(21),
    proposal: null,
    history: [{ toStage: 'INTENTIONAL_FRIENDSHIP', createdAt: ago(21) }],
  },
  'm-sarah': {
    stage: 'KNOWING',
    stageChangedAt: null,
    proposal: { stage: 'INTENTIONAL_FRIENDSHIP', byMe: false, proposedAt: ago(2) },
    history: [],
  },
  'm-priscila': {
    stage: 'KNOWING',
    stageChangedAt: null,
    proposal: { stage: 'INTENTIONAL_FRIENDSHIP', byMe: false, proposedAt: ago(1) },
    history: [],
  },
};

/** Los códigos que la demo reconoce, y a quién corresponden. */
const DEMO_MENTOR_CODES: Record<
  string,
  { mentorName: string; spouseName: string; churchName: string; marriedSince: number; bio: string }
> = {
  'PADRINOS-7C4A19': {
    mentorName: 'Pedro',
    spouseName: 'Marta',
    churchName: 'Iglesia Bíblica Emanuel',
    marriedSince: 2009,
    bio: 'Servimos en el ministerio de matrimonios de Emanuel desde 2015.',
  },
};

/**
 * El acompañamiento por defecto de un vínculo: nadie todavía, y se puede
 * invitar solo si la pareja pasó de «conociéndonos».
 */
export function demoAccompanimentFor(matchId: string): CoupleAccompaniment {
  const stage = useDemoStore.getState?.().relationships[matchId]?.stage ?? 'KNOWING';
  const advanced = hasAdvanced(stage);
  return {
    canInvite: advanced,
    whyNot: advanced ? null : 'needs_intentional_friendship',
    items: [],
  };
}

/** Una pareja ya acompañada, para que la demo muestre el estado activo. */
const demoAccompaniment: Record<string, CoupleAccompaniment> = {
  'm-daniela': {
    canInvite: true,
    whyNot: null,
    items: [
      {
        id: 'acc-daniela',
        status: 'ACTIVE',
        mentorName: 'Pedro',
        spouseName: 'Marta',
        churchName: 'Iglesia Bíblica Emanuel',
        marriedSince: 2009,
        bio: 'Servimos en el ministerio de matrimonios de Emanuel desde 2015.',
        invitedByMe: true,
        myConsent: true,
        theirConsent: true,
        mentorAccepted: true,
      },
    ],
  },
};

/**
 * Las preguntas de una pareja en modo demo, con la misma regla que la API: la
 * respuesta ajena no aparece hasta que existen las dos.
 */
export function demoStageQuestions(
  stage: RelationshipStage,
  answers: Record<string, { mine?: string; theirs?: string }> = {},
): StageQuestionsView {
  const open = questionsFor(stage);
  const items = open.map((question) => {
    const pair = answers[question.id] ?? {};
    const revealed = canReveal(pair.mine ?? null, pair.theirs ?? null);
    return {
      id: question.id,
      topic: question.topic,
      text: question.text,
      why: question.why,
      myAnswer: pair.mine ?? null,
      theirAnswer: revealed ? (pair.theirs ?? null) : null,
      theyAnswered: !!pair.theirs,
      revealed,
    };
  });
  return {
    stage,
    items,
    answered: items.filter((item) => item.revealed).length,
    total: items.length,
    lockedAhead: STAGE_QUESTIONS.length - open.length,
  };
}

/**
 * En la demo la otra persona ya dejó contestadas algunas, para poder ver el
 * momento que da sentido a la función: las dos respuestas apareciendo juntas.
 */
const demoQuestionAnswers: Record<string, Record<string, { mine?: string; theirs?: string }>> = {
  'm-daniela': {
    'fe-practica': {
      theirs:
        'Leo en la mañana antes del turno. No siempre me da, pero cuando no lo hago se me nota en el día.',
    },
    'familia-origen': {
      mine: 'Quiero repetir la mesa de los domingos. No quiero repetir el silencio cuando algo dolía.',
      theirs: 'De mi casa me llevo la fe de mi mamá. Dejo atrás lo estrictos que fueron con mi hermana.',
    },
  },
};

/** Días consecutivos programados desde hoy; un hueco corta la cuenta. */
function demoRunway(items: Array<{ publishOn: string }>, today: string): number {
  const dates = new Set(items.map((d) => d.publishOn));
  let days = 0;
  let cursor = Date.parse(`${today}T00:00:00Z`);
  while (dates.has(new Date(cursor).toISOString().slice(0, 10))) {
    days += 1;
    cursor += 86_400_000;
  }
  return days;
}

/** Mirrors the API's stub classifier so demo mode shows real moderation UX. */
function demoModerationStatus(body: string): ChatMessage['moderationStatus'] {
  if (/\b(dinero|deposita|transferencia|invers|préstamo)\b/i.test(body)) return 'REJECTED';
  if (/\b(whatsapp|telegram|instagram)\b/i.test(body)) return 'HELD';
  return 'APPROVED';
}

export const useDemoStore = create<DemoState>((set, get) => ({
  interestsUsed: demoDailySummary.interestsUsedToday,
  interestsLimit: demoCurrentUser.subscription.tier ? null : demoDailySummary.interestsLimit,
  sentInterests: {},
  savedProfiles: {},
  passedProfiles: {},
  lastPassed: null,
  undosUsed: 0,
  eventStatus: { 'ev-vigilia': 'GOING' },
  activityJoined: {},
  praying: {},
  amen: {},
  messages: demoMessages,
  invisibleMode: demoCurrentUser.subscription.invisibleMode ?? false,
  showOroBadge: false,
  travelModeOn: !!demoCurrentUser.subscription.travelMode,
  pausedProfile: false,
  boostActiveUntil: null,
  boostUsedThisWeek: 1,
  relationships: demoRelationships,

  markInterest: (userId) => {
    const { interestsUsed, interestsLimit, sentInterests } = get();
    if (sentInterests[userId]) return 'ok';
    if (interestsLimit !== null && interestsUsed >= interestsLimit) return 'limit';
    set({
      interestsUsed: interestsUsed + 1,
      sentInterests: { ...sentInterests, [userId]: true },
    });
    return 'ok';
  },

  passProfile: (userId) =>
    set((state) => ({
      passedProfiles: { ...state.passedProfiles, [userId]: true },
      lastPassed: userId,
    })),

  undoPass: () => {
    const { lastPassed, undosUsed, passedProfiles } = get();
    if (!lastPassed || undosUsed >= LIMITS.UNDO_PASS_PER_DAY_ORO) return null;
    const { [lastPassed]: _removed, ...rest } = passedProfiles;
    set({ passedProfiles: rest, lastPassed: null, undosUsed: undosUsed + 1 });
    return lastPassed;
  },

  saveProfile: (userId) =>
    set((state) => ({ savedProfiles: { ...state.savedProfiles, [userId]: true } })),

  setEventStatus: (eventId, status) => {
    // El cupo se respeta también en la demo: enseñar un "Asistiré" que la API
    // convertiría en lista de espera sería enseñar una promesa falsa.
    let resolved: 'GOING' | 'INTERESTED' | 'WAITLIST' | undefined = status;
    if (status === 'GOING') {
      const event = demoEvents.find((item) => item.id === eventId);
      const outcome = seatFor({
        capacity: event?.capacity ?? null,
        taken: event?.goingCount ?? 0,
        tier: demoCurrentUser.subscription.tier ?? 'FREE',
        hoursUntilStart: event
          ? (new Date(event.startsAt).getTime() - Date.now()) / 3600_000
          : 1000,
      });
      if (outcome === 'waitlist') resolved = 'WAITLIST';
    }
    set((state) => ({ eventStatus: { ...state.eventStatus, [eventId]: resolved } }));
    return resolved;
  },

  toggleActivity: (activityId) =>
    set((state) => ({
      activityJoined: { ...state.activityJoined, [activityId]: !state.activityJoined[activityId] },
    })),

  togglePraying: (postId) =>
    set((state) => ({ praying: { ...state.praying, [postId]: !state.praying[postId] } })),

  toggleAmen: (postId) =>
    set((state) => ({ amen: { ...state.amen, [postId]: !state.amen[postId] } })),

  sendMessage: (conversationId, body) => {
    const message: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId,
      senderId: demoCurrentUser.userId,
      body,
      moderationStatus: demoModerationStatus(body),
      sentAt: new Date().toISOString(),
      deliveredAt: undefined,
    };
    if (message.moderationStatus === 'APPROVED') {
      message.deliveredAt = new Date().toISOString();
    }
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    }));
    return message;
  },

  setInvisibleMode: (on) => set({ invisibleMode: on }),
  setShowOroBadge: (on) => set({ showOroBadge: on }),
  setTravelMode: (on) => set({ travelModeOn: on }),
  setPausedProfile: (on) => set({ pausedProfile: on }),

  activateBoost: () => {
    const until = new Date(Date.now() + DAY).toISOString();
    set((state) => ({ boostActiveUntil: until, boostUsedThisWeek: state.boostUsedThisWeek + 1 }));
    return until;
  },

  proposeStage: (matchId, stage) => {
    const current = get().relationships[matchId] ?? NEW_RELATIONSHIP;
    // Same rule the API applies, from the same function, so demo mode cannot
    // show a step the real product would refuse.
    if (!validateStageProposal(current.stage, stage).ok) return 'invalid';
    set((state) => ({
      relationships: {
        ...state.relationships,
        [matchId]: {
          ...current,
          proposal: { stage, byMe: true, proposedAt: new Date().toISOString() },
        },
      },
    }));
    return 'ok';
  },

  devotional: demoDevotional,

  /**
   * Marcar leído. La constancia sube un día, nunca baja de golpe y no existe
   * un momento «perdiste la racha»: la demo tiene que enseñar exactamente esa
   * ausencia, porque es una decisión de producto, no un olvido.
   */
  readDevotional: (reflection) => {
    const current = get().devotional;
    const text = reflection?.trim();
    // Imita el clasificador de la API para que la demo enseñe la moderación
    // previa tal como se siente de verdad.
    const status = text ? (demoModerationStatus(text) === 'APPROVED' ? 'APPROVED' : 'HELD') : null;
    const next: DevotionalToday = {
      ...current,
      readByMe: true,
      myReflection: text ?? current.myReflection,
      myReflectionStatus: status ?? current.myReflectionStatus,
      readCount: current.readByMe ? current.readCount : current.readCount + 1,
      churchReadCount: current.readByMe ? current.churchReadCount : current.churchReadCount + 1,
      constancy: current.constancy.readToday
        ? current.constancy
        : { ...current.constancy, daysRead: current.constancy.daysRead + 1, readToday: true },
    };
    set({ devotional: next });
    return {
      readByMe: true,
      reflection: next.myReflection,
      reflectionStatus: next.myReflectionStatus,
      published: next.myReflectionStatus === 'APPROVED',
    };
  },

  held: demoHeldContent,

  devotionalSchedule: demoDevotionalSchedule,

  /**
   * Guardar el de una fecha. Recalcula la reserva igual que la API: días
   * consecutivos desde hoy, y un hueco la corta.
   */
  upsertDevotional: (date, draft) => {
    const current = get().devotionalSchedule;
    const existing = current.items.find((d) => d.publishOn === date);
    const item = existing
      ? { ...existing, ...draft }
      : {
          id: `dv-${date}`,
          publishOn: date,
          ...draft,
          reads: 0,
          isPast: date < current.today,
          isToday: date === current.today,
        };
    const items = [...current.items.filter((d) => d.publishOn !== date), item].sort((a, b) =>
      a.publishOn.localeCompare(b.publishOn),
    );
    set({ devotionalSchedule: { ...current, items, runwayDays: demoRunway(items, current.today) } });
    return { id: item.id, publishOn: date, created: !existing };
  },

  removeDevotional: (id) => {
    const current = get().devotionalSchedule;
    const items = current.items.filter((d) => d.id !== id);
    set({ devotionalSchedule: { ...current, items, runwayDays: demoRunway(items, current.today) } });
  },

  resolveHeld: (caseId, approve) => {
    const item = get().held.find((h) => h.caseId === caseId);
    set((state) => ({ held: state.held.filter((h) => h.caseId !== caseId) }));
    // Si era una petición de oración y se aprueba, aparece en el muro: es el
    // cierre del ciclo que antes no existía.
    if (item && approve && item.kind === 'prayer' && item.text) {
      set((state) => ({
        prayers: [
          {
            id: `pr-${caseId}`,
            body: item.text as string,
            anonymous: item.context.includes('anónima'),
            authorName: item.context.includes('anónima') ? null : item.authorName,
            authorId: item.context.includes('anónima') ? null : item.authorId,
            churchName: null,
            sameChurch: false,
            intercessions: 0,
            iPrayed: false,
            answeredAt: null,
            answeredNote: null,
            createdAt: new Date().toISOString(),
          },
          ...state.prayers,
        ],
      }));
    }
    return { done: true, approved: approve };
  },

  prayers: demoPrayerRequests,

  intercede: (id) => {
    const list = get().prayers;
    const item = list.find((p) => p.id === id);
    if (!item) return { iPrayed: false, intercessions: 0 };
    const iPrayed = !item.iPrayed;
    const intercessions = item.intercessions + (iPrayed ? 1 : -1);
    set({
      prayers: list.map((p) => (p.id === id ? { ...p, iPrayed, intercessions } : p)),
    });
    return { iPrayed, intercessions };
  },

  createPrayer: (body, anonymous) => {
    const held = demoModerationStatus(body) !== 'APPROVED';
    const id = `pr-${Date.now()}`;
    // Lo retenido no aparece en el muro: la demo no debe enseñar una publicación
    // que la API no haría.
    if (!held) {
      set((state) => ({
        prayers: [
          {
            id,
            body,
            anonymous,
            // Ni el nombre ni la iglesia viajan cuando es anónima, igual que
            // en la API. Quien la escribió sí la reconoce como suya.
            authorName: anonymous ? null : demoCurrentUser.displayName,
            authorId: demoCurrentUser.userId,
            churchName: null,
            sameChurch: false,
            intercessions: 0,
            iPrayed: false,
            answeredAt: null,
            answeredNote: null,
            createdAt: new Date().toISOString(),
          },
          ...state.prayers,
        ],
      }));
    }
    return { id, published: !held };
  },

  /**
   * Marcarla contestada. El testimonio pasa por la misma moderación imitada:
   * si queda retenido, la petición se cierra igual y el texto no se muestra,
   * exactamente como hace la API.
   */
  markPrayerAnswered: (id, note) => {
    const text = note?.trim() || null;
    const held = !!text && demoModerationStatus(text) !== 'APPROVED';
    set((state) => ({
      prayers: state.prayers.map((p) =>
        p.id === id
          ? { ...p, answeredAt: new Date().toISOString(), answeredNote: held ? null : text }
          : p,
      ),
    }));
    return { noteHeld: held };
  },

  accompaniment: demoAccompaniment,
  storyDrafts: {},
  meetingPlans: {},
  questionAnswers: demoQuestionAnswers,

  answerStageQuestion: (matchId, questionId, answer) => {
    const forMatch = get().questionAnswers[matchId] ?? {};
    const pair = forMatch[questionId] ?? {};
    // Una vez reveladas no se puede corregir a la vista de la ajena.
    if (pair.mine && pair.theirs) return { revealed: true, theirAnswer: pair.theirs };

    const next = { ...pair, mine: answer };
    set((state) => ({
      questionAnswers: {
        ...state.questionAnswers,
        [matchId]: { ...forMatch, [questionId]: next },
      },
    }));
    return { revealed: !!next.theirs, theirAnswer: next.theirs ?? null };
  },

  saveMeetingPlan: (matchId, input) => {
    const plan: MeetingPlan = {
      id: `plan-${matchId}`,
      place: input.place,
      meetsAt: input.meetsAt,
      notes: input.notes ?? null,
      trustedContactLabel: input.trustedContactLabel ?? null,
      status: 'PLANNED',
      sharedAt: null,
      checkInAt: null,
      shareText: demoShareText(input),
      awaitingCheckIn: false,
    };
    set((state) => ({ meetingPlans: { ...state.meetingPlans, [matchId]: plan } }));
    return plan;
  },

  updateMeetingPlan: (matchId, patch) => {
    const current = get().meetingPlans[matchId];
    const next = { ...current, ...patch };
    set((state) => ({ meetingPlans: { ...state.meetingPlans, [matchId]: next } }));
    return next;
  },

  cancelMeetingPlan: (matchId) => {
    const { [matchId]: _removed, ...rest } = get().meetingPlans;
    set({ meetingPlans: rest });
  },

  submitStory: (matchId, input) =>
    set((state) => ({
      storyDrafts: {
        ...state.storyDrafts,
        [matchId]: {
          id: `story-${matchId}`,
          status: 'DRAFT',
          names: input.names,
          churchNames: input.churchNames,
          marriedAt: input.marriedAt,
          body: input.body,
          // Escribirla es consentir; falta el sí de la otra persona.
          myConsent: true,
          theirConsent: false,
          reviewNote: null,
        },
      },
    })),

  consentToStory: (matchId, agree) => {
    const current = get().storyDrafts[matchId];
    if (!current) return;
    if (!agree) {
      // Decir que no la borra en vez de dejarla en una cola esperando a que
      // alguien cambie de opinión.
      const { [matchId]: _removed, ...rest } = get().storyDrafts;
      set({ storyDrafts: rest });
      return;
    }
    set((state) => ({
      storyDrafts: {
        ...state.storyDrafts,
        [matchId]: { ...current, theirConsent: true, status: 'IN_REVIEW' },
      },
    }));
  },

  inviteMentor: (matchId, code) => {
    const bond = get().relationships[matchId] ?? NEW_RELATIONSHIP;
    // Las mismas condiciones que aplica la API, para que la demo no muestre
    // un camino que el producto rechazaría.
    if (!hasAdvanced(bond.stage)) return 'needs_intentional_friendship';
    if (!DEMO_MENTOR_CODES[code.trim().toUpperCase()]) return 'mentor_code_not_found';

    const current = get().accompaniment[matchId] ?? demoAccompanimentFor(matchId);
    if (current.items.some((item) => item.status === 'INVITED' || item.status === 'ACTIVE')) {
      return 'already_accompanied';
    }

    const mentor = DEMO_MENTOR_CODES[code.trim().toUpperCase()];
    set((state) => ({
      accompaniment: {
        ...state.accompaniment,
        [matchId]: {
          canInvite: true,
          whyNot: null,
          items: [
            {
              id: `acc-demo-${matchId}`,
              status: 'INVITED',
              ...mentor,
              invitedByMe: true,
              // Invitar es consentir; falta la otra persona y el matrimonio.
              myConsent: true,
              theirConsent: false,
              mentorAccepted: false,
            },
          ],
        },
      },
    }));
    return 'ok';
  },

  consentToMentor: (matchId, agree) => {
    const current = get().accompaniment[matchId] ?? demoAccompanimentFor(matchId);
    const pending = current.items.find((item) => item.status === 'INVITED');
    if (!pending) return;

    const items = agree
      ? current.items.map((item) =>
          item.id === pending.id
            ? // En la demo el matrimonio contesta enseguida; en producción hace
              // falta que los tres digan que sí.
              { ...item, status: 'ACTIVE' as const, myConsent: true, theirConsent: true, mentorAccepted: true }
            : item,
        )
      : current.items.filter((item) => item.id !== pending.id);

    set((state) => ({
      accompaniment: { ...state.accompaniment, [matchId]: { ...current, items } },
    }));
  },

  endAccompaniment: (matchId) => {
    const current = get().accompaniment[matchId] ?? demoAccompanimentFor(matchId);
    set((state) => ({
      accompaniment: { ...state.accompaniment, [matchId]: { ...current, items: [] } },
    }));
  },

  respondToStage: (matchId, accept) => {
    const current = get().relationships[matchId] ?? NEW_RELATIONSHIP;
    if (!current.proposal) return;
    const now = new Date().toISOString();
    const next: DemoRelationship = accept
      ? {
          stage: current.proposal.stage,
          stageChangedAt: now,
          proposal: null,
          history: [...current.history, { toStage: current.proposal.stage, createdAt: now }],
        }
      : { ...current, proposal: null };
    set((state) => ({ relationships: { ...state.relationships, [matchId]: next } }));
  },
}));
