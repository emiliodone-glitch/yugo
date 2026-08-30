/**
 * Seed catalogs. All of these are administrable from the admin panel
 * (RF-ADM-07); these constants feed `prisma/seed.ts` and the demo fixtures.
 * Labels are the Spanish (es-DO) strings shown in the UI.
 */

export interface DenominationSeed {
  slug: string;
  name: string;
  family: string;
}

/** Common denominations in República Dominicana. */
export const DENOMINATIONS: DenominationSeed[] = [
  { slug: 'evangelica', name: 'Evangélica', family: 'evangelica' },
  { slug: 'bautista', name: 'Bautista', family: 'evangelica' },
  { slug: 'pentecostal', name: 'Pentecostal', family: 'pentecostal' },
  { slug: 'adventista', name: 'Adventista', family: 'adventista' },
  { slug: 'catolica', name: 'Católica', family: 'catolica' },
  { slug: 'metodista', name: 'Metodista', family: 'evangelica' },
  { slug: 'menonita', name: 'Menonita', family: 'evangelica' },
  { slug: 'iglesia-de-dios', name: 'Iglesia de Dios', family: 'pentecostal' },
  { slug: 'asambleas-de-dios', name: 'Asambleas de Dios', family: 'pentecostal' },
  { slug: 'otra', name: 'Otra denominación cristiana', family: 'otra' },
];

/**
 * Initial symmetric affinity matrix (0–100) between denominations, keyed by
 * slug pair. Same denomination = 100 (implicit). Neutral and administrable;
 * adjusted with feedback from allied churches (7.1).
 */
export const DENOMINATION_AFFINITY_SEED: Array<[string, string, number]> = [
  ['evangelica', 'bautista', 80],
  ['evangelica', 'pentecostal', 75],
  ['evangelica', 'adventista', 50],
  ['evangelica', 'catolica', 40],
  ['evangelica', 'metodista', 75],
  ['evangelica', 'menonita', 65],
  ['evangelica', 'iglesia-de-dios', 70],
  ['evangelica', 'asambleas-de-dios', 70],
  ['evangelica', 'otra', 60],
  ['bautista', 'pentecostal', 65],
  ['bautista', 'adventista', 50],
  ['bautista', 'catolica', 40],
  ['bautista', 'metodista', 70],
  ['bautista', 'menonita', 65],
  ['bautista', 'iglesia-de-dios', 60],
  ['bautista', 'asambleas-de-dios', 60],
  ['bautista', 'otra', 60],
  ['pentecostal', 'adventista', 45],
  ['pentecostal', 'catolica', 35],
  ['pentecostal', 'metodista', 60],
  ['pentecostal', 'menonita', 50],
  ['pentecostal', 'iglesia-de-dios', 85],
  ['pentecostal', 'asambleas-de-dios', 85],
  ['pentecostal', 'otra', 60],
  ['adventista', 'catolica', 35],
  ['adventista', 'metodista', 45],
  ['adventista', 'menonita', 45],
  ['adventista', 'iglesia-de-dios', 45],
  ['adventista', 'asambleas-de-dios', 45],
  ['adventista', 'otra', 50],
  ['catolica', 'metodista', 45],
  ['catolica', 'menonita', 35],
  ['catolica', 'iglesia-de-dios', 35],
  ['catolica', 'asambleas-de-dios', 35],
  ['catolica', 'otra', 50],
  ['metodista', 'menonita', 60],
  ['metodista', 'iglesia-de-dios', 55],
  ['metodista', 'asambleas-de-dios', 55],
  ['metodista', 'otra', 60],
  ['menonita', 'iglesia-de-dios', 50],
  ['menonita', 'asambleas-de-dios', 50],
  ['menonita', 'otra', 55],
  ['iglesia-de-dios', 'asambleas-de-dios', 80],
  ['iglesia-de-dios', 'otra', 60],
  ['asambleas-de-dios', 'otra', 60],
];

/** Practices and service areas (RF-PER-05). */
export const SERVICE_AREAS: Array<{ slug: string; name: string }> = [
  { slug: 'oracion', name: 'Oración' },
  { slug: 'estudio-biblico', name: 'Estudio bíblico' },
  { slug: 'ayuno', name: 'Ayuno' },
  { slug: 'alabanza', name: 'Alabanza' },
  { slug: 'misiones', name: 'Misiones' },
  { slug: 'servicio-social', name: 'Servicio social' },
  { slug: 'jovenes', name: 'Jóvenes' },
  { slug: 'ninos', name: 'Niños' },
  { slug: 'medios', name: 'Medios y sonido' },
  { slug: 'evangelismo', name: 'Evangelismo' },
  { slug: 'intercesion', name: 'Intercesión' },
  { slug: 'danza', name: 'Danza y artes' },
];

/** Group categories (RF-COM-01). */
export const GROUP_CATEGORIES: Array<{ slug: string; name: string }> = [
  { slug: 'jovenes-adultos', name: 'Jóvenes adultos' },
  { slug: 'alabanza', name: 'Alabanza y músicos' },
  { slug: 'misiones', name: 'Misiones y servicio social' },
  { slug: 'estudio-biblico', name: 'Estudio bíblico' },
  { slug: 'deportes', name: 'Deportes' },
  { slug: 'emprendimiento', name: 'Emprendimiento' },
  { slug: 'profesionales', name: 'Profesionales' },
  { slug: 'ciudad', name: 'Por ciudad' },
];

/** Event types (RF-EVE-01). */
export const EVENT_TYPES: Array<{ slug: string; name: string }> = [
  { slug: 'CULTO_ESPECIAL', name: 'Culto especial' },
  { slug: 'VIGILIA', name: 'Vigilia' },
  { slug: 'RETIRO', name: 'Retiro' },
  { slug: 'CONCIERTO', name: 'Concierto' },
  { slug: 'CONGRESO', name: 'Congreso' },
  { slug: 'ACTIVIDAD_SOCIAL', name: 'Actividad social' },
  { slug: 'SERVICIO_COMUNITARIO', name: 'Servicio comunitario' },
];

/** Report categories (RF-CON-07, RF-SEG-03). */
export const REPORT_CATEGORIES: Array<{ slug: string; name: string; critical?: boolean }> = [
  { slug: 'INAPPROPRIATE', name: 'Contenido inapropiado' },
  { slug: 'SCAM', name: 'Sospecha de estafa' },
  { slug: 'FAKE_IDENTITY', name: 'Identidad falsa' },
  { slug: 'HARASSMENT', name: 'Acoso', critical: true },
  { slug: 'MISLEADING', name: 'No es cristiano / perfil engañoso' },
  { slug: 'UNDERAGE', name: 'Posible menor de edad', critical: true },
];

/** Covenant of conduct v1.0 (RF-AUT-04, RF-SEG-01). */
export const COVENANT_V1 = {
  version: '1.0',
  points: [
    'Soy cristiano y mayor de 18 años; mi perfil dice la verdad sobre mí.',
    'Trato a los demás con respeto; no envío contenido sexual ni ofensivo.',
    'No pido dinero ni uso la plataforma para negocios o proselitismo.',
    'Respeto a quienes pertenecen a otra denominación.',
    'Entiendo que incumplir el pacto puede suspender mi cuenta.',
  ],
};

/**
 * Conversation questions (RF-PER-09): short answers that give context for the
 * icebreakers. Administrable from the panel like the rest of the catalogs.
 */
export const CONVERSATION_QUESTIONS: Array<{ key: string; question: string; maxLength: number }> = [
  { key: 'gratitude', question: 'Lo que más agradezco a Dios este año…', maxLength: 200 },
  { key: 'sunday', question: 'Un domingo perfecto para mí es…', maxLength: 200 },
  { key: 'serving', question: 'Sirvo en mi iglesia porque…', maxLength: 200 },
  { key: 'growth', question: 'En lo que Dios está trabajando en mí ahora…', maxLength: 200 },
  { key: 'family', question: 'La familia que quiero construir…', maxLength: 200 },
  { key: 'worship', question: 'La canción que no falta en mi adoración…', maxLength: 120 },
  { key: 'book', question: 'El libro de la Biblia al que siempre vuelvo…', maxLength: 120 },
  { key: 'weekend', question: 'Mi plan favorito para un sábado libre…', maxLength: 200 },
];

/**
 * Safety tips shown when a first connection is created and before a first
 * meeting (RF-SEG-06). Administrable from the panel as versioned content.
 */
export const SAFETY_TIPS_V1 = {
  version: '1.0',
  firstConnection: {
    title: 'Antes de un primer encuentro',
    points: [
      'Reúnanse en un lugar público y concurrido la primera vez.',
      'Avisa a alguien de confianza dónde estarás y con quién.',
      'Llega y regresa por tus propios medios.',
      'No compartas datos financieros, contraseñas ni copias de tu cédula.',
      'Si alguien te pide dinero o te presiona, repórtalo desde el chat.',
    ],
  },
  scamWarning: {
    title: 'Cuidado con las estafas',
    points: [
      'Desconfía de quien pide dinero, inversiones o "ayuda urgente".',
      'Sospecha si insisten en moverse a otra aplicación en los primeros mensajes.',
      'Yugo nunca te pedirá tu contraseña ni datos bancarios.',
    ],
  },
};

/** Legal documents seeded at v1.0 (RF-SEG-08, RF-ADM-10). */
export const TERMS_V1 = {
  version: '1.0',
  sections: [
    {
      title: 'Quién puede usar Yugo',
      body: 'Yugo es exclusivamente para personas mayores de 18 años. Al registrarte declaras que la fecha de nacimiento que proporcionas es verdadera. Detectar una cuenta de una persona menor de edad implica su eliminación inmediata.',
    },
    {
      title: 'Tu cuenta',
      body: 'Eres responsable de la veracidad de tu perfil y de mantener segura tu contraseña. Una cuenta por persona; no se permite suplantar a nadie.',
    },
    {
      title: 'Conducta',
      body: 'El Pacto de conducta forma parte de estos términos. Incumplirlo puede resultar en advertencia, suspensión temporal o expulsión permanente.',
    },
    {
      title: 'Suscripciones',
      body: 'Yugo Plus y Yugo Oro se renuevan automáticamente hasta que canceles. Puedes cancelar en cualquier momento y conservas el acceso hasta el fin del período pagado. Las compras hechas en App Store o Google Play se gestionan según las políticas de esas tiendas.',
    },
    {
      title: 'Contenido',
      body: 'Conservas los derechos sobre tus fotos y textos; nos otorgas licencia para mostrarlos dentro de la plataforma. Todo contenido pasa por moderación antes de publicarse o entregarse.',
    },
    {
      title: 'Eliminación',
      body: 'Puedes eliminar tu cuenta desde la aplicación en cualquier momento. Tienes 14 días de gracia para arrepentirte; luego los datos se borran definitivamente.',
    },
  ],
};

export const PRIVACY_V1 = {
  version: '1.0',
  law: 'Ley 172-13 de Protección de Datos Personales de República Dominicana',
  sections: [
    {
      title: 'Qué datos recogemos',
      body: 'Datos de contacto (correo o teléfono), fecha de nacimiento, datos del perfil que decides completar (incluida tu denominación e iglesia), fotos, ubicación aproximada, mensajes y datos de uso y pago.',
    },
    {
      title: 'Para qué los usamos',
      body: 'Para crear tu perfil, calcular tu afinidad de fe, mostrarte personas y eventos cercanos, moderar contenido, prevenir fraude y procesar tu suscripción.',
    },
    {
      title: 'Con quién los compartimos',
      body: 'Con proveedores que nos prestan servicio (almacenamiento, moderación asistida por IA, notificaciones, pagos) bajo acuerdos de confidencialidad. Tu iglesia solo ve que estás respaldado por ella: nunca tu actividad de citas.',
    },
    {
      title: 'Tus derechos',
      body: 'Puedes acceder a tus datos, rectificarlos, eliminarlos y oponerte a su tratamiento. La descarga de tus datos está disponible desde Privacidad y seguridad en la aplicación.',
    },
    {
      title: 'Conservación',
      body: 'Conservamos tus datos mientras tu cuenta esté activa. Tras eliminarla, se borran a los 14 días, salvo los registros de seguridad y sanciones que la ley permite retener de forma anonimizada.',
    },
    {
      title: 'Contacto',
      body: 'Para ejercer tus derechos escribe a privacidad@yugo.do.',
    },
  ],
};

/** Attendance frequency options (RF-PER-03). */
export const ATTENDANCE_OPTIONS = [
  { value: 'WEEKLY', label: 'Cada semana' },
  { value: 'BIWEEKLY', label: 'Cada dos semanas' },
  { value: 'MONTHLY', label: 'Una vez al mes' },
  { value: 'OCCASIONAL', label: 'Ocasionalmente' },
] as const;

/** Dominican provinces (subset used by seeds and pickers). */
export const PROVINCES = [
  'Distrito Nacional',
  'Santo Domingo',
  'Santiago',
  'La Vega',
  'San Cristóbal',
  'Puerto Plata',
  'La Romana',
  'San Pedro de Macorís',
  'Duarte',
  'La Altagracia',
];
