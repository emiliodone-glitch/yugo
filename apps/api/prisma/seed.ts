/* eslint-disable no-console */
/**
 * Seeds (Hito 1): Dominican denominations + initial affinity matrix, service
 * areas, group/event catalogs, report reasons, covenant v1.0, default
 * settings, 3 sample churches, 40 fictional profiles and 10 events.
 *
 * Run with: pnpm --filter @yugo/api db:seed
 */
import { PrismaClient, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  COVENANT_V1,
  DEFAULT_AFFINITY_WEIGHTS,
  DEFAULT_PRICES,
  DENOMINATIONS,
  DENOMINATION_AFFINITY_SEED,
  EVENT_TYPES,
  GROUP_CATEGORIES,
  LIMITS,
  PRIVACY_V1,
  SAFETY_TIPS_V1,
  SERVICE_AREAS,
  SETTING_KEYS,
  TERMS_V1,
} from '@yugo/shared';

const prisma = new PrismaClient();

// Deterministic pseudo-random so the seed is reproducible.
let randState = 42;
function rand(): number {
  randState = (randState * 1103515245 + 12345) % 2147483648;
  return randState / 2147483648;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}
function pickMany<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  }
  return out;
}

const FEMALE_NAMES = [
  'Mariel', 'Daniela', 'Sarah', 'Priscila', 'Ana Lucía', 'Esther', 'Raquel', 'Noemí',
  'Abigail', 'Damaris', 'Keila', 'Yokasta', 'Rosanna', 'Militza', 'Carolina', 'Génesis',
  'Pamela', 'Betania', 'Lía', 'Marta',
];
const MALE_NAMES = [
  'Emilio', 'José Miguel', 'Raúl', 'Samuel', 'David', 'Josué', 'Caleb', 'Elías',
  'Manuel', 'Pedro', 'Isaí', 'Natanael', 'Moisés', 'Aarón', 'Jonás', 'Esteban',
  'Marcos', 'Andrés', 'Felipe', 'Tomás',
];
const OCCUPATIONS = [
  'Contadora', 'Enfermera', 'Maestra', 'Diseñador gráfico', 'Ingeniero civil', 'QA Analyst',
  'Médico', 'Abogada', 'Emprendedor', 'Psicóloga', 'Chef', 'Arquitecta', 'Electricista',
  'Comunicadora', 'Programador',
];
const CITIES: Array<{ city: string; province: string; lat: number; lng: number }> = [
  { city: 'Santo Domingo', province: 'Distrito Nacional', lat: 18.4861, lng: -69.9312 },
  { city: 'Santo Domingo Este', province: 'Santo Domingo', lat: 18.4885, lng: -69.8571 },
  { city: 'Santiago', province: 'Santiago', lat: 19.4517, lng: -70.697 },
  { city: 'La Vega', province: 'La Vega', lat: 19.2226, lng: -70.5297 },
  { city: 'San Cristóbal', province: 'San Cristóbal', lat: 18.4163, lng: -70.1093 },
];
const TESTIMONIES = [
  'Sirvo en mi iglesia desde adolescente y creo que la fidelidad de Dios se ve en lo pequeño de cada día.',
  'Llegué a los pies de Cristo en la universidad. Hoy dirijo un grupo de estudio bíblico en mi barrio.',
  'La música me acercó a Dios; canto en el coro y quiero formar una familia que adore junta.',
  'Después de años enfocado en mi carrera, entendí que el propósito pesa más que el éxito.',
  'Crecí en la iglesia, pero mi fe se hizo propia a los 22. Amo servir y los retiros de montaña.',
];
const VERSES = ['Rut 1:16', 'Salmos 37:4', 'Proverbios 3:5-6', 'Filipenses 4:13', 'Jeremías 29:11', 'Eclesiastés 4:9'];

async function main() {
  console.log('Seeding Yugo…');

  // --- Catalogs -------------------------------------------------------------
  const denomBySlug = new Map<string, string>();
  for (const d of DENOMINATIONS) {
    const row = await prisma.denomination.upsert({
      where: { slug: d.slug },
      update: { name: d.name, family: d.family },
      create: { slug: d.slug, name: d.name, family: d.family },
    });
    denomBySlug.set(d.slug, row.id);
  }
  for (const [a, b, value] of DENOMINATION_AFFINITY_SEED) {
    const aId = denomBySlug.get(a)!;
    const bId = denomBySlug.get(b)!;
    const [lo, hi] = aId < bId ? [aId, bId] : [bId, aId];
    await prisma.denominationAffinity.upsert({
      where: { aId_bId: { aId: lo, bId: hi } },
      update: { value },
      create: { aId: lo, bId: hi, value },
    });
  }

  const areaBySlug = new Map<string, string>();
  for (const s of SERVICE_AREAS) {
    const row = await prisma.serviceArea.upsert({
      where: { slug: s.slug },
      update: { name: s.name },
      create: { slug: s.slug, name: s.name },
    });
    areaBySlug.set(s.slug, row.id);
  }

  const categoryBySlug = new Map<string, string>();
  for (const c of GROUP_CATEGORIES) {
    const row = await prisma.groupCategory.upsert({
      where: { slug: c.slug },
      update: { name: c.name },
      create: { slug: c.slug, name: c.name },
    });
    categoryBySlug.set(c.slug, row.id);
  }

  // --- Legal: covenant, terms, privacy, safety tips (RF-SEG-01/08, RF-ADM-10) --
  const legalDocuments: Array<{ kind: string; version: string; body: Prisma.InputJsonValue }> = [
    { kind: 'COVENANT', version: COVENANT_V1.version, body: { points: COVENANT_V1.points } },
    { kind: 'TERMS', version: TERMS_V1.version, body: { sections: TERMS_V1.sections } },
    {
      kind: 'PRIVACY',
      version: PRIVACY_V1.version,
      body: { law: PRIVACY_V1.law, sections: PRIVACY_V1.sections },
    },
    {
      kind: 'SAFETY_TIPS',
      version: SAFETY_TIPS_V1.version,
      body: {
        firstConnection: SAFETY_TIPS_V1.firstConnection,
        scamWarning: SAFETY_TIPS_V1.scamWarning,
      },
    },
  ];
  for (const document of legalDocuments) {
    await prisma.legalDocument.upsert({
      where: { kind_version: { kind: document.kind, version: document.version } },
      update: { body: document.body },
      create: document,
    });
  }

  // --- Default settings (RF-ADM-08) ------------------------------------------
  const settings: Array<[string, Prisma.InputJsonValue]> = [
    [SETTING_KEYS.AFFINITY_WEIGHTS, DEFAULT_AFFINITY_WEIGHTS],
    [
      SETTING_KEYS.LIMITS,
      {
        dailyInterestsFree: LIMITS.DAILY_INTERESTS_FREE,
        discoverPerDayFree: LIMITS.DISCOVER_PER_DAY_FREE,
        discoverPerDayOro: LIMITS.DISCOVER_PER_DAY_ORO,
        undoPassPerDayOro: LIMITS.UNDO_PASS_PER_DAY_ORO,
        passHideDays: LIMITS.PASS_HIDE_DAYS,
        reconnectCooldownDays: LIMITS.RECONNECT_COOLDOWN_DAYS,
        inactivityHideDays: LIMITS.INACTIVITY_HIDE_DAYS,
        minCompleteness: LIMITS.MIN_COMPLETENESS_FOR_DISCOVER,
        ageRangeDefaultOffsets: [
          LIMITS.AGE_RANGE_DEFAULT_OFFSET_MIN,
          LIMITS.AGE_RANGE_DEFAULT_OFFSET_MAX,
        ],
        ageRangeMinSpan: LIMITS.AGE_RANGE_MIN_SPAN,
        level3PositionBonus: LIMITS.LEVEL3_POSITION_BONUS,
      },
    ],
    [
      SETTING_KEYS.MODERATION_THRESHOLDS,
      {
        hold: LIMITS.MODERATION_HOLD_THRESHOLD,
        reject: LIMITS.MODERATION_REJECT_THRESHOLD,
        rejectionsForWarning: LIMITS.REJECTIONS_FOR_WARNING,
        rejectionWindowDays: LIMITS.REJECTION_WINDOW_DAYS,
      },
    ],
    [SETTING_KEYS.COVENANT_VERSION, COVENANT_V1.version],
    [SETTING_KEYS.PRICES, DEFAULT_PRICES as unknown as Prisma.InputJsonValue],
  ];
  for (const [key, value] of settings) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // --- Churches ---------------------------------------------------------------
  const churches = [
    {
      name: 'Iglesia Monte de Sion',
      slugDen: 'evangelica',
      city: 'Santo Domingo Este',
      address: 'Av. San Vicente de Paúl 45, Santo Domingo Este',
      lat: 18.4885,
      lng: -69.8571,
      contactName: 'Pastor Luis Reyes',
      contactEmail: 'contacto@montedesion.do',
    },
    {
      name: 'Iglesia Bíblica Emanuel',
      slugDen: 'bautista',
      city: 'Santo Domingo',
      address: 'C. Josefa Brea 112, Santo Domingo',
      lat: 18.472,
      lng: -69.912,
      contactName: 'Pastora Carmen Núñez',
      contactEmail: 'oficina@ibemanuel.do',
    },
    {
      name: 'Centro Cristiano Vida Nueva',
      slugDen: 'pentecostal',
      city: 'Santiago',
      address: 'Av. Estrella Sadhalá 88, Santiago',
      lat: 19.4517,
      lng: -70.697,
      contactName: 'Pastor Rafael Peña',
      contactEmail: 'info@vidanueva.do',
    },
  ];
  const churchIds: string[] = [];
  for (const c of churches) {
    const existing = await prisma.church.findFirst({ where: { name: c.name } });
    const row =
      existing ??
      (await prisma.church.create({
        data: {
          name: c.name,
          denominationId: denomBySlug.get(c.slugDen),
          city: c.city,
          address: c.address,
          lat: c.lat,
          lng: c.lng,
          status: 'APPROVED',
          approvedAt: new Date(),
          contactName: c.contactName,
          contactEmail: c.contactEmail,
        },
      }));
    churchIds.push(row.id);
  }

  // --- Admin + demo member ----------------------------------------------------
  const password = await argon2.hash('Yugo.demo1');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@yugo.do' },
    update: {},
    create: {
      email: 'admin@yugo.do',
      passwordHash: password,
      role: 'SUPERADMIN',
      birthDate: new Date('1990-01-15'),
      gender: 'MALE',
      emailVerifiedAt: new Date(),
      covenantAcceptedAt: new Date(),
      covenantVersion: COVENANT_V1.version,
      twoFactorEnabled: true,
    },
  });
  console.log(`Admin: admin@yugo.do / Yugo.demo1 (${admin.id})`);

  // --- 40 fictional member profiles -------------------------------------------
  const denomSlugs = DENOMINATIONS.map((d) => d.slug);
  const areaSlugs = SERVICE_AREAS.map((a) => a.slug);
  const memberIds: string[] = [];

  for (let i = 0; i < 40; i += 1) {
    const female = i % 2 === 0;
    const name = female ? FEMALE_NAMES[i / 2] : MALE_NAMES[(i - 1) / 2];
    const email = `demo${i + 1}@yugo.do`;
    const age = 22 + Math.floor(rand() * 20); // 22–41
    const birthYear = new Date().getFullYear() - age;
    const cityInfo = pick(CITIES);
    const denomSlug = pick(denomSlugs.slice(0, 9));
    const church = rand() < 0.6 ? churchIds[Math.floor(rand() * churchIds.length)] : null;
    const intention = rand() < 0.6 ? 'MARRIAGE' : rand() < 0.5 ? 'BOTH' : 'FRIENDSHIP';

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: password,
        role: 'MEMBER',
        birthDate: new Date(`${birthYear}-0${1 + Math.floor(rand() * 9)}-1${Math.floor(rand() * 9)}`),
        gender: female ? 'FEMALE' : 'MALE',
        emailVerifiedAt: new Date(),
        covenantAcceptedAt: new Date(),
        covenantVersion: COVENANT_V1.version,
        profile: {
          create: {
            displayName: name,
            city: cityInfo.city,
            province: cityInfo.province,
            lat: cityInfo.lat + (rand() - 0.5) * 0.15,
            lng: cityInfo.lng + (rand() - 0.5) * 0.15,
            occupation: pick(OCCUPATIONS),
            testimony: pick(TESTIMONIES),
            verse: pick(VERSES),
            denominationId: denomBySlug.get(denomSlug),
            churchId: church,
            yearsInFaith: 1 + Math.floor(rand() * 20),
            attendance: pick(['WEEKLY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'OCCASIONAL'] as const),
            intention: intention as 'MARRIAGE' | 'BOTH' | 'FRIENDSHIP',
            openness: pick(['SAME', 'AFFINE', 'AFFINE', 'ALL'] as const),
            hasChildren: rand() < 0.2,
            completeness: 60 + Math.floor(rand() * 40),
            ageMin: Math.max(18, age - 5),
            ageMax: age + 7,
            maxDistanceKm: pick([25, 50, 100, 150] as const),
            serviceAreas: {
              create: pickMany(areaSlugs, 2 + Math.floor(rand() * 3)).map((slug) => ({
                serviceAreaId: areaBySlug.get(slug)!,
              })),
            },
          },
        },
        verifications: {
          create: [
            { level: 1, method: 'OTP', status: 'APPROVED', resolvedAt: new Date() },
            ...(rand() < 0.55
              ? [{ level: 2, method: 'SELFIE' as const, status: 'APPROVED' as const, similarity: 0.9, livenessPassed: true, resolvedAt: new Date() }]
              : []),
            ...(church && rand() < 0.5
              ? [{ level: 3, method: 'CHURCH_CODE' as const, status: 'APPROVED' as const, churchId: church, resolvedAt: new Date() }]
              : []),
          ],
        },
      },
    });
    memberIds.push(user.id);
  }
  console.log(`Members: ${memberIds.length} (demo1@yugo.do … demo40@yugo.do / Yugo.demo1)`);

  // --- Groups -------------------------------------------------------------------
  const groupsData = [
    { name: 'Jóvenes adultos SDE', cat: 'jovenes-adultos', type: 'OFFICIAL' as const, church: churchIds[0], city: 'Santo Domingo Este' },
    { name: 'Misiones y servicio social', cat: 'misiones', type: 'OPEN' as const, church: null, city: 'Santo Domingo' },
    { name: 'Alabanza y músicos', cat: 'alabanza', type: 'APPROVAL' as const, church: null, city: 'Santo Domingo' },
    { name: 'Profesionales con propósito', cat: 'profesionales', type: 'OPEN' as const, church: null, city: 'Distrito Nacional' },
  ];
  const groupIds: string[] = [];
  for (const g of groupsData) {
    const existing = await prisma.group.findFirst({ where: { name: g.name } });
    const row =
      existing ??
      (await prisma.group.create({
        data: {
          name: g.name,
          description: `Grupo de ${g.name} en Yugo.`,
          categoryId: categoryBySlug.get(g.cat),
          city: g.city,
          type: g.type,
          status: 'ACTIVE',
          churchId: g.church,
          ownerId: memberIds[0],
          members: {
            create: pickMany(memberIds, 10 + Math.floor(rand() * 15)).map((userId, idx) => ({
              userId,
              role: idx === 0 ? 'ADMIN' : 'MEMBER',
            })),
          },
        },
      }));
    groupIds.push(row.id);
  }

  const prayerPost = await prisma.post.findFirst({ where: { isPrayerRequest: true } });
  if (!prayerPost) {
    await prisma.post.create({
      data: {
        groupId: groupIds[0],
        authorId: memberIds[3],
        body: 'Petición: mi mamá entra a cirugía el martes. Les agradezco sus oraciones 🙏',
        isPrayerRequest: true,
        moderationStatus: 'APPROVED',
        reactions: {
          create: pickMany(memberIds, 12).map((userId, i) => ({
            userId,
            type: i < 9 ? 'PRAYING' : 'AMEN',
          })),
        },
      },
    });
    await prisma.groupActivity.create({
      data: {
        groupId: groupIds[1],
        title: 'Jornada de limpieza en Los Cacaos',
        startsAt: new Date(Date.now() + 12 * 86400000),
        place: 'Los Cacaos, San Cristóbal',
        attendances: { create: pickMany(memberIds, 8).map((userId) => ({ userId })) },
      },
    });
  }

  // --- 10 events ------------------------------------------------------------------
  const eventTitles: Array<{ title: string; type: string; church: number; days: number; cost?: number }> = [
    { title: 'Noche de adoración de jóvenes adultos', type: 'VIGILIA', church: 0, days: 6 },
    { title: 'Congreso de solteros con propósito', type: 'CONGRESO', church: 2, days: 7, cost: 500 },
    { title: 'Desayuno solidario en Villa Altagracia', type: 'SERVICIO_COMUNITARIO', church: 0, days: 8 },
    { title: 'Concierto de adoración: Un solo corazón', type: 'CONCIERTO', church: 1, days: 14, cost: 300 },
    { title: 'Retiro de jóvenes en Jarabacoa', type: 'RETIRO', church: 1, days: 20, cost: 2500 },
    { title: 'Culto especial de acción de gracias', type: 'CULTO_ESPECIAL', church: 0, days: 10 },
    { title: 'Vigilia de fin de mes', type: 'VIGILIA', church: 2, days: 28 },
    { title: 'Tarde deportiva interiglesias', type: 'ACTIVIDAD_SOCIAL', church: 2, days: 16 },
    { title: 'Estudio bíblico abierto: Rut', type: 'CULTO_ESPECIAL', church: 1, days: 4 },
    { title: 'Operación abrigo: invierno solidario', type: 'SERVICIO_COMUNITARIO', church: 1, days: 34 },
  ];
  const existingEvents = await prisma.event.count();
  if (existingEvents === 0) {
    for (const e of eventTitles) {
      const church = churches[e.church];
      await prisma.event.create({
        data: {
          churchId: churchIds[e.church],
          title: e.title,
          description: `${e.title} — organizado por ${church.name}. ¡Trae a un amigo!`,
          type: e.type as never,
          startsAt: new Date(Date.now() + e.days * 86400000),
          address: church.address,
          city: church.city,
          lat: church.lat + (rand() - 0.5) * 0.02,
          lng: church.lng + (rand() - 0.5) * 0.02,
          costAmount: e.cost ? new Prisma.Decimal(e.cost) : null,
          costCurrency: e.cost ? 'DOP' : null,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          featured: e.days === 6,
          qrToken: `qr-${e.church}-${e.days}-${Math.floor(rand() * 1e9)}`,
          attendances: {
            create: pickMany(memberIds, 5 + Math.floor(rand() * 20)).map((userId) => ({
              userId,
              status: rand() < 0.6 ? 'GOING' : 'INTERESTED',
            })),
          },
        },
      });
    }
  }
  console.log(`Events: ${await prisma.event.count()}`);

  // --- Endorsement codes for the first church (RF-VER-02) -------------------------
  const codes = await prisma.endorsementCode.count({ where: { churchId: churchIds[0] } });
  if (codes === 0) {
    await prisma.endorsementCode.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        churchId: churchIds[0],
        code: `SION-${String(1000 + i)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        expiresAt: new Date(Date.now() + LIMITS.ENDORSEMENT_CODE_TTL_DAYS * 86400000),
      })),
    });
  }

  // --- Encuentro convocado por el ministerio de solteros -------------------------
  // Con cupo pequeño a propósito: sin un encuentro que se llene, la lista de
  // espera y la regla del aforo no se pueden ver en una base recién sembrada.
  const singlesEncounter = await prisma.event.findFirst({ where: { audience: 'SINGLES' } });
  if (!singlesEncounter) {
    await prisma.event.create({
      data: {
        churchId: churchIds[0],
        title: 'Café y conversación: noviazgo con propósito',
        description:
          'Una noche del ministerio de solteros para hablar de relaciones con propósito, con espacio para preguntas.',
        type: 'ACTIVIDAD_SOCIAL',
        audience: 'SINGLES',
        startsAt: new Date(Date.now() + 18 * 86400000),
        address: 'Salón parroquial, Av. Independencia 120',
        city: 'Santo Domingo',
        lat: 18.4655,
        lng: -69.9312,
        capacity: 24,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        qrToken: `qr-solteros-${Math.floor(rand() * 1e9)}`,
        attendances: {
          create: pickMany(memberIds, 24).map((userId) => ({ userId, status: 'GOING' as const })),
        },
      },
    });
  }

  // --- Un matrimonio que acompaña (RF-VER-02 nivel 3) ----------------------------
  const mentorUserId = (
    await prisma.verification.findFirst({
      where: { level: 3, status: 'APPROVED' },
      select: { userId: true },
    })
  )?.userId;
  if (mentorUserId) {
    await prisma.mentorProfile.upsert({
      where: { userId: mentorUserId },
      update: {},
      create: {
        userId: mentorUserId,
        code: 'PADRINOS-DEMO01',
        spouseName: 'Marta',
        marriedSince: 2009,
        bio: 'Servimos en el ministerio de matrimonios desde 2015.',
      },
    });
  }

  // --- Una historia publicada ----------------------------------------------------
  // La página de historias vacía no dice nada; con una, dice para qué existe
  // todo lo demás.
  if ((await prisma.story.count()) === 0) {
    await prisma.story.create({
      data: {
        names: 'Rebeca y Josué',
        churchNames: 'Iglesia Bíblica Emanuel y Iglesia Monte de Sion',
        city: 'Santo Domingo',
        marriedAt: new Date('2026-02-14'),
        body:
          'Coincidimos en una vigilia antes de coincidir en Yugo. Lo que nos ayudó no fue la ' +
          'aplicación: fue que un matrimonio de Emanuel nos acompañó desde que declaramos amistad ' +
          'intencional, y que ninguno de los dos tuvo que adivinar en qué estábamos. A quien está ' +
          'empezando: no tengan prisa por saltarse etapas.',
        status: 'PUBLISHED',
        consentAId: true,
        consentBId: true,
        publishedAt: new Date('2026-03-02'),
      },
    });
  }

  // --- Devocionales: catorce días, uno por día ------------------------------------
  // Un devocional por día para todos: es lo que hace que «142 personas de tu
  // iglesia lo leyeron hoy» signifique algo. Se siembran hacia atrás desde hoy
  // para que la constancia tenga historia que contar.
  const DEVOTIONALS = [
    { reference: 'Proverbios 4:23', title: 'Guarda tu corazón', body: 'Sobre toda cosa guardada, guarda tu corazón, porque de él mana la vida. Guardar no es cerrar: es saber a quién le abres, y en qué orden.', question: '¿A quién le has abierto el corazón esta semana, y por qué a esa persona?' },
    { reference: 'Rut 1:16', title: 'Donde tú vayas', body: 'Rut no eligió un país: eligió una lealtad. Antes de que existiera un futuro claro, hubo alguien dispuesto a quedarse.', question: '¿Con quién te has quedado cuando no era conveniente?' },
    { reference: '1 Corintios 13:4', title: 'El amor es paciente', body: 'La paciencia es la única virtud que no se puede demostrar rápido. Es la prueba de que lo demás es cierto.', question: '¿En qué se te nota a ti la prisa?' },
    { reference: 'Eclesiastés 4:9', title: 'Mejores son dos', body: 'Mejores son dos que uno, porque tienen mejor paga de su trabajo. No dice que sea más fácil: dice que rinde más.', question: '¿Qué cosa estás cargando solo que no tendrías que cargar solo?' },
    { reference: 'Salmo 37:4', title: 'Deléitate', body: 'Los deseos del corazón cambian cuando cambia de qué se deleita el corazón. Ese es el orden, y casi siempre lo invertimos.', question: '¿Qué deseo tuyo ha cambiado en el último año?' },
    { reference: 'Filipenses 2:3', title: 'Estimando al otro', body: 'Nada por contienda ni por vanagloria. En una relación, la vanagloria se ve en quién cuenta la historia y cómo queda cada quien en ella.', question: '¿Cómo cuentas tú la última discusión que tuviste?' },
    { reference: 'Génesis 2:18', title: 'No es bueno que esté solo', body: 'Lo primero que Dios llamó «no bueno» no fue un pecado: fue una soledad. Buscar compañía no es debilidad.', question: '¿Qué te ha costado más de estar solo?' },
    { reference: 'Santiago 1:19', title: 'Pronto para oír', body: 'Pronto para oír, tardo para hablar, tardo para airarse. En ese orden, y el orden es el consejo entero.', question: '¿Cuándo fue la última vez que oíste sin estar preparando tu respuesta?' },
    { reference: 'Colosenses 3:13', title: 'Soportándoos', body: 'Perdonar no es olvidar lo que pasó: es decidir que eso ya no va a decidir cómo te trato.', question: '¿Hay algo que sigues cobrando en silencio?' },
    { reference: 'Proverbios 27:17', title: 'Hierro con hierro', body: 'Hierro con hierro se aguza. La fricción que afila no es la que hiere: es la de alguien que te quiere y te dice la verdad.', question: '¿Quién te dice la verdad aunque te incomode?' },
    { reference: 'Mateo 6:33', title: 'Buscad primero', body: 'Primero no significa únicamente. Significa que hay un orden, y que lo demás llega en su lugar.', question: '¿Qué has puesto primero este mes, si lo miras por tu calendario y no por tus intenciones?' },
    { reference: 'Cantares 8:4', title: 'No despertéis el amor', body: 'Que no despertéis al amor hasta que quiera. Hay un tiempo, y forzarlo cuesta más de lo que ahorra.', question: '¿Qué estás apurando?' },
    { reference: 'Romanos 12:10', title: 'Amaos con afecto', body: 'Con afecto fraternal, prefiriéndoos los unos a los otros. Preferir es un verbo activo: se hace, no se siente.', question: '¿A quién preferiste esta semana con un acto concreto?' },
    { reference: 'Salmo 139:14', title: 'Formidables tus obras', body: 'Antes de que alguien te vea con ojos de querer conocerte, ya fuiste visto y llamado bueno. Eso no lo otorga ni lo quita una relación.', question: '¿Qué le pides a otra persona que ya tienes?' },
  ];
  if ((await prisma.devotional.count()) === 0) {
    // El día se decide en hora de Santo Domingo: si se tomara en UTC, entre
    // las 8 de la noche y la medianoche la semilla escribiría el de «mañana».
    const midnight = (daysAgo: number) => {
      const d = new Date(Date.now() - daysAgo * 86400000);
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santo_Domingo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d);
      return new Date(`${local}T00:00:00.000Z`);
    };
    for (let i = 0; i < DEVOTIONALS.length; i += 1) {
      const devotional = await prisma.devotional.create({
        data: { ...DEVOTIONALS[i], publishOn: midnight(i) },
      });
      // Lecturas de otros, para que el número de la congregación no salga en
      // cero el primer día: un muro vacío no invita a nadie.
      const readers = pickMany(memberIds, 6 + Math.floor(rand() * 14));
      await prisma.devotionalRead.createMany({
        data: readers.map((userId, index) => ({
          devotionalId: devotional.id,
          userId,
          readAt: new Date(midnight(i).getTime() + (7 + index) * 3600000),
          reflection:
            index < 3
              ? pick([
                  'Me pegó lo del orden. Yo pido primero y ordeno después.',
                  'Lo leí camino al trabajo y lo volví a leer de noche.',
                  'Esta semana la necesitaba, de verdad.',
                  'Se lo mandé a mi hermana.',
                ])
              : null,
          reflectionStatus: index < 3 ? ('APPROVED' as const) : null,
        })),
        skipDuplicates: true,
      });
    }
  }

  // --- Muro de oración -----------------------------------------------------------
  // Una de cada tres es anónima, porque son justo las que no se escriben si hay
  // que firmarlas. Una viene contestada: sin respuestas visibles el muro se
  // convierte en una lista de desgracias.
  if ((await prisma.prayerRequest.count()) === 0) {
    const PRAYERS = [
      { body: 'Por mi mamá, que la operan el jueves. Que las manos del médico estén firmes.', anonymous: false, intercessors: 11 },
      { body: 'Llevo cuatro meses sin trabajo y ya se me está acabando la fe de que va a salir algo. Oren por mí.', anonymous: true, intercessors: 7 },
      { body: 'Por mi hermano, que hace dos años no habla con mi papá.', anonymous: false, intercessors: 5 },
      { body: 'Tengo una deuda que no he podido decirle a nadie de mi casa. Necesito sabiduría antes que dinero.', anonymous: true, intercessors: 0 },
      { body: 'Empiezo la universidad a los 34 y me da vergüenza. Por valor.', anonymous: true, intercessors: 0 },
      { body: 'Por mi congregación, que estamos buscando local nuevo.', anonymous: false, intercessors: 4 },
      { body: 'Por mi hija de 7 años, que le cuesta dormir desde que nos mudamos.', anonymous: false, intercessors: 9 },
    ];
    for (let i = 0; i < PRAYERS.length; i += 1) {
      const prayer = PRAYERS[i];
      const authorId = memberIds[(i * 5) % memberIds.length];
      const author = await prisma.profile.findUnique({
        where: { userId: authorId },
        select: { churchId: true },
      });
      const created = await prisma.prayerRequest.create({
        data: {
          userId: authorId,
          body: prayer.body,
          anonymous: prayer.anonymous,
          // Una anónima no guarda iglesia: ver «invariante 1» en PrayerService.
          churchId: prayer.anonymous ? null : (author?.churchId ?? null),
          moderationStatus: 'APPROVED',
          createdAt: new Date(Date.now() - (i + 1) * 9 * 3600000),
        },
      });
      if (prayer.intercessors > 0) {
        await prisma.prayerIntercession.createMany({
          data: pickMany(
            memberIds.filter((id) => id !== authorId),
            prayer.intercessors,
          ).map((userId) => ({ requestId: created.id, userId })),
          skipDuplicates: true,
        });
      }
    }
    // Una contestada, y reciente, para que encabece el muro.
    const first = await prisma.prayerRequest.findFirst({ orderBy: { createdAt: 'desc' } });
    if (first) {
      await prisma.prayerRequest.update({
        where: { id: first.id },
        data: {
          answeredAt: new Date(Date.now() - 3 * 3600000),
          answeredNote: 'Salió el trabajo. Empiezo el lunes. Gracias a los que oraron.',
        },
      });
    }
  }

  console.log(`Devocionales: ${await prisma.devotional.count()}`);
  console.log(`Peticiones de oración: ${await prisma.prayerRequest.count()}`);
  console.log(`Encuentros de solteros: ${await prisma.event.count({ where: { audience: 'SINGLES' } })}`);
  console.log(`Historias publicadas: ${await prisma.story.count({ where: { status: 'PUBLISHED' } })}`);
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
