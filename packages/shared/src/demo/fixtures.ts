/**
 * Demo fixtures used when the frontends run in demo mode
 * (NEXT_PUBLIC_DEMO_MODE / EXPO_PUBLIC_DEMO_MODE) so the whole UI can be
 * exercised without the API. People and churches are fictional; the data
 * mirrors the reference mockups.
 */
import { affinityReason } from '../affinity/reason';
import { relativeDayLabel } from '../events/when';
import type { DevotionalSchedule, DevotionalToday, HeldContentItem } from '../api/client';
import type { PrayerRequestItem } from '../prayer/wall';
import type {
  AffinityBreakdown,
  ConnectionSummary,
  ChatMessage,
  DailySummary,
  EventSummary,
  GroupActivitySummary,
  GroupPost,
  GroupSummary,
  NotificationItem,
  ProfileCard,
  SubscriptionState,
} from '../types/domain';

export interface DemoCurrentUser {
  userId: string;
  displayName: string;
  age: number;
  city: string;
  occupation: string;
  denomination: string;
  intention: 'MARRIAGE' | 'FRIENDSHIP' | 'BOTH';
  completeness: number;
  completenessNext: { field: string; targetPct: number };
  verification: { contact: boolean; identityApprovedAt?: string; endorsedBy?: string };
  ageMin: number;
  ageMax: number;
  maxDistanceKm: number;
  subscription: SubscriptionState;
}

export const demoCurrentUser: DemoCurrentUser = {
  userId: 'u-emilio',
  displayName: 'Emilio',
  age: 34,
  city: 'Santo Domingo',
  occupation: 'QA Analyst',
  denomination: 'Bautista',
  intention: 'MARRIAGE',
  completeness: 82,
  completenessNext: { field: 'tu versículo favorito', targetPct: 90 },
  verification: { contact: true, identityApprovedAt: '2026-08-12' },
  ageMin: 26,
  ageMax: 38,
  maxDistanceKm: 50,
  subscription: {
    tier: 'ORO',
    plan: 'ANNUAL',
    status: 'ACTIVE',
    renewsAt: '2027-03-30',
    invisibleMode: true,
    travelMode: { city: 'Nueva York, EE. UU.', activeUntil: '2026-09-15' },
  },
};

const affinity = (
  total: number,
  d: number,
  i: number,
  p: number,
  c: number,
  a: number,
  notes: Partial<Record<'denomination' | 'intention' | 'practices', string>> = {},
): AffinityBreakdown => ({
  total,
  components: [
    { key: 'denomination', score: d, note: notes.denomination },
    { key: 'intention', score: i, note: notes.intention },
    { key: 'practices', score: p, note: notes.practices },
    { key: 'distance', score: c },
    { key: 'age', score: a },
  ],
});

const discoverBase: ProfileCard[] = [
  {
    userId: 'u-mariel',
    displayName: 'Mariel',
    age: 28,
    gender: 'FEMALE',
    city: 'Santo Domingo',
    distanceKm: 6,
    distanceLabel: '5–10 km',
    occupation: 'Contadora',
    denomination: 'Evangélica',
    churchName: 'Iglesia Bíblica Emanuel',
    intention: 'MARRIAGE',
    testimony:
      '"Sirvo en el ministerio de niños desde hace 4 años. Me gusta cocinar para mucha gente y estoy leyendo Rut por tercera vez."',
    verse: 'Rut 1:16',
    practices: ['Estudio bíblico', 'Servicio social', 'Niños'],
    affinity: affinity(86, 80, 100, 85, 88, 100, {
      denomination: 'Evangélica y Bautista: denominaciones afines',
      intention: 'Ambos buscan relación con propósito de matrimonio',
      practices: 'Coinciden en servicio, estudio bíblico y asistencia semanal',
    }),
    // Ganada por comportamiento sostenido: conversaciones reales y un vínculo
    // que avanzó. No se compra.
    badges: {
      contact: true,
      identity: true,
      endorsedBy: 'Iglesia Bíblica Emanuel',
      purpose: true,
    },
    inCommon: ['Estudio bíblico', 'Servicio social', 'Cada semana', 'Sin hijos'],
  },
  {
    userId: 'u-daniela',
    displayName: 'Daniela',
    age: 31,
    gender: 'FEMALE',
    city: 'Santo Domingo',
    distanceKm: 12,
    distanceLabel: '10–25 km',
    occupation: 'Enfermera',
    denomination: 'Pentecostal',
    churchName: 'Iglesia de Dios Getsemaní',
    intention: 'MARRIAGE',
    testimony:
      '"Dios me sostuvo en los turnos más duros del hospital. Canto en el coro y amo los retiros de montaña."',
    practices: ['Alabanza', 'Oración', 'Intercesión'],
    affinity: affinity(74, 65, 100, 62, 76, 100, {
      denomination: 'Pentecostal y Bautista: afinidad media',
      intention: 'Ambos buscan relación con propósito de matrimonio',
      practices: 'Coinciden en oración constante',
    }),
    badges: { contact: true, identity: true },
    inCommon: ['Oración', 'Cada semana'],
  },
  {
    userId: 'u-sarah',
    displayName: 'Sarah',
    age: 26,
    gender: 'FEMALE',
    city: 'Santo Domingo Este',
    distanceKm: 9,
    distanceLabel: '5–10 km',
    occupation: 'Diseñadora gráfica',
    denomination: 'Bautista',
    churchName: 'Iglesia Bautista Quisqueya',
    intention: 'BOTH',
    testimony:
      '"Crecí en la iglesia, pero mi fe se hizo propia a los 22. Diseño los medios de mi congregación y colecciono Biblias antiguas."',
    practices: ['Medios y sonido', 'Estudio bíblico', 'Jóvenes'],
    affinity: affinity(69, 100, 70, 55, 82, 100, {
      denomination: 'Comparten la misma denominación',
      practices: 'Coinciden en estudio bíblico y medios',
    }),
    badges: { contact: true, identity: true },
    inCommon: ['Estudio bíblico', 'Medios y sonido'],
  },
  {
    userId: 'u-priscila',
    displayName: 'Priscila',
    age: 29,
    gender: 'FEMALE',
    city: 'Santo Domingo Este',
    distanceKm: 4,
    distanceLabel: '2–5 km',
    occupation: 'Maestra',
    denomination: 'Evangélica',
    churchName: 'Iglesia Monte de Sion',
    intention: 'MARRIAGE',
    testimony:
      '"Doy clases a primaria y sirvo con los adolescentes. Creo que la fidelidad de Dios se ve en lo pequeño de cada día."',
    practices: ['Jóvenes', 'Oración', 'Servicio social'],
    affinity: affinity(78, 80, 100, 66, 92, 100, {
      denomination: 'Evangélica y Bautista: denominaciones afines',
      intention: 'Ambos buscan relación con propósito de matrimonio',
    }),
    badges: { contact: true, identity: true, endorsedBy: 'Iglesia Monte de Sion' },
    inCommon: ['Oración', 'Servicio social'],
  },
  {
    userId: 'u-ana',
    displayName: 'Ana Lucía',
    age: 33,
    gender: 'FEMALE',
    city: 'Santiago',
    distanceKm: 28,
    distanceLabel: '25–50 km',
    occupation: 'Abogada',
    denomination: 'Metodista',
    churchName: 'Iglesia Metodista Central',
    intention: 'BOTH',
    testimony:
      '"Sirvo en el ministerio de intercesión. Después de años enfocada en mi carrera, quiero construir algo con propósito."',
    practices: ['Intercesión', 'Estudio bíblico'],
    affinity: affinity(64, 70, 70, 48, 44, 100),
    badges: { contact: true, identity: true },
    inCommon: ['Estudio bíblico'],
  },
];

/**
 * The demo shows the same sentence production shows, generated by the same
 * function — hardcoding the copy here would let the preview drift from what
 * members actually read.
 */
/**
 * Coincidencias en eventos, en modo demo.
 *
 * Mariel va a la misma vigilia que el usuario de la demo. Es el caso que hay
 * que enseñar: una sugerencia que además es una presentación posible entre
 * gente conocida, que es más segura que cualquier primera cita armada desde
 * cero.
 */
const demoSharedEvents: Record<string, { id: string; title: string; startsAt: string }> = {
  'u-mariel': {
    id: 'ev-vigilia',
    title: 'Vigilia de jóvenes adultos',
    startsAt: '2026-09-04T20:00:00-04:00',
  },
};

export const demoDiscover: ProfileCard[] = discoverBase.map((profile) => {
  const event = demoSharedEvents[profile.userId];
  const sharedEvent = event
    ? { ...event, whenLabel: relativeDayLabel(new Date(event.startsAt)) }
    : undefined;
  return {
    ...profile,
    sharedEvent,
    affinityReason: affinityReason({
      affinity: profile.affinity,
      inCommon: profile.inCommon,
      sameDenomination: profile.denomination === demoCurrentUser.denomination,
      bothSeekMarriage: profile.intention === 'MARRIAGE',
      endorsedBy: profile.badges.endorsedBy,
      sharedEvent: sharedEvent
        ? { title: sharedEvent.title, whenLabel: sharedEvent.whenLabel }
        : undefined,
    }),
  };
});

export const demoDailySummary: DailySummary = {
  interestsUsedToday: 3,
  interestsLimit: 8,
  newConnections: 2,
  whoMarkedInterestCount: 7,
  discoverRemaining: 18,
  discoverTotal: 30,
};

export const demoConnections: ConnectionSummary[] = [
  {
    matchId: 'm-mariel',
    otherUser: {
      userId: 'u-mariel',
      displayName: 'Mariel',
      badges: { contact: true, identity: true, endorsedBy: 'Iglesia Bíblica Emanuel' },
      churchName: 'Iglesia Bíblica Emanuel',
    },
    isNew: true,
    unreadCount: 0,
  },
  {
    matchId: 'm-priscila',
    otherUser: {
      userId: 'u-priscila',
      displayName: 'Priscila',
      badges: { contact: true, identity: true, endorsedBy: 'Iglesia Monte de Sion' },
      churchName: 'Iglesia Monte de Sion',
    },
    isNew: true,
    unreadCount: 0,
  },
  {
    matchId: 'm-daniela',
    otherUser: {
      userId: 'u-daniela',
      displayName: 'Daniela',
      badges: { contact: true, identity: true },
      churchName: 'Iglesia de Dios Getsemaní',
    },
    isNew: false,
    lastMessage: {
      body: '¡Sí! Voy a la vigilia del viernes, ¿nos vemos allá?',
      sentAt: '2026-08-29T10:12:00-04:00',
      mine: false,
    },
    unreadCount: 1,
  },
  {
    matchId: 'm-sarah',
    otherUser: {
      userId: 'u-sarah',
      displayName: 'Sarah',
      badges: { contact: true, identity: true },
      churchName: 'Iglesia Bautista Quisqueya',
    },
    isNew: false,
    lastMessage: {
      body: 'Me encantó lo que dijiste sobre Rut 1:16',
      sentAt: '2026-08-28T21:40:00-04:00',
      mine: true,
    },
    unreadCount: 0,
  },
  {
    matchId: 'm-ana',
    otherUser: {
      userId: 'u-ana',
      displayName: 'Ana Lucía',
      badges: { contact: true, identity: true },
      churchName: 'Iglesia Metodista Central',
    },
    isNew: false,
    lastMessage: {
      body: 'Gracias por orar por mi papá 🙏',
      sentAt: '2026-08-25T18:03:00-04:00',
      mine: false,
    },
    unreadCount: 0,
  },
];

export const demoIcebreakers: Record<string, string[]> = {
  'm-mariel': [
    'Vi que sirves con niños, ¿cómo llegaste ahí?',
    '¿Qué es lo que más te ha hablado de Rut esta vez?',
    '¿Cuál es tu plato estrella para mucha gente?',
  ],
  'm-priscila': [
    '¿Qué es lo que más disfrutas de servir con adolescentes?',
    '¿Cómo se ve "la fidelidad de Dios en lo pequeño" en tu semana?',
    '¿Qué grado das en primaria?',
  ],
};

export const demoMessages: Record<string, ChatMessage[]> = {
  'm-mariel': [
    {
      id: 'msg-1',
      conversationId: 'm-mariel',
      senderId: 'u-emilio',
      body: 'Vi que sirves con niños, ¿cómo llegaste ahí?',
      moderationStatus: 'APPROVED',
      sentAt: '2026-08-29T09:44:00-04:00',
      deliveredAt: '2026-08-29T09:44:01-04:00',
      readAt: '2026-08-29T09:50:00-04:00',
    },
    {
      id: 'msg-2',
      conversationId: 'm-mariel',
      senderId: 'u-mariel',
      body: 'Jaja empecé cubriendo a una amiga un domingo y me quedé. Ya son 4 años. ¿Y tú en qué sirves?',
      moderationStatus: 'APPROVED',
      sentAt: '2026-08-29T09:52:00-04:00',
      deliveredAt: '2026-08-29T09:52:01-04:00',
      readAt: '2026-08-29T09:53:00-04:00',
    },
    {
      id: 'msg-3',
      conversationId: 'm-mariel',
      senderId: 'u-emilio',
      body: 'Medios y sonido. Nada de niños, me ganan siempre 😅',
      moderationStatus: 'APPROVED',
      sentAt: '2026-08-29T09:55:00-04:00',
      deliveredAt: '2026-08-29T09:55:01-04:00',
    },
  ],
  'm-daniela': [
    {
      id: 'msg-d1',
      conversationId: 'm-daniela',
      senderId: 'u-emilio',
      body: '¿Vas a la vigilia de Monte de Sion este viernes?',
      moderationStatus: 'APPROVED',
      sentAt: '2026-08-29T10:05:00-04:00',
      deliveredAt: '2026-08-29T10:05:01-04:00',
      readAt: '2026-08-29T10:10:00-04:00',
    },
    {
      id: 'msg-d2',
      conversationId: 'm-daniela',
      senderId: 'u-daniela',
      body: '¡Sí! Voy a la vigilia del viernes, ¿nos vemos allá?',
      moderationStatus: 'APPROVED',
      sentAt: '2026-08-29T10:12:00-04:00',
      deliveredAt: '2026-08-29T10:12:01-04:00',
    },
  ],
};

export const demoEvents: EventSummary[] = [
  {
    id: 'ev-vigilia',
    title: 'Noche de adoración de jóvenes adultos',
    type: 'VIGILIA',
    typeName: 'Vigilia',
    startsAt: '2026-09-04T20:00:00-04:00',
    endsAt: '2026-09-04T23:00:00-04:00',
    churchName: 'Iglesia Monte de Sion',
    city: 'Santo Domingo Este',
    address: 'Av. San Vicente de Paúl 45, Santo Domingo Este',
    distanceKm: 4,
    costLabel: 'Gratis',
    goingCount: 87,
    interestedCount: 41,
    myStatus: 'GOING',
    connectionsGoing: [
      { userId: 'u-mariel', displayName: 'Mariel' },
      { userId: 'u-daniela', displayName: 'Daniela' },
      { userId: 'u-priscila', displayName: 'Priscila' },
    ],
    lat: 18.4885,
    lng: -69.8571,
  },
  {
    id: 'ev-congreso',
    title: 'Congreso de solteros con propósito',
    type: 'CONGRESO',
    typeName: 'Congreso',
    startsAt: '2026-09-05T09:00:00-04:00',
    churchName: 'Centro Cristiano Vida Nueva',
    city: 'Santiago',
    distanceKm: 148,
    costLabel: 'RD$500',
    goingCount: 96,
    interestedCount: 212,
    connectionsGoing: [],
    lat: 19.4517,
    lng: -70.6970,
    // Un encuentro convocado por el ministerio de solteros, ya lleno: es el
    // caso que la demo tiene que enseñar, porque es donde la promesa de "el
    // cupo es el que cabe en el salón" se pone a prueba.
    audience: 'SINGLES',
    capacity: 96,
    openSeats: 0,
    waitlistCount: 14,
  },
  {
    id: 'ev-desayuno',
    title: 'Desayuno solidario en Villa Altagracia',
    type: 'SERVICIO_COMUNITARIO',
    typeName: 'Servicio',
    startsAt: '2026-09-06T07:00:00-04:00',
    churchName: 'Ministerio Manos Abiertas',
    city: 'Villa Altagracia',
    distanceKm: 32,
    costLabel: 'Gratis',
    goingCount: 24,
    interestedCount: 12,
    connectionsGoing: [],
    lat: 18.6702,
    lng: -70.1694,
  },
  {
    id: 'ev-retiro',
    title: 'Retiro de jóvenes en Jarabacoa',
    type: 'RETIRO',
    typeName: 'Retiro',
    startsAt: '2026-09-18T16:00:00-04:00',
    endsAt: '2026-09-20T14:00:00-04:00',
    churchName: 'Iglesia Bautista Quisqueya',
    city: 'Jarabacoa',
    distanceKm: 96,
    costLabel: 'RD$2,500',
    goingCount: 42,
    interestedCount: 63,
    connectionsGoing: [{ userId: 'u-sarah', displayName: 'Sarah' }],
    lat: 19.1183,
    lng: -70.6367,
  },
  {
    id: 'ev-concierto',
    title: 'Concierto de adoración: Un solo corazón',
    type: 'CONCIERTO',
    typeName: 'Concierto',
    startsAt: '2026-09-12T19:00:00-04:00',
    churchName: 'Iglesia Bíblica Emanuel',
    city: 'Santo Domingo',
    distanceKm: 7,
    costLabel: 'RD$300',
    goingCount: 154,
    interestedCount: 89,
    connectionsGoing: [{ userId: 'u-mariel', displayName: 'Mariel' }],
    lat: 18.4720,
    lng: -69.9120,
  },
];

export const demoGroups: GroupSummary[] = [
  {
    id: 'g-ja-sde',
    name: 'Jóvenes adultos SDE',
    category: 'Jóvenes adultos',
    type: 'OFFICIAL',
    city: 'Santo Domingo Este',
    memberCount: 142,
    postsToday: 3,
    isOfficial: true,
    churchName: 'Iglesia Monte de Sion',
    joined: true,
  },
  {
    id: 'g-misiones',
    name: 'Misiones y servicio social',
    category: 'Misiones',
    type: 'OPEN',
    city: 'Santo Domingo',
    memberCount: 89,
    isOfficial: false,
    joined: true,
  },
  {
    id: 'g-alabanza',
    name: 'Alabanza y músicos',
    category: 'Alabanza',
    type: 'APPROVAL',
    city: 'Santo Domingo',
    memberCount: 213,
    isOfficial: false,
    joined: false,
  },
  {
    id: 'g-profesionales',
    name: 'Profesionales con propósito',
    category: 'Profesionales',
    type: 'OPEN',
    city: 'Distrito Nacional',
    memberCount: 67,
    isOfficial: false,
    joined: false,
  },
];

export const demoPosts: GroupPost[] = [
  {
    id: 'p-1',
    groupId: 'g-ja-sde',
    author: { userId: 'u-priscila', displayName: 'Priscila' },
    body: 'Petición: mi mamá entra a cirugía el martes. Les agradezco sus oraciones 🙏',
    isPrayerRequest: true,
    prayingCount: 38,
    amenCount: 12,
    likeCount: 0,
    createdAt: '2026-08-29T08:00:00-04:00',
  },
  {
    id: 'p-2',
    groupId: 'g-ja-sde',
    author: { userId: 'u-sarah', displayName: 'Sarah' },
    body: 'Ya está el arte para la vigilia del viernes. ¡Compartan con sus conocidos!',
    isPrayerRequest: false,
    prayingCount: 0,
    amenCount: 6,
    likeCount: 14,
    createdAt: '2026-08-29T11:20:00-04:00',
  },
];

export const demoActivities: GroupActivitySummary[] = [
  {
    id: 'a-1',
    groupId: 'g-misiones',
    title: 'Jornada de limpieza en Los Cacaos',
    startsAt: '2026-09-12T08:00:00-04:00',
    place: 'Los Cacaos, San Cristóbal',
    goingCount: 24,
  },
];

export const demoNotifications: NotificationItem[] = [
  {
    id: 'n-1',
    category: 'CONNECTION',
    title: 'Nueva conexión',
    body: 'Tú y Mariel se marcaron interés. ¡Ya pueden conversar!',
    createdAt: '2026-08-29T09:40:00-04:00',
  },
  {
    id: 'n-2',
    category: 'MESSAGE',
    title: 'Mensaje de Daniela',
    body: '¡Sí! Voy a la vigilia del viernes, ¿nos vemos allá?',
    createdAt: '2026-08-29T10:12:00-04:00',
  },
  {
    id: 'n-3',
    category: 'EVENT',
    title: 'Recordatorio de evento',
    body: 'Noche de adoración de jóvenes adultos es mañana a las 8:00 pm.',
    createdAt: '2026-09-03T20:00:00-04:00',
    readAt: '2026-09-03T21:00:00-04:00',
  },
];

// ---------------------------------------------------------------------------
// Admin panel demo data
// ---------------------------------------------------------------------------

export const demoAdminKpis = {
  activeMembers30d: 4812,
  activeMembersDelta: '▲ 12% vs. mes anterior',
  connectionsCreated: 1207,
  connectionsDelta: '▲ 8%',
  verifiedLevel2Pct: 53,
  verifiedDelta: '▲ 4 pts',
  plusRevenueDop: 312450,
  revenueDelta: '▲ 19%',
  weekly: [40, 52, 48, 63, 70, 66, 82, 90],
  weeklyPlus: [14, 18, 22, 30],
};

// ---------------------------------------------------------------------------
// Historias
// ---------------------------------------------------------------------------

/**
 * Historias en modo demo.
 *
 * Cada una nombra su iglesia, porque una historia que nadie puede comprobar
 * es publicidad, y una que una congregación respalda es una razón para
 * confiar en el producto.
 */
export const demoStories = [
  {
    id: 'st-rebeca-josue',
    names: 'Rebeca y Josué',
    churchNames: 'Iglesia Bíblica Emanuel y Iglesia Monte de Sion',
    city: 'Santo Domingo',
    marriedAt: '2026-02-14T00:00:00-04:00',
    body: 'Coincidimos en una vigilia de jóvenes adultos antes de coincidir en Yugo. Cuando la app nos sugirió, ya nos habíamos visto de lejos dos veces. Lo que nos ayudó no fue la aplicación: fue que un matrimonio de Emanuel nos acompañó desde que declaramos amistad intencional, y que ninguno de los dos tuvo que adivinar en qué estábamos. A quien está empezando: no tengan prisa por saltarse etapas. Nosotros tardamos catorce meses y no cambiaríamos ninguno.',
    publishedAt: '2026-03-02T10:00:00-04:00',
  },
  {
    id: 'st-noemi-elias',
    names: 'Noemí y Elías',
    churchNames: 'Iglesia Metodista Central',
    city: 'Santiago',
    marriedAt: '2025-11-08T00:00:00-04:00',
    body: 'Los dos habíamos dejado de creer que existía alguien que quisiera lo mismo con la misma seriedad. Nos escribimos tres meses antes de vernos, y cuando nos vimos fue en un encuentro que convocó nuestra propia iglesia, con gente conocida alrededor. Eso quitó todo el miedo. Hoy servimos juntos en el ministerio de matrimonios, acompañando a otras dos parejas.',
    publishedAt: '2025-12-15T10:00:00-04:00',
  },
  {
    id: 'st-sarah-daniel',
    names: 'Sarah y Daniel',
    churchNames: 'Iglesia Bautista Quisqueya',
    city: 'La Vega',
    marriedAt: '2025-06-21T00:00:00-04:00',
    body: 'Lo que más agradecemos es algo que suena raro: que la app nos sacara de Descubrir cuando declaramos noviazgo. Dejó de existir la duda de si el otro seguía mirando. Esa decisión, que a Yugo le costó tenernos dentro, es la razón por la que lo recomendamos en nuestra iglesia.',
    publishedAt: '2025-07-30T10:00:00-04:00',
  },
];

// ---------------------------------------------------------------------------
// Ministerio de solteros
// ---------------------------------------------------------------------------

/**
 * Lo que ve el ministerio de solteros, en modo demo.
 *
 * Totals only — no names anywhere, because the real endpoint has none either.
 * The waitlist numbers are the point: 96 confirmed and 14 waiting says
 * something 96 alone does not.
 */
export const demoSinglesMinistry = {
  endorsedSingles: 142,
  pastEncounters: 6,
  going: 268,
  waitlisted: 31,
  checkIns: 214,
  checkInRate: 80,
  upcoming: [
    {
      id: 'ev-congreso',
      title: 'Congreso de solteros con propósito',
      startsAt: '2026-09-05T09:00:00-04:00',
      capacity: 96,
      going: 96,
      waitlisted: 14,
    },
    {
      id: 'ev-cafe',
      title: 'Café y conversación: noviazgo con propósito',
      startsAt: '2026-09-19T19:00:00-04:00',
      capacity: 40,
      going: 23,
      waitlisted: 0,
    },
  ],
  privacyNote:
    'Este panel muestra totales de los encuentros que convoca tu congregación. Nunca muestra quién asiste, con quién conversa ni con quién conecta.',
};

// ---------------------------------------------------------------------------
// Acompañamiento
// ---------------------------------------------------------------------------

/**
 * El matrimonio que acompaña, en modo demo.
 *
 * Nótese lo que no está y nunca estará: ni una conversación, ni un mensaje,
 * ni un contador de no leídos. La demo tiene que mostrar exactamente el mismo
 * límite que la API, o enseñaría una promesa que el producto no cumple.
 */
export const demoMentorProfile = {
  userId: 'u-me',
  code: 'PADRINOS-7C4A19',
  spouseName: 'Marta',
  marriedSince: 2009,
  bio: 'Servimos en el ministerio de matrimonios de Emanuel desde 2015.',
  active: true,
};

export const demoAccompaniedBonds = [
  {
    id: 'acc-1',
    status: 'ACTIVE' as const,
    stage: 'COURTSHIP' as const,
    stageChangedAt: '2026-07-14T18:00:00-04:00',
    since: '2026-05-02T10:00:00-04:00',
    names: ['Rebeca', 'Josué'] as [string, string],
    churches: ['Iglesia Bíblica Emanuel', 'Iglesia Monte de Sion'] as [string | null, string | null],
    bothConsented: true,
  },
  {
    id: 'acc-2',
    status: 'INVITED' as const,
    stage: 'INTENTIONAL_FRIENDSHIP' as const,
    stageChangedAt: '2026-08-20T09:30:00-04:00',
    since: null,
    names: ['Noemí', 'Elías'] as [string, string],
    churches: ['Iglesia Metodista Central', 'Iglesia Metodista Central'] as [
      string | null,
      string | null,
    ],
    bothConsented: true,
  },
];

/**
 * Reportes exportables (RF-ADM-12) en modo demo.
 *
 * The funnel ends where the product's purpose ends — bonds that advanced —
 * and revenue is its own report. The demo has to show that framing, because
 * what the panel puts last is what the team will optimise.
 */
export const demoReports: Record<string, { title: string; rows: Array<Record<string, string | number>> }> = {
  funnel: {
    title: 'Del registro al vínculo',
    rows: [
      { Etapa: 'Registrados', Miembros: 4812, 'Del total (%)': 100 },
      { Etapa: 'Perfil completo (≥60%)', Miembros: 3416, 'Del total (%)': 71 },
      { Etapa: 'Verificados nivel 2+', Miembros: 2550, 'Del total (%)': 53 },
      { Etapa: 'Con al menos una conexión', Miembros: 1207, 'Del total (%)': 25.1 },
      { Etapa: 'Conversando', Miembros: 862, 'Del total (%)': 17.9 },
      { Etapa: 'En un vínculo que avanzó', Miembros: 214, 'Del total (%)': 4.4 },
      { Etapa: 'En noviazgo o compromiso', Miembros: 68, 'Del total (%)': 1.4 },
    ],
  },
  subscriptions: {
    title: 'Suscripciones activas',
    rows: [
      { Plan: 'Gratuito', Miembros: 4441, 'Del total (%)': 92.3 },
      { Plan: 'Plus', Miembros: 315, 'Del total (%)': 6.5 },
      { Plan: 'Oro', Miembros: 56, 'Del total (%)': 1.2 },
    ],
  },
  province: {
    title: 'Actividad por provincia',
    rows: [
      { Provincia: 'Distrito Nacional', Miembros: 1829, 'Del total (%)': 38 },
      { Provincia: 'Santo Domingo', Miembros: 1492, 'Del total (%)': 31 },
      { Provincia: 'Santiago', Miembros: 818, 'Del total (%)': 17 },
      { Provincia: 'La Vega', Miembros: 385, 'Del total (%)': 8 },
      { Provincia: 'Otras', Miembros: 288, 'Del total (%)': 6 },
    ],
  },
  retention: {
    title: 'Retención por cohorte',
    rows: [
      { Cohorte: 'Mayo 2026', 'Día 7 (%)': 58, 'Día 30 (%)': 37 },
      { Cohorte: 'Junio 2026', 'Día 7 (%)': 61, 'Día 30 (%)': 39 },
      { Cohorte: 'Julio 2026', 'Día 7 (%)': 63, 'Día 30 (%)': 41 },
    ],
  },
};

export interface DemoModerationRow {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  type: string;
  reported: string;
  reason: string;
  evidence: string;
  ageLabel: string;
}

export const demoModerationQueue: DemoModerationRow[] = [
  {
    id: 'mod-1',
    priority: 'CRITICAL',
    type: 'Perfil',
    reported: '@j.rodriguez_21',
    reason: 'Posible menor de edad',
    evidence: '3 fotos',
    ageLabel: '2 h',
  },
  {
    id: 'mod-2',
    priority: 'CRITICAL',
    type: 'Mensaje',
    reported: '@carlos.mv',
    reason: 'Acoso',
    evidence: 'Historial (14 msg)',
    ageLabel: '5 h',
  },
  {
    id: 'mod-3',
    priority: 'HIGH',
    type: 'Mensaje',
    reported: '@inversor_fe',
    reason: 'Sospecha de estafa · pidió dinero',
    evidence: 'Historial (6 msg) · IA 0.92',
    ageLabel: '9 h',
  },
  {
    id: 'mod-4',
    priority: 'HIGH',
    type: 'Perfil',
    reported: '@mari.santos',
    reason: 'Identidad falsa',
    evidence: 'Comparación selfie',
    ageLabel: '11 h',
  },
  {
    id: 'mod-5',
    priority: 'NORMAL',
    type: 'Publicación',
    reported: 'Grupo Alabanza y músicos',
    reason: 'Contenido comercial',
    evidence: '1 imagen',
    ageLabel: '1 d',
  },
  {
    id: 'mod-6',
    priority: 'NORMAL',
    type: 'Perfil',
    reported: '@pedro_98',
    reason: 'Perfil engañoso (no cristiano)',
    evidence: 'Bio',
    ageLabel: '1 d',
  },
];

export const demoVerificationCase = {
  index: 1,
  total: 23,
  memberLabel: 'Mariel Peña · 28 · Santo Domingo',
  selfieTakenAt: '29 ago 9:02',
  similarity: 0.91,
  livenessPassed: true,
  declaredBirth: '12/03/1998 · 28 años',
  history: { reports: 0, sanctions: 0, since: '20 ago 2026' },
};

export const demoAttentionItems = [
  { priority: 'CRITICAL' as const, text: '2 reportes de "menor de edad" sin asignar' },
  { priority: 'HIGH' as const, text: '23 verificaciones esperan más de 24 h' },
  { priority: 'NORMAL' as const, text: '4 iglesias pendientes de aprobación' },
  { priority: 'NORMAL' as const, text: 'Cola de moderación IA: 41 mensajes retenidos' },
];

// ---------------------------------------------------------------------------
// Church portal demo data
// ---------------------------------------------------------------------------

export const demoChurch = {
  id: 'ch-monte-sion',
  name: 'Iglesia Monte de Sion',
  denomination: 'Evangélica',
  status: 'APPROVED' as const,
  endorsedMembers: 184,
  activeCodes: 37,
  pendingLeaderRequests: 3,
  endorsementRequests: [
    {
      id: 'er-1',
      name: 'Priscila Méndez',
      gender: 'FEMALE' as const,
      attendsSince: 2021,
      leader: 'Pastor Luis',
    },
    { id: 'er-2', name: 'Raúl Féliz', gender: 'MALE' as const, attendsSince: 2024, leader: null },
  ],
};

// ---------------------------------------------------------------------------
// Devocional del día y muro de oración
// ---------------------------------------------------------------------------

/**
 * El devocional de hoy, tal como lo devuelve la API.
 *
 * `churchReadCount` es el número que da sentido a todo lo demás: no es que
 * alguien leyó un texto, es que su congregación leyó el mismo texto y el
 * domingo pueden hablar de eso.
 */
export const demoDevotional: DevotionalToday = {
  id: 'dev-hoy',
  publishOn: new Date().toISOString().slice(0, 10),
  isToday: true,
  reference: 'Proverbios 4:23',
  title: 'Guarda tu corazón',
  body:
    'Sobre toda cosa guardada, guarda tu corazón, porque de él mana la vida. ' +
    'Guardar no es cerrar: es saber a quién le abres, y en qué orden.',
  question: '¿A quién le has abierto el corazón esta semana, y por qué a esa persona?',
  myReflection: null,
  myReflectionStatus: null,
  readByMe: false,
  readCount: 312,
  churchReadCount: 27,
  reflections: [
    {
      userId: 'u-lucia',
      name: 'Lucía',
      reflection: 'Me pegó lo del orden. Yo abro primero y pienso después.',
      readAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    },
    {
      userId: 'u-jonathan',
      name: 'Jonathan',
      reflection: 'Lo leí camino al trabajo y lo volví a leer de noche.',
      readAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    },
  ],
  constancy: { daysRead: 9, windowDays: 30, readToday: false },
};

/**
 * El muro, ya ordenado como lo ordena `rankPrayerRequests`.
 *
 * Trae a propósito una petición anónima en cero: es la que el orden tiene que
 * subir, y es la que prueba que el anonimato es real — no llega ni el nombre
 * ni la iglesia de quien la escribió.
 */
export const demoPrayerRequests: PrayerRequestItem[] = [
  {
    id: 'pr-contestada',
    body: 'Llevaba cuatro meses sin trabajo y ya se me estaba acabando la fe.',
    anonymous: true,
    authorName: null,
    authorId: null,
    churchName: null,
    sameChurch: false,
    intercessions: 14,
    iPrayed: true,
    answeredAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    answeredNote: 'Salió el trabajo. Empiezo el lunes. Gracias a los que oraron.',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
  },
  {
    id: 'pr-sola',
    body: 'Empiezo la universidad a los 34 y me da vergüenza. Por valor.',
    anonymous: true,
    authorName: null,
    authorId: null,
    churchName: null,
    sameChurch: false,
    intercessions: 0,
    iPrayed: false,
    answeredAt: null,
    answeredNote: null,
    createdAt: new Date(Date.now() - 9 * 3600000).toISOString(),
  },
  {
    id: 'pr-mama',
    body: 'Por mi mamá, que la operan el jueves. Que las manos del médico estén firmes.',
    anonymous: false,
    authorName: 'Mariel',
    authorId: 'u-mariel',
    churchName: 'Iglesia Monte de Sion',
    sameChurch: true,
    intercessions: 11,
    iPrayed: false,
    answeredAt: null,
    answeredNote: null,
    createdAt: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
  {
    id: 'pr-hija',
    body: 'Por mi hija de 7 años, que le cuesta dormir desde que nos mudamos.',
    anonymous: false,
    authorName: 'Jonathan',
    authorId: 'u-jonathan',
    churchName: 'Iglesia Bíblica Emanuel',
    sameChurch: false,
    intercessions: 9,
    iPrayed: false,
    answeredAt: null,
    answeredNote: null,
    createdAt: new Date(Date.now() - 30 * 3600000).toISOString(),
  },
];

/**
 * Lo retenido, para el panel en modo demo. Trae una petición anónima a
 * propósito: quien modera debe ver quién la escribió (es personal del equipo y
 * lo necesita), pero la etiqueta le recuerda que para la comunidad no tiene
 * nombre, o sea, lo grave que sería filtrarla.
 */
export const demoHeldContent: HeldContentItem[] = [
  {
    caseId: 'held-1',
    kind: 'prayer',
    text: 'Necesito que oren por mi hija. Si alguien puede ayudar con la operación, escríbanme al whatsapp.',
    authorId: 'u-ramon',
    authorName: 'Ramón',
    context: 'Petición de oración · anónima para la comunidad',
    risk: null,
    priority: 'NORMAL',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    caseId: 'held-2',
    kind: 'message',
    text: 'Mejor seguimos por telegram, aquí revisan todo.',
    authorId: 'u-carlos',
    authorName: 'Carlos',
    context: 'Mensaje en una conversación',
    risk: 0.71,
    priority: 'HIGH',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    caseId: 'held-3',
    kind: 'reflection',
    text: 'Este devocional me recordó que tengo que perdonar a mi hermano. Lo llamé.',
    authorId: 'u-lucia',
    authorName: 'Lucía',
    context: 'Reflexión sobre «Colosenses 3:13 · Soportándoos»',
    risk: null,
    priority: 'NORMAL',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
];

/**
 * El calendario de devocionales para el panel en modo demo. Trae reserva para
 * cuatro días a propósito: es el estado que dispara el aviso y el que quien
 * administra tiene que aprender a reconocer.
 */
const demoDay = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);

export const demoDevotionalSchedule: DevotionalSchedule = {
  today: demoDay(0),
  runwayDays: 4,
  items: [
    { id: 'dv-m2', publishOn: demoDay(-2), reference: 'Rut 1:16', title: 'Donde tú vayas', body: 'Rut no eligió un país: eligió una lealtad. Antes de que existiera un futuro claro, hubo alguien dispuesto a quedarse.', question: '¿Con quién te has quedado cuando no era conveniente?', reads: 231, isPast: true, isToday: false },
    { id: 'dv-m1', publishOn: demoDay(-1), reference: '1 Corintios 13:4', title: 'El amor es paciente', body: 'La paciencia es la única virtud que no se puede demostrar rápido. Es la prueba de que lo demás es cierto.', question: '¿En qué se te nota a ti la prisa?', reads: 264, isPast: true, isToday: false },
    { id: 'dv-0', publishOn: demoDay(0), reference: 'Proverbios 4:23', title: 'Guarda tu corazón', body: 'Sobre toda cosa guardada, guarda tu corazón, porque de él mana la vida. Guardar no es cerrar: es saber a quién le abres, y en qué orden.', question: '¿A quién le has abierto el corazón esta semana, y por qué a esa persona?', reads: 312, isPast: false, isToday: true },
    { id: 'dv-1', publishOn: demoDay(1), reference: 'Eclesiastés 4:9', title: 'Mejores son dos', body: 'Mejores son dos que uno, porque tienen mejor paga de su trabajo. No dice que sea más fácil: dice que rinde más.', question: '¿Qué cosa estás cargando solo que no tendrías que cargar solo?', reads: 0, isPast: false, isToday: false },
    { id: 'dv-2', publishOn: demoDay(2), reference: 'Salmo 37:4', title: 'Deléitate', body: 'Los deseos del corazón cambian cuando cambia de qué se deleita el corazón. Ese es el orden, y casi siempre lo invertimos.', question: '¿Qué deseo tuyo ha cambiado en el último año?', reads: 0, isPast: false, isToday: false },
    { id: 'dv-3', publishOn: demoDay(3), reference: 'Filipenses 2:3', title: 'Estimando al otro', body: 'Nada por contienda ni por vanagloria. En una relación, la vanagloria se ve en quién cuenta la historia y cómo queda cada quien en ella.', question: '¿Cómo cuentas tú la última discusión que tuviste?', reads: 0, isPast: false, isToday: false },
  ],
};
