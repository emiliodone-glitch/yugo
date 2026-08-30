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
