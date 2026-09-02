/**
 * Smoke suite against a running API and a real PostgreSQL.
 *
 * The unit tests cover the domain rules in isolation and the Playwright suite
 * covers the interface, but between them nothing ever booted the server and
 * spoke HTTP to it. That gap hid three production bugs at once: the built
 * entrypoint was at the wrong path, a global pipe demanded a package that is
 * not installed, and a raw query passed a bigint where Postgres wanted an int.
 * None of them can reach a green build again without this file failing.
 *
 * Run with: pnpm --filter @yugo/api test:smoke   (API already listening)
 */
const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:4000/v1';
const PASSWORD = 'Yugo.demo1';

let failures = 0;
let checks = 0;

function check(name: string, condition: boolean, detail?: unknown) {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${name}`);
  if (detail !== undefined) console.error(`       ${JSON.stringify(detail)}`);
}

interface Json {
  status: number;
  body: any;
}

async function call(
  method: string,
  path: string,
  options: { token?: string; body?: unknown; query?: Record<string, string> } = {},
): Promise<Json> {
  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  if (options.token) headers.authorization = `Bearer ${options.token}`;

  const query = options.query ? `?${new URLSearchParams(options.query)}` : '';
  const response = await fetch(`${BASE}${path}${query}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/**
 * Tokens are memoised for the run: login is rate limited to 10 an hour on
 * purpose (RF-SEG-05), and a suite that trips its own limiter fails for the
 * wrong reason.
 */
const tokens = new Map<string, string>();

async function login(identifier: string): Promise<string> {
  const cached = tokens.get(identifier);
  if (cached) return cached;

  const result = await call('POST', '/auth/login', {
    body: { identifier, password: PASSWORD },
  });
  if (result.body?.accessToken) tokens.set(identifier, result.body.accessToken);
  if (!result.body?.accessToken) {
    throw new Error(`login failed for ${identifier}: ${JSON.stringify(result.body)}`);
  }
  return result.body.accessToken;
}


/**
 * Entrar como personal del equipo, pasando el 2FA de verdad.
 *
 * Los roles administrativos exigen segundo factor (RF-AUT-07) y el código va
 * hasheado a la base, así que no se puede leer de vuelta. La suite hace lo
 * mismo que haría una persona con la consola delante: acuña un código, lo deja
 * donde el servicio lo busca y lo escribe. Nada del control se relaja; el
 * camino que se ejercita es el real.
 */
async function loginStaff(email: string): Promise<string> {
  const cached = tokens.get(email);
  if (cached) return cached;

  const first = await call('POST', '/auth/login', { body: { identifier: email, password: PASSWORD } });
  if (first.body?.accessToken) {
    tokens.set(email, first.body.accessToken);
    return first.body.accessToken;
  }
  if (!first.body?.twoFactorRequired) {
    throw new Error(`login failed for ${email}: ${JSON.stringify(first.body)}`);
  }

  const { PrismaClient } = await import('@prisma/client');
  const { createHash } = await import('crypto');
  const prisma = new PrismaClient();
  const code = '424242';
  try {
    await prisma.otpCode.create({
      data: {
        identifier: email,
        purpose: 'LOGIN',
        codeHash: createHash('sha256').update(code).digest('hex'),
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  const second = await call('POST', '/auth/login/2fa', { body: { identifier: email, code } });
  if (!second.body?.accessToken) {
    throw new Error(`2fa failed for ${email}: ${JSON.stringify(second.body)}`);
  }
  tokens.set(email, second.body.accessToken);
  return second.body.accessToken;
}

/**
 * The e-mail behind a user id, read from the database.
 *
 * The API never exposes another member's e-mail, and rightly so. Guessing it
 * from the seeded accounts would either couple this suite to the seed's random
 * choices or need dozens of logins — and login is rate limited to 10 an hour on
 * purpose (RF-SEG-05), so probing would trip our own limiter and make the suite
 * flaky for the wrong reason. Reading the fixture straight from the database is
 * both stable and honest for an integration test.
 */
async function seedEmailOf(userId: string): Promise<string | null> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    return user?.email ?? null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Peticiones de oración que esta persona ya publicó hoy.
 *
 * La suite no puede asumir que empieza en cero: la semilla reparte peticiones
 * entre los miembros, y quien la corre puede ser uno de ellos. Leer el punto
 * de partida es lo que hace que la comprobación del límite diario diga algo
 * en vez de depender de la suerte.
 */
async function todaysPrayerCount(email: string): Promise<number> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const day = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santo_Domingo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return prisma.prayerRequest.count({
      where: { user: { email }, createdAt: { gte: new Date(`${day}T04:00:00.000Z`) } },
    });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * A seeded member with a level-3 endorsement who is not in the bond under
 * test — the only kind of person who can act as a padrino.
 */
async function seedEmailOfEndorsedOutsider(exclude: string[]): Promise<string | null> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: { notIn: exclude },
        role: 'MEMBER',
        email: { not: null },
        verifications: { some: { level: 3, status: 'APPROVED' } },
      },
      select: { email: true },
    });
    return user?.email ?? null;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * The rows of an admin report, read through the real service.
 *
 * Not over HTTP: the admin account requires 2FA, and adding a bypass to the
 * suite would weaken the thing it is meant to protect. Running the service
 * against the same database still exercises every query.
 */
async function reportRows(kind: string): Promise<Array<Record<string, string | number>>> {
  const { PrismaClient } = await import('@prisma/client');
  const { ReportsService } = await import('../src/modules/admin/reports.service');
  const prisma = new PrismaClient();
  try {
    const service = new ReportsService(prisma as never);
    const { rows } = await service.build(kind as never);
    return rows;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * A published encuentro with exactly one seat, created fresh for this run.
 *
 * One seat is the most honest test of the rule: if a second person gets in,
 * "cupo" means nothing. It is created here rather than seeded because the
 * suite fills it, and a re-run needs an empty one.
 */
async function seedFullEncuentro(capacity = 1): Promise<string | null> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    const church = await prisma.church.findFirst({ where: { status: 'APPROVED' } });
    if (!church) return null;
    const event = await prisma.event.create({
      data: {
        churchId: church.id,
        title: `Encuentro de prueba ${Date.now()}`,
        description: 'Encuentro creado por la suite de humo para probar el cupo.',
        type: 'ACTIVIDAD_SOCIAL',
        audience: 'SINGLES',
        // Lejos en el tiempo: dentro de las 48 h la reserva de Oro se disuelve
        // y la prueba dejaría de comprobar lo que quiere comprobar.
        startsAt: new Date(Date.now() + 30 * 24 * 3600_000),
        address: 'Calle Principal 1',
        city: 'Santo Domingo',
        capacity,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
    return event.id;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * The first seeded member who still has people to see. Running the suite marks
 * interests, and those people correctly stop appearing, so a second run on the
 * same database needs a different viewer — or a reseed.
 */
async function firstViewerWithCandidates(exceptUserIds: string[] = []): Promise<{
  token: string;
  me: Json;
  items: any[];
} | null> {
  for (const email of ['demo1@yugo.do', 'demo3@yugo.do', 'demo5@yugo.do']) {
    const token = await login(email);
    const me = await call('GET', '/auth/me', { token });
    if (exceptUserIds.includes(me.body?.id)) continue;
    const discover = await call('GET', '/discover', { token });
    if (discover.status !== 200) continue;
    const items: any[] = discover.body?.items ?? [];
    if (items.length > 0) return { token, me, items };
  }
  return null;
}

/**
 * The Socket.IO gateway shipped long before anything connected to it, so it
 * could break without a single test noticing. This connects the way the apps
 * do — JWT in the handshake, join the room — and proves that a message sent
 * over HTTP actually arrives over the socket.
 */
async function checkRealtime(conversationId: string, token: string): Promise<void> {
  const { io } = await import('socket.io-client');
  const socket = io(`${BASE.replace(/\/v1$/, '')}/chat`, {
    transports: ['websocket'],
    auth: { token },
  });

  try {
    const connected = await new Promise<boolean>((resolve) => {
      socket.on('connect', () => resolve(true));
      socket.on('connect_error', () => resolve(false));
      setTimeout(() => resolve(false), 8000);
    });
    check('el socket conecta y autentica', connected);
    if (!connected) return;

    const ack = (await socket.emitWithAck('conversation:join', { conversationId })) as {
      ok?: boolean;
    };
    check('se une a la sala de la conversación', ack?.ok === true, ack);

    const delivered = new Promise<boolean>((resolve) => {
      socket.on('message:new', (message: { conversationId: string }) =>
        resolve(message.conversationId === conversationId),
      );
      setTimeout(() => resolve(false), 5000);
    });

    await call('POST', `/connections/conversations/${conversationId}/messages`, {
      token,
      body: { body: 'Probando el tiempo real desde la suite de humo.' },
    });

    check('un mensaje enviado por HTTP llega por el socket', await delivered);
  } finally {
    socket.disconnect();
  }
}

async function waitForApi(): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const health = await call('GET', '/health');
      if (health.status === 200 && health.body?.status === 'ok') return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`API never became healthy at ${BASE}`);
}

async function main() {
  await waitForApi();

  console.log('\nSalud y arranque');
  const health = await call('GET', '/health');
  check('/health responde ok', health.body?.status === 'ok', health.body);
  check('la base responde', health.body?.checks?.database === 'ok', health.body?.checks);

  console.log('\nRF-AUT-03 — mayoría de edad');
  const underage = await call('POST', '/auth/register', {
    body: {
      email: `smoke-menor-${Date.now()}@yugo.do`,
      password: PASSWORD,
      birthDate: '2012-05-01',
      gender: 'FEMALE',
    },
  });
  // 403 y no 400: el servicio es la autoridad y audita el intento antes de
  // rechazarlo. Un 400 significaría que un esquema lo corta antes de auditar.
  check('un menor recibe 403 (no 400)', underage.status === 403, underage);
  check('el motivo es must_be_adult', underage.body?.message === 'must_be_adult', underage.body);

  console.log('\nRF-DES-01/11 — Descubrir y regla mutua de edad');
  // La suite consume la lista del día de quien use: marca intereses y esa
  // gente deja de aparecer. Por eso busca una cuenta sembrada que todavía
  // tenga candidatos, en vez de asumir que demo1 está intacta.
  const viewer = await firstViewerWithCandidates();
  if (!viewer) {
    console.error(
      '\nNinguna cuenta sembrada tiene candidatos: la base ya fue consumida.\n' +
        'Vuelve a sembrarla antes de repetir:\n' +
        '  pnpm --filter @yugo/api exec prisma migrate reset --force\n' +
        '  pnpm --filter @yugo/api db:seed',
    );
    process.exit(1);
  }
  const { token, me, items } = viewer;
  const myMin = me.body.profile.ageMin;
  const myMax = me.body.profile.ageMax;
  check('Descubrir responde con candidatos', items.length > 0, { total: items.length });

  const outsideMyRange = items.filter((p) => p.age < myMin || p.age > myMax);
  check('todos caen dentro de mi rango', outsideMyRange.length === 0, outsideMyRange);

  const sortedByAffinity = items.every(
    (item, index) => index === 0 || items[index - 1].affinity.total >= item.affinity.total,
  );
  check('vienen ordenados por afinidad', sortedByAffinity, items.map((p) => p.affinity.total));

  // RF-DES-02: el porqué se calcula en el servidor, no en la pantalla.
  const withoutReason = items.filter((p) => !p.affinityReason);
  check('cada tarjeta trae su motivo', withoutReason.length === 0, withoutReason.map((p) => p.userId));

  console.log('\nRF-VER-02 — filtro de respaldo de iglesia');
  const endorsed = await call('GET', '/discover', {
    token,
    query: { filters: JSON.stringify({ endorsedOnly: true }) },
  });
  check('el filtro responde 200', endorsed.status === 200, endorsed.body);
  const notEndorsed = (endorsed.body?.items ?? []).filter((p: any) => !p.badges?.endorsedBy);
  check(
    'con el filtro puesto, todas llevan respaldo',
    notEndorsed.length === 0,
    notEndorsed.map((p: any) => p.userId),
  );
  check(
    'filtrar nunca amplía la lista',
    (endorsed.body?.items?.length ?? 0) <= items.length,
    { filtrada: endorsed.body?.items?.length, completa: items.length },
  );

  console.log('\nPrueba de valor del registro');
  const reach = await call('GET', '/catalog/reach', { query: { denomination: 'evangelica' } });
  check('/catalog/reach es público', reach.status === 200, reach);
  check(
    'devuelve un conteo redondeado, nunca personas',
    reach.body?.approximate === null || reach.body.approximate % 10 === 0,
    reach.body,
  );
  check(
    'no filtra identidades',
    !JSON.stringify(reach.body).includes('@'),
    reach.body,
  );

  console.log('\nRF-PER-02 — fotos');
  const myPhotos = await call('GET', '/photos/mine', { token });
  check('la lista de fotos responde', myPhotos.status === 200, myPhotos.body);
  const signed = await call('POST', '/photos/sign-upload', {
    token,
    body: { contentType: 'image/jpeg' },
  });
  check('firma una subida', !!signed.body?.uploadUrl && !!signed.body?.key, signed.body);
  const badType = await call('POST', '/photos/sign-upload', {
    token,
    body: { contentType: 'application/pdf' },
  });
  check('rechaza un tipo que no es imagen', badType.status === 400, badType);

  console.log('\nRF-DES-05 — interés y lista del día');
  const first = items[0];
  if (first) {
    const marked = await call('POST', '/interests', { token, body: { toUserId: first.userId } });
    check('marcar interés responde 201', marked.status === 201, marked.body);

    const repeated = await call('POST', '/interests', { token, body: { toUserId: first.userId } });
    check('repetir el interés se rechaza', repeated.body?.message === 'already_interested', repeated.body);

    // La lista del día es estable a propósito, pero tiene que encogerse: si no,
    // la persona ya marcada seguiría en pantalla hasta la medianoche.
    const after = await call('GET', '/discover', { token });
    const stillThere = (after.body?.items ?? []).some((p: any) => p.userId === first.userId);
    check('quien ya recibió mi interés sale de la lista', !stillThere, {
      userId: first.userId,
    });

    const counter = after.body?.interests;
    check('el contador diario persiste', counter?.used >= 1, counter);
  }

  console.log('\nRF-NOT-02 — horario silencioso');
  // Sin asumir una ventana virgen: la suite puede correr dos veces seguidas
  // contra la misma base y debe dar el mismo resultado.
  const quiet = await call('GET', '/notifications/quiet-hours', { token });
  check(
    'devuelve una ventana en horas válidas',
    Number.isInteger(quiet.body?.startHour) &&
      Number.isInteger(quiet.body?.endHour) &&
      quiet.body.startHour >= 0 &&
      quiet.body.startHour <= 23,
    quiet.body,
  );

  const saved = await call('PUT', '/notifications/quiet-hours', {
    token,
    body: { enabled: true, startHour: 23, endHour: 6 },
  });
  check('guarda la ventana', saved.body?.startHour === 23 && saved.body?.endHour === 6, saved.body);

  const reread = await call('GET', '/notifications/quiet-hours', { token });
  check('la ventana persiste', reread.body?.startHour === 23 && reread.body?.endHour === 6, reread.body);

  const rejected = await call('PUT', '/notifications/quiet-hours', {
    token,
    body: { enabled: true, startHour: 25, endHour: 6 },
  });
  check('rechaza una hora fuera de rango', rejected.status === 400, rejected);

  console.log('\nRF-CON-06 — interés recíproco crea la conexión');
  // Las semillas no traen conversaciones, así que la suite crea una: sin esto
  // el bloque de moderación no se ejecutaría nunca en CI, que es justo donde
  // hace falta.
  let conversationId: string | undefined;
  let matchId: string | undefined;
  let theirTokenForStages: string | undefined;
  // `first` salió del Descubrir de demo1, así que la elegibilidad mutua ya la
  // garantizó el SQL: basta con que esa persona corresponda el interés.
  const counterpartEmail = first ? await seedEmailOf(first.userId) : null;
  check('la contraparte existe en las semillas', counterpartEmail !== null, first?.userId);

  if (counterpartEmail) {
    const theirToken = await login(counterpartEmail);
    const reciprocal = await call('POST', '/interests', {
      token: theirToken,
      body: { toUserId: me.body.id },
    });
    check(
      'el interés recíproco crea la conexión',
      !!reciprocal.body?.match || reciprocal.body?.message === 'already_interested',
      reciprocal.body,
    );

    const connections = await call('GET', '/connections', { token });
    check('la conexión aparece en mi lista', (connections.body?.length ?? 0) > 0, connections.body);
    conversationId = connections.body?.[0]?.conversationId;
    matchId = connections.body?.[0]?.matchId;
    theirTokenForStages = theirToken;
  }

  console.log('\nConversaciones que importan — se revelan a la vez');
  if (matchId && theirTokenForStages) {
    // En «conociéndonos» no hay ninguna abierta.
    const locked = await call('GET', `/connections/${matchId}/questions`, { token });
    check('en «conociéndonos» no hay preguntas', locked.body?.items?.length === 0, locked.body);
    check('pero se dice cuántas faltan', (locked.body?.lockedAhead ?? 0) > 0, locked.body);

    // Avanzar a amistad intencional las abre.
    await call('POST', `/connections/${matchId}/stage/propose`, {
      token,
      body: { stage: 'INTENTIONAL_FRIENDSHIP' },
    });
    await call('POST', `/connections/${matchId}/stage/accept`, { token: theirTokenForStages });

    const open = await call('GET', `/connections/${matchId}/questions`, { token });
    check('al avanzar se abren', (open.body?.items?.length ?? 0) > 0, open.body?.items?.length);

    const questionId = open.body.items[0].id;
    const mine = await call('POST', `/connections/${matchId}/questions`, {
      token,
      body: { questionId, answer: 'Mi respuesta, escrita sin ver la suya.' },
    });
    check('contestar primero no revela nada', mine.body?.revealed === false, mine.body);

    // La invariante: la respuesta ajena no sale del servidor.
    const theirView = await call('GET', `/connections/${matchId}/questions`, {
      token: theirTokenForStages,
    });
    const item = (theirView.body?.items ?? []).find((i: { id: string }) => i.id === questionId);
    check('la otra persona no recibe mi respuesta', item?.theirAnswer === null, item);
    check('pero sí sabe que contesté', item?.theyAnswered === true, item);
    check(
      'y el texto no viaja en ninguna parte del payload',
      !JSON.stringify(theirView.body).includes('sin ver la suya'),
      null,
    );

    const theirs = await call('POST', `/connections/${matchId}/questions`, {
      token: theirTokenForStages,
      body: { questionId, answer: 'La mía, también a ciegas.' },
    });
    check('al contestar la segunda, se revelan', theirs.body?.revealed === true, theirs.body);
    check('y devuelve la ajena', theirs.body?.theirAnswer?.includes('sin ver la suya'), theirs.body);

    // «hijos-quiero» se abre en noviazgo: aquí todavía no.
    const locked2 = await call('POST', `/connections/${matchId}/questions`, {
      token,
      body: { questionId: 'hijos-quiero', answer: 'x' },
    });
    check('una pregunta de una etapa posterior se rechaza', locked2.status === 400, locked2);
  }

  console.log('\nEtapas del vínculo — la declaran los dos');
  if (matchId && theirTokenForStages) {
    const state = await call('GET', `/connections/${matchId}/stage`, { token });
    check('la etapa se puede consultar', state.status === 200, state.body);

    const skipped = await call('POST', `/connections/${matchId}/stage/propose`, {
      token,
      body: { stage: 'ENGAGED' },
    });
    check(
      'no se puede saltar de conociéndonos a comprometidos',
      skipped.status === 400 && skipped.body?.message === 'cannot_skip_stages',
      skipped,
    );

    // Avanza desde donde esté, para que una segunda corrida no falle por
    // encontrarse el vínculo ya movido.
    let stage: string = state.body?.stage ?? 'KNOWING';
    let reachedCourtship = stage === 'COURTSHIP' || stage === 'ENGAGED';

    while (!reachedCourtship) {
      const next = state.body?.nextStage && stage === state.body?.stage
        ? state.body.nextStage
        : stage === 'KNOWING'
          ? 'INTENTIONAL_FRIENDSHIP'
          : 'COURTSHIP';

      const proposed = await call('POST', `/connections/${matchId}/stage/propose`, {
        token,
        body: { stage: next },
      });
      check(`proponer «${next}» responde 201`, proposed.status === 201, proposed.body);

      const ownAccept = await call('POST', `/connections/${matchId}/stage/accept`, { token });
      check(
        'nadie acepta su propia propuesta',
        ownAccept.status === 400 && ownAccept.body?.message === 'cannot_accept_own_proposal',
        ownAccept,
      );

      const accepted = await call('POST', `/connections/${matchId}/stage/accept`, {
        token: theirTokenForStages,
      });
      check(`la otra persona acepta y la etapa pasa a «${next}»`, accepted.body?.stage === next, accepted.body);
      stage = accepted.body?.stage ?? stage;
      reachedCourtship = stage === 'COURTSHIP' || stage === 'ENGAGED';
      if (!accepted.body?.stage) break;
    }

    // La consecuencia que sostiene todo lo demás: declarar noviazgo saca a los
    // dos de Descubrir, en las dos direcciones. Si esto se rompe, el respaldo
    // de una iglesia deja de significar algo.
    check('el noviazgo marca el vínculo como exclusivo', reachedCourtship, stage);

    const mine = await call('GET', '/discover', { token });
    check(
      'quien declaró noviazgo ya no recibe candidatos',
      mine.body?.settled === true && (mine.body?.items ?? []).length === 0,
      mine.body,
    );

    const theirs = await call('GET', '/discover', { token: theirTokenForStages });
    check(
      'y su pareja tampoco',
      theirs.body?.settled === true && (theirs.body?.items ?? []).length === 0,
      theirs.body,
    );

    // Y ninguno de los dos le aparece a nadie más.
    const outsider = await firstViewerWithCandidates([me.body.id, first!.userId]);
    if (outsider) {
      const visible = outsider.items.filter(
        (card) => card.userId === me.body.id || card.userId === first!.userId,
      );
      check('nadie más los ve en Descubrir', visible.length === 0, visible.map((c) => c.userId));
    }
  } else {
    check('hay un vínculo cuyas etapas probar', false, 'no se pudo crear la conexión');
  }

  console.log('\nAcompañamiento — ve la etapa, nunca el chat');
  if (matchId && theirTokenForStages && conversationId) {
    // El padrino es un tercero real: alguien con respaldo nivel 3 que no está
    // en el vínculo. Sin eso la prueba de privacidad no probaría nada.
    const mentorEmail = await seedEmailOfEndorsedOutsider([me.body.id, first!.userId]);
    check('hay un miembro con respaldo nivel 3 para acompañar', mentorEmail !== null);

    if (mentorEmail) {
      const mentorToken = await login(mentorEmail);
      const enabled = await call('PUT', '/acompanamiento/perfil', {
        token: mentorToken,
        body: { spouseName: 'Marta', marriedSince: 2009 },
      });
      check('un miembro respaldado obtiene su código', !!enabled.body?.code, enabled.body);

      const invited = await call('POST', `/connections/${matchId}/accompaniment/invite`, {
        token,
        body: { code: enabled.body.code },
      });
      check('invitar responde 201', invited.status === 201, invited.body);

      // Todavía no: falta la otra persona y falta el matrimonio.
      const tooEarly = await call('GET', `/acompanamiento/${invited.body.id}`, {
        token: mentorToken,
      });
      check('antes de aceptar, el padrino no ve nada', tooEarly.status === 403, tooEarly.status);

      await call('POST', `/acompanamiento/${invited.body.id}/respond`, {
        token: mentorToken,
        body: { accept: true },
      });
      const consented = await call('POST', `/connections/${matchId}/accompaniment/consent`, {
        token: theirTokenForStages,
        body: { agree: true },
      });
      check('con el sí de los tres queda activo', consented.body?.status === 'ACTIVE', consented.body);

      const detail = await call('GET', `/acompanamiento/${invited.body.id}`, { token: mentorToken });
      check('el padrino ve la etapa', detail.body?.stage === 'COURTSHIP', detail.body?.stage);
      check(
        'y el historial de cómo llegaron ahí',
        (detail.body?.history ?? []).length >= 2,
        detail.body?.history,
      );

      // La invariante que sostiene todo el módulo, comprobada de verdad y no
      // solo por ausencia de pantalla.
      const serialized = JSON.stringify(detail.body ?? {});
      check('la respuesta no trae conversación ni mensajes', !/conversation|message/i.test(serialized), serialized.slice(0, 200));

      const peeking = await call('GET', `/connections/conversations/${conversationId}/messages`, {
        token: mentorToken,
      });
      check('el padrino no puede leer el chat', peeking.status === 403, peeking.status);

      const writing = await call('POST', `/connections/conversations/${conversationId}/messages`, {
        token: mentorToken,
        body: { body: 'Hola, soy el padrino' },
      });
      check('ni escribir en él', writing.status === 403, writing.status);

      const ended = await call('DELETE', `/acompanamiento/${invited.body.id}`, {
        token: theirTokenForStages,
      });
      check('cualquiera de los tres puede terminarlo', ended.body?.status === 'ENDED', ended.body);

      const afterEnd = await call('GET', `/acompanamiento/${invited.body.id}`, {
        token: mentorToken,
      });
      check('terminado, deja de ver', afterEnd.status === 403, afterEnd.status);
    }
  }

  console.log('\nValidación de propósito — señala, nunca sanciona');
  {
    const mine = await call('GET', '/proposito/mio', { token });
    check('cada quien ve si ganó la insignia', mine.status === 200, mine.body);
    check(
      'y nunca su puntaje ni sus señales',
      !('score' in (mine.body ?? {})) && !('signals' in (mine.body ?? {})),
      Object.keys(mine.body ?? {}),
    );

    // El puntaje de otra persona no es accesible para un miembro.
    const otherId = first?.userId;
    if (otherId) {
      const peek = await call('GET', `/proposito/${otherId}`, { token });
      check('un miembro no puede ver el puntaje de otro', peek.status === 403, peek.status);
    }
  }

  console.log('\nRF-SEG-06 — plan del primer encuentro');
  if (matchId && theirTokenForStages) {
    const created = await call('POST', `/connections/${matchId}/plan`, {
      token,
      body: {
        place: 'Café Mamá Chila, Naco',
        meetsAt: new Date(Date.now() + 2 * 86400_000).toISOString(),
        trustedContactLabel: 'mi hermana Rosa',
      },
    });
    check('crear el plan responde 201', created.status === 201, created.body);
    check(
      'la app escribe el mensaje para que lo mande la persona',
      typeof created.body?.shareText === 'string' &&
        created.body.shareText.includes('Café Mamá Chila'),
      created.body?.shareText,
    );
    // Lo que no puede aparecer: el teléfono de un tercero que nunca aceptó
    // estar en Yugo (Ley 172-13).
    check(
      'no se guarda ningún teléfono de terceros',
      !/\+?\d{7,}/.test(JSON.stringify(created.body ?? {})),
      created.body,
    );

    const theirs = await call('GET', `/connections/${matchId}/plan`, {
      token: theirTokenForStages,
    });
    check('la otra persona no ve el plan', theirs.body?.plan === null, theirs.body);

    const stolen = await call('POST', `/connections/plan/${created.body.id}/check-in`, {
      token: theirTokenForStages,
    });
    check('ni puede tocarlo', stolen.status === 404, stolen.status);

    const shared = await call('POST', `/connections/plan/${created.body.id}/shared`, { token });
    check('marcar como avisado funciona', shared.body?.status === 'SHARED', shared.body);
  }

  console.log('\nRF-EVE-05 — coincidir en un evento');
  if (theirTokenForStages) {
    // Los dos se apuntan al mismo encuentro: la sugerencia deja de ser una
    // etiqueta compartida y pasa a ser una presentación posible.
    const eventId = await seedFullEncuentro(40);
    if (eventId) {
      await call('POST', `/events/${eventId}/attendance`, { token, body: { status: 'GOING' } });
      await call('POST', `/events/${eventId}/attendance`, {
        token: theirTokenForStages,
        body: { status: 'GOING' },
      });

      const icebreakers = await call(
        'GET',
        `/connections/conversations/${conversationId}/icebreakers`,
        { token },
      );
      check(
        'el rompehielos propone verse allá',
        (icebreakers.body ?? []).some((q: string) => q.includes('nos saludamos allá')),
        icebreakers.body,
      );
    }
  }

  console.log('\nHistorias — se casaron y lo cuentan');
  if (matchId && theirTokenForStages) {
    // Llegar a «Casados» desde noviazgo son dos pasos, y cada uno lo declaran
    // los dos: es exactamente lo que la historia certifica.
    for (const stage of ['ENGAGED', 'MARRIED']) {
      await call('POST', `/connections/${matchId}/stage/propose`, { token, body: { stage } });
      await call('POST', `/connections/${matchId}/stage/accept`, { token: theirTokenForStages });
    }
    const state = await call('GET', `/connections/${matchId}/stage`, { token });
    check('la escalera llega hasta «Casados»', state.body?.stage === 'MARRIED', state.body?.stage);
    check('y ya no hay etapa siguiente', state.body?.nextStage === null, state.body?.nextStage);

    const written = await call('POST', `/historias/conexion/${matchId}`, {
      token,
      body: {
        names: 'Pareja de prueba',
        churchNames: '',
        marriedAt: '2026-02-14',
        body: 'Nos conocimos en Yugo y nos acompañó un matrimonio de la iglesia desde el principio. '.repeat(2),
      },
    });
    check('escribirla responde 201', written.status === 201, written.body);
    check('nace en borrador, no publicada', written.body?.status === 'DRAFT', written.body);

    // Lo que sostiene todo: sin el sí de los dos no llega ni a revisión.
    const publicBefore = await call('GET', '/historias');
    const leaked = (publicBefore.body ?? []).some((s: { names: string }) => s.names === 'Pareja de prueba');
    check('sin el sí de los dos no es pública', !leaked, publicBefore.body?.length);

    const consented = await call('POST', `/historias/conexion/${matchId}/consent`, {
      token: theirTokenForStages,
      body: { agree: true },
    });
    check('con los dos sí, pasa a revisión', consented.body?.status === 'IN_REVIEW', consented.body);

    const stillPrivate = await call('GET', '/historias');
    const leakedInReview = (stillPrivate.body ?? []).some(
      (s: { names: string }) => s.names === 'Pareja de prueba',
    );
    check('en revisión tampoco es pública', !leakedInReview, stillPrivate.body?.length);

    // Y el embudo termina donde el producto promete.
    const funnel = await reportRows('funnel');
    check(
      'el embudo mide casados, no suscripciones',
      funnel.some((row) => row.Etapa === 'Casados') &&
        !funnel.some((row) => String(row.Etapa).includes('Suscritos')),
      funnel.map((row) => row.Etapa),
    );
    const married = funnel.find((row) => row.Etapa === 'Casados');
    const count = Number(married?.Miembros ?? 0);
    // Se cuentan personas y los matrimonios vienen de a dos: exigir
    // exactamente 2 rompería en una base que ya traía otra pareja casada.
    check('y los cuenta de verdad, siempre en pares', count >= 2 && count % 2 === 0, married);
  }

  console.log('\nRF-EVE-04 — cupo real y lista de espera');
  {
    // Un encuentro con un solo lugar es la prueba más honesta de la regla: si
    // alguien entra en segundo lugar, el cupo no significa nada.
    const eventId = await seedFullEncuentro();
    check('hay un encuentro con cupo de 1', eventId !== null);

    if (eventId) {
      const first = await call('POST', `/events/${eventId}/attendance`, {
        token,
        body: { status: 'GOING' },
      });
      check('la primera persona entra', first.body?.status === 'GOING', first.body);

      const second = await call('POST', `/events/${eventId}/attendance`, {
        token: theirTokenForStages ?? token,
        body: { status: 'GOING' },
      });
      check(
        'la segunda va a lista de espera, no adentro',
        second.body?.status === 'WAITLIST',
        second.body,
      );
      check('y se le dice en qué lugar está', second.body?.position === 1, second.body);

      // Cancelar libera la silla y la lista de espera avanza sola.
      await call('POST', `/events/${eventId}/attendance`, { token, body: { status: null } });
      const promoted = await call('GET', '/events', { token: theirTokenForStages ?? token });
      const mine = (promoted.body ?? []).find((e: { id: string }) => e.id === eventId);
      check('al cancelar, el primero de la lista entra', mine?.myStatus === 'GOING', mine?.myStatus);
    }
  }

  console.log('\nDevocional del día — el mismo texto para todos');
  {
    const devotional = await call('GET', '/devocional/hoy', { token });
    check('hay un devocional publicado', !!devotional.body?.id, devotional.body);

    if (devotional.body?.id) {
      const id = devotional.body.id as string;
      check('trae su referencia bíblica', !!devotional.body.reference, devotional.body.reference);
      check('trae una pregunta para pensar', !!devotional.body.question, devotional.body.question);
      check(
        'la constancia cuenta días, no rachas',
        devotional.body.constancy?.windowDays === 30,
        devotional.body.constancy,
      );
      // Nada en la respuesta puede llamarse racha: la ausencia es la decisión.
      check(
        'la API no manda ningún campo de racha',
        !JSON.stringify(devotional.body).match(/streak|racha/i),
        Object.keys(devotional.body),
      );

      // Es el mismo devocional para otra persona: sin eso, «142 de tu iglesia
      // lo leyeron hoy» no significaría nada.
      if (theirTokenForStages) {
        const theirs = await call('GET', '/devocional/hoy', { token: theirTokenForStages });
        check('la otra persona recibe el mismo devocional', theirs.body?.id === id, {
          mine: id,
          theirs: theirs.body?.id,
        });
      }

      const before = devotional.body.readCount as number;
      const wasRead = devotional.body.readByMe === true;
      const read = await call('POST', `/devocional/${id}/leido`, {
        token,
        body: { reflection: 'Lo leí en la mañana y me quedé pensándolo.' },
      });
      check('marcar leído funciona', read.body?.readByMe === true, read.body);
      check('la reflexión limpia se publica', read.body?.published === true, read.body);

      const after = await call('GET', '/devocional/hoy', { token });
      check('marca que ya lo leí', after.body?.readByMe === true, after.body?.readByMe);

      // Quien ya lo había leído no vuelve a sumar. Es la invariante que hace
      // creíble el número de la congregación: si volver a abrirlo lo inflara,
      // «27 de tu iglesia lo leyeron hoy» dejaría de significar 27 personas.
      const now = after.body?.readCount ?? 0;
      check(
        wasRead ? 'volver a abrirlo no infla el conteo' : 'sube el conteo de lectores',
        wasRead ? now === before : now === before + 1,
        { before, after: now, wasRead },
      );

      // Y explícitamente: marcar leído dos veces seguidas no mueve el número.
      await call('POST', `/devocional/${id}/leido`, { token, body: {} });
      const twice = await call('GET', '/devocional/hoy', { token });
      check('marcarlo dos veces no cuenta dos', twice.body?.readCount === now, {
        expected: now,
        got: twice.body?.readCount,
      });

      // Una reflexión que la moderación retiene no se le muestra a la iglesia.
      const held = await call('POST', `/devocional/${id}/leido`, {
        token,
        body: { reflection: 'Escríbeme por whatsapp para seguir hablando de esto.' },
      });
      check('una reflexión retenida no se publica', held.body?.published === false, held.body);
    }
  }


  console.log('\nDevocional — autoría desde el panel y aviso de reserva');
  {
    const adminToken = await loginStaff('admin@yugo.do');
    const schedule = await call('GET', '/admin/devocionales', { token: adminToken });
    check('el calendario responde', Array.isArray(schedule.body?.items), schedule.status);
    check(
      'la reserva se cuenta en días consecutivos desde hoy',
      typeof schedule.body?.runwayDays === 'number',
      schedule.body?.runwayDays,
    );

    // Escribir el primer día libre después de lo programado.
    const taken = new Set((schedule.body?.items ?? []).map((d: { publishOn: string }) => d.publishOn));
    let free = schedule.body?.today as string;
    const next = (d: string) =>
      new Date(Date.parse(`${d}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    while (taken.has(free)) free = next(free);

    const before = schedule.body?.runwayDays as number;
    const written = await call('PUT', `/admin/devocionales/${free}`, {
      token: adminToken,
      body: {
        reference: 'Miqueas 6:8',
        title: 'Qué pide de ti',
        body: 'Hacer justicia, amar misericordia y humillarte ante tu Dios. Tres verbos, y ninguno es «sentir»: los tres se hacen.',
        question: '¿Cuál de los tres te cuesta más esta semana?',
      },
    });
    check('se puede escribir el de un día libre', written.body?.created === true, written.body);

    const after = await call('GET', '/admin/devocionales', { token: adminToken });
    check(
      'la reserva sube en un día si el nuevo va pegado',
      after.body?.runwayDays === before + 1,
      { before, after: after.body?.runwayDays },
    );

    // El de hoy ya lo leyó gente en esta misma suite: no se reescribe.
    const today = schedule.body?.today as string;
    const overwrite = await call('PUT', `/admin/devocionales/${today}`, {
      token: adminToken,
      body: {
        reference: 'Salmo 1:1',
        title: 'Reescrito',
        body: 'b'.repeat(60),
        question: 'q'.repeat(20),
      },
    });
    check('uno ya leído no se reescribe', overwrite.status === 403, overwrite.status);

    // Y se puede quitar el que se acaba de escribir, porque nadie lo leyó.
    if (written.body?.id) {
      const removed = await call('DELETE', `/admin/devocionales/${written.body.id}`, { token: adminToken });
      check('uno sin lecturas se puede quitar', removed.body?.deleted === true, removed.body);
    }

    // Un miembro no escribe devocionales.
    const forbidden = await call('GET', '/admin/devocionales', { token });
    check('un miembro no ve el calendario', forbidden.status === 403, forbidden.status);

    // El tablero avisa cuando la reserva es corta.
    const dashboard = await call('GET', '/admin/dashboard', { token: adminToken });
    check('el tablero informa la reserva', typeof dashboard.body?.queues?.devotionalRunway === 'number', dashboard.body?.queues);
  }

  console.log('\nMuro de oración — anonimato real y nadie en cero');
  {
    const wall = await call('GET', '/oracion', { token });
    check('el muro responde', Array.isArray(wall.body), wall.body);

    const anonymous = (wall.body ?? []).filter((p: { anonymous: boolean }) => p.anonymous);
    check('hay peticiones anónimas sembradas', anonymous.length > 0, anonymous.length);

    // La invariante que sostiene el anonimato: de una petición anónima no
    // sale del servidor ni el nombre, ni el id, ni la iglesia. No se oculta
    // en la pantalla — no viaja.
    const leaks = anonymous.filter(
      (p: { authorName: string | null; authorId: string | null; churchName: string | null }) =>
        p.authorName !== null || p.authorId !== null || p.churchName !== null,
    );
    check('ninguna anónima trae autor ni iglesia', leaks.length === 0, leaks);

    // La regla del orden: si hay alguna sin acompañar, va antes que las
    // acompañadas que no fueron contestadas hace poco.
    const items = wall.body ?? [];
    const firstUnaccompanied = items.findIndex(
      (p: { intercessions: number }) => p.intercessions === 0,
    );
    const lastAccompaniedOpen = items.reduce(
      (acc: number, p: { intercessions: number; answeredAt: string | null }, i: number) =>
        p.intercessions > 0 && !p.answeredAt ? i : acc,
      -1,
    );
    if (firstUnaccompanied >= 0 && lastAccompaniedOpen >= 0) {
      check(
        'la petición que nadie acompañó va por encima',
        firstUnaccompanied < lastAccompaniedOpen,
        { firstUnaccompanied, lastAccompaniedOpen },
      );
    }

    // El límite diario es de 3 y cuenta también las retenidas (si no, llenar
    // la cola de moderación sería gratis), así que la suite mide desde dónde
    // arranca esta cuenta antes de gastarlo.
    const writerToken = token;
    const startingToday = await todaysPrayerCount(me.body.email);

    // Crear una anónima y comprobar que otra persona no puede saber de quién es.
    const created = await call('POST', '/oracion', {
      token: writerToken,
      body: { body: 'Tengo una deuda que no he podido contarle a nadie en mi casa.', anonymous: true },
    });
    check('se puede pedir oración en anónimo', created.body?.published === true, created.body);

    if (theirTokenForStages && created.body?.id) {
      const theirWall = await call('GET', '/oracion', { token: theirTokenForStages });
      const seen = (theirWall.body ?? []).find(
        (p: { id: string }) => p.id === created.body.id,
      );
      check('la otra persona sí la ve', !!seen, seen);
      check(
        'pero no sabe quién la escribió',
        seen?.authorId === null && seen?.authorName === null,
        seen,
      );

      // Y no aparece filtrando por congregación: churchId se guarda en null.
      const theirChurchWall = await call('GET', '/oracion', {
        token: theirTokenForStages,
        query: { scope: 'church' },
      });
      const inChurch = (theirChurchWall.body ?? []).find(
        (p: { id: string }) => p.id === created.body.id,
      );
      check('una anónima nunca sale en la vista de la iglesia', !inChurch, inChurch);

      // Interceder, y que el conteo suba de verdad.
      const prayed = await call('POST', `/oracion/${created.body.id}/oro`, {
        token: theirTokenForStages,
      });
      check('«estoy orando» cuenta', prayed.body?.intercessions === 1, prayed.body);

      // Nadie más puede cerrar una petición ajena.
      const notMine = await call('POST', `/oracion/${created.body.id}/contestada`, {
        token: theirTokenForStages,
        body: {},
      });
      check('nadie cierra la petición de otro', notMine.status === 403, notMine.status);

      // Quien la escribió sí, y se avisa a quienes oraron.
      const closed = await call('POST', `/oracion/${created.body.id}/contestada`, {
        token: writerToken,
        body: { note: 'Se resolvió. Gracias a los que oraron conmigo.' },
      });
      check('quien la escribió sí la cierra', !!closed.body?.answeredAt, closed.body);
    }

    // La moderación previa: pedir dinero no se publica.
    const scam = await call('POST', '/oracion', {
      token: writerToken,
      body: { body: 'Necesito que me deposites dinero por transferencia para la operación.', anonymous: false },
    });
    check('una petición con pedido de dinero no se publica', scam.body?.published === false, scam.body);
    // La petición con pedido de dinero quedó retenida. Antes moría ahí: el
    // caso no enlazaba el contenido y nadie podía verlo ni aprobarlo, mientras
    // a la persona se le decía «se publica cuando alguien la apruebe».
    console.log('\nModeración — lo retenido se puede ver y aprobar');
    if (scam.body?.id) {
      const adminToken = await loginStaff('admin@yugo.do');
      const held = await call('GET', '/admin/moderation/held', { token: adminToken });
      check('la cola de retenidos responde', Array.isArray(held.body), held.status);

      const mine = (held.body ?? []).find(
        (h: { kind: string; text: string | null }) =>
          h.kind === 'prayer' && (h.text ?? '').includes('deposites dinero'),
      );
      check('la petición retenida aparece con su texto', !!mine, held.body?.length);
      check('y dice quién la escribió, para poder decidir', !!mine?.authorName, mine?.authorName);

      if (mine) {
        const approved = await call('POST', `/admin/moderation/held/${mine.caseId}/resolve`, {
          token: adminToken,
          body: { approve: true },
        });
        check('un moderador puede aprobarla', approved.body?.approved === true, approved.body);

        // Y ahora sí está en el muro: el ciclo que antes no cerraba.
        const wallAfter = await call('GET', '/oracion', { token });
        const published = (wallAfter.body ?? []).find(
          (p: { id: string }) => p.id === scam.body.id,
        );
        check('aprobada, aparece en el muro', !!published, wallAfter.body?.length);

        const heldAfter = await call('GET', '/admin/moderation/held', { token: adminToken });
        const stillThere = (heldAfter.body ?? []).some(
          (h: { caseId: string }) => h.caseId === mine.caseId,
        );
        check('y sale de la cola', !stillThere, heldAfter.body?.length);
      }

      // Un miembro no puede tocar la cola.
      const forbidden = await call('GET', '/admin/moderation/held', { token });
      check('un miembro no ve la cola', forbidden.status === 403, forbidden.status);
    }


    // Van dos gastadas en este bloque (la anónima y la del dinero). La
    // retenida sí ocupó su lugar, que es la parte que importa: si no contara,
    // llenar la cola de moderación sería gratis.
    let spent = startingToday + 2;
    let limitHit: { status: number; body: { message?: string } } | null = null;
    while (spent < 3 + startingToday && !limitHit) {
      const extra = await call('POST', '/oracion', {
        token: writerToken,
        body: { body: 'Por mi trabajo, que ha estado difícil este mes.', anonymous: false },
      });
      if (extra.status === 400) limitHit = extra;
      spent += 1;
    }
    const overLimit = limitHit ?? (await call('POST', '/oracion', {
      token: writerToken,
      body: { body: 'Por mi vecina, que está pasando por algo duro.', anonymous: false },
    }));
    check('pasado el límite del día, se rechaza', overLimit.status === 400, overLimit.body);
    check(
      'y el motivo es el límite, no otra cosa',
      overLimit.body?.message === 'prayer_daily_limit',
      overLimit.body,
    );
  }

  console.log('\nRF-CON-05 — moderación previa del chat');
  if (conversationId) {
    const clean = await call('POST', `/connections/conversations/${conversationId}/messages`, {
      token,
      body: { body: 'Hola, un gusto conectar. ¿En qué ministerio sirves?' },
    });
    check('un mensaje normal se entrega', clean.body?.moderationStatus === 'APPROVED', clean.body);

    const scam = await call('POST', `/connections/conversations/${conversationId}/messages`, {
      token,
      body: { body: 'Necesito que me deposites dinero urgente por transferencia' },
    });
    check('la estafa no se entrega', scam.body?.moderationStatus === 'REJECTED', scam.body);
    check('y no lleva fecha de entrega', !scam.body?.deliveredAt, scam.body);
  } else {
    check('hay una conversación que moderar', false, 'no se pudo crear la conexión');
  }

  console.log('\nRF-CON-03 — chat en tiempo real');
  if (conversationId) {
    await checkRealtime(conversationId, token);
  }

  console.log(`\n${checks - failures}/${checks} comprobaciones correctas`);
  if (failures > 0) {
    console.error(`${failures} fallo(s)`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
