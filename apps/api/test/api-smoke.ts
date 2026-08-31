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

async function login(identifier: string): Promise<string> {
  const result = await call('POST', '/auth/login', {
    body: { identifier, password: PASSWORD },
  });
  if (!result.body?.accessToken) {
    throw new Error(`login failed for ${identifier}: ${JSON.stringify(result.body)}`);
  }
  return result.body.accessToken;
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
 * The first seeded member who still has people to see. Running the suite marks
 * interests, and those people correctly stop appearing, so a second run on the
 * same database needs a different viewer — or a reseed.
 */
async function firstViewerWithCandidates(): Promise<{
  token: string;
  me: Json;
  items: any[];
} | null> {
  for (const email of ['demo1@yugo.do', 'demo3@yugo.do', 'demo5@yugo.do']) {
    const token = await login(email);
    const me = await call('GET', '/auth/me', { token });
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
