/**
 * Ruta de pareja después del sí (RF-REL-05).
 *
 * Casi todas las apps terminan cuando dos personas se dicen que sí. Yugo
 * promete relación con propósito de matrimonio, así que lo que pasa después
 * del noviazgo también es suyo: los pasos que una pareja cristiana suele dar
 * antes de casarse, recursos prematrimoniales que no favorecen a ninguna
 * denominación, y la consejería con la iglesia pedida desde la app con el
 * consentimiento de los dos.
 *
 * Tres reglas que la hacen defendible:
 *
 * 1. **No hay puntaje ni porcentaje.** Los hitos no se cuentan como progreso;
 *    se marcan con fecha porque una pareja quiere recordar cuándo hablaron con
 *    su pastor, no porque le falte un 30 %.
 * 2. **Neutralidad entre denominaciones.** Los recursos generales van para
 *    todos; los específicos aparecen solo si alguno de los dos es de esa
 *    tradición. Una pareja de tradiciones distintas ve las dos, en el mismo
 *    orden que cualquier otra: por tipo, no por iglesia.
 * 3. **La iglesia entra cuando los dos la llaman.** Una petición de consejería
 *    la firma uno, la confirma el otro, y solo entonces la ve el portal.
 */
import { DENOMINATIONS } from '../constants/catalog';
import { STAGE_ORDER, type RelationshipStage } from './stages';

/** A partir de qué etapa existe una ruta. */
export const JOURNEY_FROM: RelationshipStage = 'COURTSHIP';

export function journeyUnlocked(stage: RelationshipStage): boolean {
  return STAGE_ORDER[stage] >= STAGE_ORDER[JOURNEY_FROM];
}

export type MilestoneKey =
  | 'families'
  | 'pastor'
  | 'accompaniment'
  | 'finances_talk'
  | 'premarital'
  | 'wedding_date'
  | 'home'
  | 'budget'
  | 'civil'
  | 'story';

export interface CoupleMilestoneDef {
  key: MilestoneKey;
  /** La etapa a partir de la cual el paso tiene sentido. */
  stage: RelationshipStage;
  title: string;
  why: string;
}

/**
 * Los pasos, en el orden en que suelen darse. Ninguno es obligatorio y la app
 * no reclama los que faltan: son un mapa, no una lista de tareas.
 */
export const COUPLE_MILESTONES: CoupleMilestoneDef[] = [
  {
    key: 'families',
    stage: 'COURTSHIP',
    title: 'Conocer a las dos familias',
    why: 'Un noviazgo que la familia conoce se cuida distinto. Y la familia política empieza aquí.',
  },
  {
    key: 'pastor',
    stage: 'COURTSHIP',
    title: 'Hablar con su pastor o líder',
    why: 'Que la iglesia sepa del noviazgo antes de saber de la boda.',
  },
  {
    key: 'accompaniment',
    stage: 'COURTSHIP',
    title: 'Un matrimonio que los acompañe',
    why: 'Alguien con años de casados a quien preguntarle lo que no se le pregunta a los amigos.',
  },
  {
    key: 'finances_talk',
    stage: 'COURTSHIP',
    title: 'La conversación de dinero',
    why: 'Deudas, sueldos, diezmo y quién paga qué. Es de las primeras razones de conflicto y de las últimas que se hablan.',
  },
  {
    key: 'premarital',
    stage: 'ENGAGED',
    title: 'Consejería prematrimonial',
    why: 'Varias sesiones con su iglesia o con un consejero cristiano antes de la fecha.',
  },
  {
    key: 'wedding_date',
    stage: 'ENGAGED',
    title: 'Fecha y lugar de la boda',
    why: 'Lo que ordena todo lo demás.',
  },
  {
    key: 'home',
    stage: 'ENGAGED',
    title: 'Dónde y cómo van a vivir',
    why: 'Ciudad, casa, con quién y con qué presupuesto. Mejor decidido que asumido.',
  },
  {
    key: 'budget',
    stage: 'ENGAGED',
    title: 'Presupuesto de la boda y del primer año',
    why: 'Una boda que deja deudas empieza el matrimonio cuesta arriba.',
  },
  {
    key: 'civil',
    stage: 'ENGAGED',
    title: 'Papeles del matrimonio civil',
    why: 'Actas, cédulas y la cita en la Oficialía. Toma más semanas de lo que parece.',
  },
  {
    key: 'story',
    stage: 'MARRIED',
    title: 'Contar su historia en Yugo',
    why: 'Si quieren. Otra pareja que hoy duda la va a leer.',
  },
];

/** Los pasos abiertos para una etapa, en orden. */
export function milestonesFor(stage: RelationshipStage): CoupleMilestoneDef[] {
  return COUPLE_MILESTONES.filter((m) => STAGE_ORDER[m.stage] <= STAGE_ORDER[stage]);
}

export type ResourceKind = 'course' | 'book' | 'guide' | 'talk';

export interface PremaritalResource {
  id: string;
  title: string;
  kind: ResourceKind;
  /** Quién lo hace o lo escribió. */
  by: string;
  /** Slugs de denominación a las que pertenece, o 'all' si sirve para todas. */
  denominations: string[] | 'all';
  summary: string;
  url?: string;
}

/**
 * Catálogo inicial. Sin enlaces a tiendas: la pareja lo busca con su iglesia
 * o su librería, y Yugo no gana nada por recomendar uno u otro.
 */
export const PREMARITAL_RESOURCES: PremaritalResource[] = [
  {
    id: 'church-counseling',
    title: 'Consejería prematrimonial de su propia iglesia',
    kind: 'course',
    by: 'Su congregación',
    denominations: 'all',
    summary:
      'Casi todas las iglesias la ofrecen y muchas la piden antes de casar. Se puede solicitar desde aquí, con el sí de los dos.',
  },
  {
    id: 'prepare-enrich',
    title: 'Inventario PREPARE/ENRICH',
    kind: 'course',
    by: 'Life Innovations, con facilitador certificado',
    denominations: 'all',
    summary:
      'Cuestionario que cada uno contesta por separado y un facilitador comenta en pareja. Interdenominacional; lo usan iglesias de casi todas las tradiciones.',
  },
  {
    id: 'five-languages',
    title: 'Los cinco lenguajes del amor',
    kind: 'book',
    by: 'Gary Chapman',
    denominations: 'all',
    summary: 'Cómo cada uno da y recibe cariño. Corto, y sirve para hablar de lo que cuesta pedir.',
  },
  {
    id: 'saving-marriage',
    title: 'Asegure el éxito en su matrimonio antes de casarse',
    kind: 'book',
    by: 'Les y Leslie Parrott',
    denominations: ['evangelica', 'bautista', 'metodista', 'menonita'],
    summary: 'Siete preguntas para antes de la boda, con cuadernos para él y para ella.',
  },
  {
    id: 'pre-cana',
    title: 'Curso prematrimonial parroquial',
    kind: 'course',
    by: 'Su parroquia o diócesis',
    denominations: ['catolica'],
    summary:
      'Requisito para el sacramento. Se coordina con la parroquia donde se van a casar, con meses de anticipación.',
  },
  {
    id: 'adventist-family',
    title: 'Ministerio de la Familia: preparación para el matrimonio',
    kind: 'course',
    by: 'Asociación local adventista',
    denominations: ['adventista'],
    summary:
      'Encuentros de preparación que organiza la asociación; pregunte en su iglesia por las fechas.',
  },
  {
    id: 'pentecostal-pastoral',
    title: 'Consejería pastoral y curso de novios',
    kind: 'course',
    by: 'Su pastor',
    denominations: ['pentecostal', 'iglesia-de-dios', 'asambleas-de-dios'],
    summary:
      'En estas tradiciones la preparación la lleva el pastor directamente; suele incluir varias citas y una charla a las familias.',
  },
  {
    id: 'money-talk',
    title: 'Guía: la conversación de dinero antes de casarse',
    kind: 'guide',
    by: 'Yugo',
    denominations: 'all',
    summary:
      'Diez preguntas concretas: deudas, ingresos, diezmo, ahorro, cuentas juntas o separadas, y qué pasa si uno pierde el trabajo.',
  },
];

const KIND_ORDER: Record<ResourceKind, number> = { course: 0, guide: 1, book: 2, talk: 3 };

/** Convierte nombre o slug de denominación en slug; null si no se reconoce. */
export function denominationSlug(value: string | null | undefined): string | null {
  if (!value) return null;
  const needle = value.trim().toLowerCase();
  const hit = DENOMINATIONS.find((d) => d.slug === needle || d.name.toLowerCase() === needle);
  return hit?.slug ?? null;
}

export interface ResourcesForCouple {
  /** Los de su tradición (o tradiciones), ordenados por tipo. */
  forYou: PremaritalResource[];
  /** Los que sirven a cualquier pareja, ordenados por tipo. */
  general: PremaritalResource[];
}

/**
 * Qué recursos ver, dadas las denominaciones de los dos.
 *
 * El orden es por tipo (curso, guía, libro, charla) y después por el orden del
 * catálogo: nunca por denominación, para que una pareja de dos tradiciones no
 * vea la de uno «primero».
 */
export function resourcesFor(
  denominations: Array<string | null | undefined>,
  catalog: PremaritalResource[] = PREMARITAL_RESOURCES,
): ResourcesForCouple {
  const slugs = new Set(denominations.map(denominationSlug).filter((s): s is string => !!s));
  const byKind = (a: PremaritalResource, b: PremaritalResource) =>
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  const forYou = catalog
    .filter((r) => r.denominations !== 'all' && r.denominations.some((s) => slugs.has(s)))
    .sort(byKind);
  const general = catalog.filter((r) => r.denominations === 'all').sort(byKind);
  return { forYou, general };
}

/** Estado de una petición de consejería, tal como lo devuelve la API. */
export type CounselingStatus = 'PENDING_PARTNER' | 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'CLOSED';
