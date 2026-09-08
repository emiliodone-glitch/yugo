/* eslint-disable no-console */
/**
 * Cuenta de prueba con un mundo alrededor.
 *
 * Los 40 perfiles ficticios hacen que Descubrir tenga a quién mostrar, pero
 * una cuenta recién sembrada no tiene conexiones, ni chats, ni intereses
 * recibidos, ni lecturas: quien entra a validar ve la app vacía y no puede
 * juzgar cómo se siente cuando está viva. Esta cuenta llega con todo eso ya
 * pasado: conexiones en tres etapas distintas, una propuesta de etapa
 * esperando respuesta, mensajes sin leer, gente que marcó interés, un evento
 * al que va con una conexión, constancia en el devocional, una petición de
 * oración acompañada y notificaciones.
 *
 * Todo es idempotente (upserts y guardas): volver a sembrar no duplica nada
 * ni pisa lo que la persona haga después con la cuenta.
 *
 *   Entrar: prueba@yugo.do / Yugo.prueba1
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const EMAIL = 'prueba@yugo.do';
const PASSWORD = 'Yugo.prueba1';

const daysAgo = (n: number, hour = 9) => {
  const d = new Date(Date.now() - n * 86400000);
  d.setHours(hour, 0, 0, 0);
  return d;
};

export async function seedTester(prisma: PrismaClient) {
  const church = await prisma.church.findFirst({ orderBy: { name: 'asc' } });
  const denomination =
    (await prisma.denomination.findFirst({
      where: { name: { contains: 'Bautista', mode: 'insensitive' } },
    })) ?? (await prisma.denomination.findFirst());
  const areas = await prisma.serviceArea.findMany({ take: 3 });

  const tester = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { lastActiveAt: new Date() },
    create: {
      email: EMAIL,
      passwordHash: await argon2.hash(PASSWORD),
      role: 'MEMBER',
      birthDate: new Date('1995-03-14'),
      gender: 'MALE',
      emailVerifiedAt: new Date(),
      covenantAcceptedAt: daysAgo(40),
      covenantVersion: '1.0',
      lastActiveAt: new Date(),
      profile: {
        create: {
          displayName: 'Samuel',
          city: 'Santo Domingo',
          province: 'Distrito Nacional',
          lat: 18.4861,
          lng: -69.9312,
          occupation: 'Ingeniero de software',
          testimony:
            'Crecí en la iglesia, pero mi fe se hizo propia a los 24, en un año difícil. Sirvo en el ministerio de jóvenes y me gusta cocinar para muchos.',
          verse: 'Salmo 37:5',
          denominationId: denomination?.id,
          churchId: church?.id,
          yearsInFaith: 12,
          attendance: 'WEEKLY',
          intention: 'MARRIAGE',
          openness: 'AFFINE',
          hasChildren: false,
          completeness: 100,
          ageMin: 24,
          ageMax: 38,
          maxDistanceKm: 50,
          serviceAreas: { create: areas.map((area) => ({ serviceAreaId: area.id })) },
        },
      },
      verifications: {
        create: [
          { level: 1, method: 'OTP', status: 'APPROVED', resolvedAt: daysAgo(40) },
          {
            level: 2,
            method: 'SELFIE',
            status: 'APPROVED',
            similarity: 0.93,
            livenessPassed: true,
            resolvedAt: daysAgo(39),
          },
          ...(church
            ? [
                {
                  level: 3,
                  method: 'CHURCH_CODE' as const,
                  status: 'APPROVED' as const,
                  churchId: church.id,
                  resolvedAt: daysAgo(35),
                },
              ]
            : []),
        ],
      },
    },
  });

  // Mujeres de la demo (índices pares → demo1, demo3, …), dentro de su rango.
  const women = await prisma.user.findMany({
    where: {
      email: {
        in: [
          'demo1@yugo.do',
          'demo3@yugo.do',
          'demo5@yugo.do',
          'demo7@yugo.do',
          'demo9@yugo.do',
          'demo11@yugo.do',
          'demo13@yugo.do',
          'demo15@yugo.do',
        ],
      },
    },
    include: { profile: { select: { displayName: true } } },
    orderBy: { email: 'asc' },
  });
  const byEmail = (email: string) => women.find((w) => w.email === email);
  const nueva = byEmail('demo1@yugo.do');
  const charla = byEmail('demo3@yugo.do');
  const amistad = byEmail('demo5@yugo.do');
  const interesadas = ['demo7@yugo.do', 'demo9@yugo.do', 'demo11@yugo.do']
    .map(byEmail)
    .filter(Boolean);
  const guardada = byEmail('demo13@yugo.do');
  const enviada = byEmail('demo15@yugo.do');
  if (!nueva || !charla || !amistad) {
    console.log('Cuenta de prueba: faltan perfiles de demo; siembra los miembros antes.');
    return;
  }

  const match = async (other: { id: string }, data: Record<string, unknown>) =>
    prisma.match.upsert({
      where: { userAId_userBId: { userAId: tester.id, userBId: other.id } },
      update: {},
      create: { userAId: tester.id, userBId: other.id, status: 'ACTIVE', ...data },
    });

  // 1) Conexión nueva de hoy, sin mensajes todavía: el rompehielos espera.
  const m1 = await match(nueva, { stage: 'KNOWING', createdAt: daysAgo(0, 8) });
  await prisma.conversation.upsert({
    where: { matchId: m1.id },
    update: {},
    create: { matchId: m1.id },
  });

  // 2) Conociéndose, con conversación en marcha y dos mensajes sin leer.
  const m2 = await match(charla, { stage: 'KNOWING', createdAt: daysAgo(6) });
  const c2 = await prisma.conversation.upsert({
    where: { matchId: m2.id },
    update: {},
    create: { matchId: m2.id },
  });
  if ((await prisma.message.count({ where: { conversationId: c2.id } })) === 0) {
    const lines: Array<[string, string, number]> = [
      [charla.id, 'Vi que sirves con jóvenes, ¿cómo llegaste ahí?', 5],
      [tester.id, 'Empecé ayudando con el campamento y me quedé. ¿Y tú, en qué sirves?', 5],
      [charla.id, 'En alabanza desde hace tres años. Este domingo cantamos algo nuevo.', 4],
      [tester.id, '¡Qué bueno! Me gustaría escucharlo. ¿A qué hora es el culto?', 4],
      [charla.id, 'A las 10. Si vienes, te presento al grupo.', 1],
      [charla.id, '¿Te animas a la vigilia del viernes? Va gente de tu iglesia también.', 0],
    ];
    for (const [senderId, body, ago] of lines) {
      const mine = senderId === tester.id;
      await prisma.message.create({
        data: {
          conversationId: c2.id,
          senderId,
          body,
          moderationStatus: 'APPROVED',
          sentAt: daysAgo(ago, 20),
          deliveredAt: daysAgo(ago, 20),
          readAt: mine ? daysAgo(ago, 21) : ago >= 4 ? daysAgo(ago, 21) : null,
        },
      });
    }
  }

  // 3) Amistad intencional declarada, y ella propone noviazgo: falta la respuesta.
  const m3 = await match(amistad, {
    stage: 'INTENTIONAL_FRIENDSHIP',
    stageChangedAt: daysAgo(12),
    createdAt: daysAgo(30),
    proposedStage: 'COURTSHIP',
    proposedById: amistad.id,
    proposedAt: daysAgo(1, 19),
  });
  if ((await prisma.relationshipStageChange.count({ where: { matchId: m3.id } })) === 0) {
    await prisma.relationshipStageChange.create({
      data: {
        matchId: m3.id,
        fromStage: 'KNOWING',
        toStage: 'INTENTIONAL_FRIENDSHIP',
        proposedById: amistad.id,
        acceptedById: tester.id,
        createdAt: daysAgo(12),
      },
    });
  }
  const c3 = await prisma.conversation.upsert({
    where: { matchId: m3.id },
    update: {},
    create: { matchId: m3.id },
  });
  if ((await prisma.message.count({ where: { conversationId: c3.id } })) === 0) {
    const lines: Array<[string, string, number]> = [
      [
        tester.id,
        'Gracias por la conversación del sábado. Me dejó pensando en lo que dijiste de la paciencia.',
        9,
      ],
      [amistad.id, 'A mí también. Mis padres preguntaron por ti, por cierto.', 9],
      [tester.id, 'Me gustaría conocerlos. ¿El domingo después del culto?', 8],
      [amistad.id, 'Perfecto. Mi mamá ya está pensando qué cocinar.', 8],
      [
        amistad.id,
        'Samuel, he estado orando por esto. Quiero que demos el siguiente paso, si tú también lo sientes.',
        1,
      ],
    ];
    for (const [senderId, body, ago] of lines) {
      const mine = senderId === tester.id;
      await prisma.message.create({
        data: {
          conversationId: c3.id,
          senderId,
          body,
          moderationStatus: 'APPROVED',
          sentAt: daysAgo(ago, 21),
          deliveredAt: daysAgo(ago, 21),
          readAt: mine || ago > 1 ? daysAgo(ago, 22) : null,
        },
      });
    }
  }

  // 4) Tres personas marcaron interés en él; una con mensaje.
  for (const [index, who] of interesadas.entries()) {
    if (!who) continue;
    await prisma.interest.upsert({
      where: { fromUserId_toUserId: { fromUserId: who.id, toUserId: tester.id } },
      update: {},
      create: {
        fromUserId: who.id,
        toUserId: tester.id,
        createdAt: daysAgo(index, 12),
        message: index === 0 ? 'Vi que también sirves con jóvenes. Me gustaría conocerte.' : null,
      },
    });
  }
  // Él marcó interés en una (pendiente) y guardó otra para después.
  if (enviada) {
    await prisma.interest.upsert({
      where: { fromUserId_toUserId: { fromUserId: tester.id, toUserId: enviada.id } },
      update: {},
      create: { fromUserId: tester.id, toUserId: enviada.id, createdAt: daysAgo(2, 11) },
    });
  }
  if (guardada) {
    await prisma.savedProfile.upsert({
      where: { fromUserId_toUserId: { fromUserId: tester.id, toUserId: guardada.id } },
      update: {},
      create: { fromUserId: tester.id, toUserId: guardada.id },
    });
  }

  // 5) Eventos: va a uno con una conexión, le interesa otro.
  const events = await prisma.event.findMany({
    where: { status: 'PUBLISHED', startsAt: { gt: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 2,
  });
  if (events[0]) {
    for (const [userId, status] of [
      [tester.id, 'GOING'],
      [charla.id, 'GOING'],
    ] as const) {
      await prisma.eventAttendance.upsert({
        where: { eventId_userId: { eventId: events[0].id, userId } },
        update: {},
        create: { eventId: events[0].id, userId, status },
      });
    }
  }
  if (events[1]) {
    await prisma.eventAttendance.upsert({
      where: { eventId_userId: { eventId: events[1].id, userId: tester.id } },
      update: {},
      create: { eventId: events[1].id, userId: tester.id, status: 'INTERESTED' },
    });
  }

  // 6) Devocional: constancia de 9 lecturas en los últimos 12 días, una reflexión.
  const devotionals = await prisma.devotional.findMany({
    orderBy: { publishOn: 'desc' },
    take: 12,
  });
  for (const [index, devotional] of devotionals.entries()) {
    if ([2, 5, 8].includes(index)) continue; // días sin leer: la constancia no es una racha
    await prisma.devotionalRead.upsert({
      where: { devotionalId_userId: { devotionalId: devotional.id, userId: tester.id } },
      update: {},
      create: {
        devotionalId: devotional.id,
        userId: tester.id,
        readAt: new Date(devotional.publishOn.getTime() + 7 * 3600_000),
        reflection:
          index === 0
            ? 'Hoy me tocó: guardar el corazón no es esconderlo, es cuidarlo para entregarlo bien.'
            : null,
        reflectionStatus: index === 0 ? 'APPROVED' : null,
      },
    });
  }

  // 7) Oración: una petición suya acompañada, y él acompaña dos ajenas.
  const mine = await prisma.prayerRequest.findFirst({ where: { userId: tester.id } });
  const request =
    mine ??
    (await prisma.prayerRequest.create({
      data: {
        userId: tester.id,
        body: 'Por sabiduría en una decisión de trabajo que cambia dónde voy a vivir. Quiero elegir bien, no rápido.',
        anonymous: false,
        churchId: church?.id,
        moderationStatus: 'APPROVED',
        createdAt: daysAgo(3, 7),
      },
    }));
  for (const who of women.slice(0, 5)) {
    await prisma.prayerIntercession.upsert({
      where: { requestId_userId: { requestId: request.id, userId: who.id } },
      update: {},
      create: { requestId: request.id, userId: who.id, createdAt: daysAgo(2) },
    });
  }
  const others = await prisma.prayerRequest.findMany({
    where: { userId: { not: tester.id }, moderationStatus: 'APPROVED' },
    take: 2,
    orderBy: { createdAt: 'desc' },
  });
  for (const other of others) {
    await prisma.prayerIntercession.upsert({
      where: { requestId_userId: { requestId: other.id, userId: tester.id } },
      update: {},
      create: { requestId: other.id, userId: tester.id },
    });
  }

  // 8) Comunidad: en el grupo oficial de su iglesia y en uno más.
  const groups = await prisma.group.findMany({
    where: { status: 'ACTIVE', OR: [{ churchId: church?.id ?? undefined }, { type: 'OPEN' }] },
    orderBy: [{ type: 'desc' }, { createdAt: 'asc' }],
    take: 2,
  });
  for (const group of groups) {
    await prisma.groupMember.upsert({
      where: { groupId_userId: { groupId: group.id, userId: tester.id } },
      update: {},
      create: { groupId: group.id, userId: tester.id, role: 'MEMBER', joinedAt: daysAgo(20) },
    });
  }

  // 9) Notificaciones recientes, dos sin leer.
  if ((await prisma.notification.count({ where: { userId: tester.id } })) === 0) {
    const amistadName = amistad.profile?.displayName ?? 'Tu conexión';
    await prisma.notification.createMany({
      data: [
        {
          userId: tester.id,
          category: 'CONNECTION',
          title: 'Propuso una etapa',
          body: `${amistadName} propone que pasen a «Noviazgo».`,
          data: { matchId: m3.id },
          createdAt: daysAgo(1, 19),
        },
        {
          userId: tester.id,
          category: 'MESSAGE',
          title: 'Nuevo mensaje',
          body: '¿Te animas a la vigilia del viernes?',
          data: { conversationId: c2.id },
          createdAt: daysAgo(0, 8),
        },
        {
          userId: tester.id,
          category: 'CONNECTION',
          title: 'Nueva conexión',
          body: `${nueva.profile?.displayName ?? 'Alguien'} y tú se marcaron interés. Ya pueden conversar.`,
          data: { matchId: m1.id },
          createdAt: daysAgo(0, 8),
          readAt: daysAgo(0, 9),
        },
        {
          userId: tester.id,
          category: 'GROUP',
          title: 'Oraron por ti',
          body: '5 personas están acompañando tu petición.',
          data: { prayerRequestId: request.id },
          createdAt: daysAgo(2, 10),
          readAt: daysAgo(2, 12),
        },
      ],
    });
  }

  console.log(`Cuenta de prueba: ${EMAIL} / ${PASSWORD} (${tester.id})`);

  await seedChurchAdmin(prisma, tester.id);
}

const CHURCH_EMAIL = 'iglesia@yugo.do';
const CHURCH_PASSWORD = 'Yugo.iglesia1';

/**
 * Cuenta que administra el portal de una iglesia.
 *
 * Sin ella nadie podía entrar a /iglesias con datos reales: la semilla creaba
 * iglesias aprobadas pero ningún usuario vinculado. Llega con códigos de
 * respaldo vigentes, dos solicitudes de respaldo pendientes y un encuentro en
 * revisión, para que el portal y el panel admin tengan algo que hacer.
 *
 *   Entrar: iglesia@yugo.do / Yugo.iglesia1
 */
async function seedChurchAdmin(prisma: PrismaClient, testerId: string) {
  const church = await prisma.church.findFirst({
    where: { status: 'APPROVED' },
    orderBy: { name: 'asc' },
  });
  if (!church) return;

  const leader = await prisma.user.upsert({
    where: { email: CHURCH_EMAIL },
    update: { lastActiveAt: new Date() },
    create: {
      email: CHURCH_EMAIL,
      passwordHash: await argon2.hash(CHURCH_PASSWORD),
      role: 'MEMBER',
      birthDate: new Date('1978-06-02'),
      gender: 'MALE',
      emailVerifiedAt: new Date(),
      covenantAcceptedAt: daysAgo(120),
      covenantVersion: '1.0',
      lastActiveAt: new Date(),
      profile: {
        create: {
          displayName: 'Pastor Luis',
          city: church.city ?? 'Santo Domingo',
          occupation: 'Pastor',
          churchId: church.id,
          intention: 'FRIENDSHIP',
          openness: 'ALL',
          completeness: 40,
          ageMin: 30,
          ageMax: 60,
          maxDistanceKm: 50,
        },
      },
      verifications: {
        create: [{ level: 1, method: 'OTP', status: 'APPROVED', resolvedAt: daysAgo(120) }],
      },
    },
  });

  await prisma.churchUser.upsert({
    where: { churchId_userId: { churchId: church.id, userId: leader.id } },
    update: { role: 'ADMIN' },
    create: { churchId: church.id, userId: leader.id, role: 'ADMIN' },
  });

  // Códigos vigentes, algunos ya canjeados, para que la tasa de canje no sea 0.
  const prefix = church.name
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 4)
    .toUpperCase();
  if ((await prisma.endorsementCode.count({ where: { churchId: church.id } })) === 0) {
    await prisma.endorsementCode.createMany({
      data: Array.from({ length: 12 }, (_, index) => ({
        churchId: church.id,
        code: `${prefix}-SEED${String(index + 1).padStart(4, '0')}`,
        createdAt: daysAgo(20),
        expiresAt: daysAgo(-10),
        usedAt: index < 5 ? daysAgo(15 - index) : null,
        usedById: index === 0 ? testerId : null,
      })),
    });
  }

  // Solicitudes de respaldo pendientes de dos miembros de demostración.
  const candidates = await prisma.user.findMany({
    where: { email: { in: ['demo2@yugo.do', 'demo4@yugo.do'] } },
    select: { id: true },
  });
  for (const [index, candidate] of candidates.entries()) {
    const existing = await prisma.endorsementRequest.findFirst({
      where: { userId: candidate.id, churchId: church.id },
    });
    if (!existing) {
      await prisma.endorsementRequest.create({
        data: {
          userId: candidate.id,
          churchId: church.id,
          attendsSince: 2021 + index,
          leaderName: index === 0 ? 'Pastor Luis' : null,
          status: 'PENDING',
          createdAt: daysAgo(3 - index),
        },
      });
    }
  }

  // El grupo oficial que la aprobación crea: la iglesia sembrada llegó ya
  // aprobada, así que se crea aquí si falta (RF-IGL-04, RF-COM-03).
  const officialGroup = await prisma.group.findUnique({ where: { churchId: church.id } });
  if (!officialGroup) {
    await prisma.group.create({
      data: {
        name: church.name,
        description: `Grupo oficial de ${church.name}.`,
        type: 'OFFICIAL',
        status: 'ACTIVE',
        churchId: church.id,
        city: church.city,
        members: { create: { userId: leader.id, role: 'ADMIN' } },
      },
    });
  }

  // Dos selfies esperando revisión, para que la cola de verificación del
  // panel tenga casos reales (RF-ADM-03). Sin archivo: la pantalla lo dice.
  const applicants = await prisma.user.findMany({
    where: { email: { in: ['demo6@yugo.do', 'demo7@yugo.do'] } },
    select: { id: true },
  });
  for (const [index, applicant] of applicants.entries()) {
    const open = await prisma.verification.findFirst({
      where: { userId: applicant.id, level: 2, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (!open) {
      await prisma.verification.create({
        data: {
          userId: applicant.id,
          level: 2,
          method: 'SELFIE',
          status: 'PENDING',
          similarity: index === 0 ? 0.91 : 0.74,
          livenessPassed: true,
          priority: index === 0,
          createdAt: daysAgo(1 - index, 9),
        },
      });
    }
  }

  // Un encuentro esperando revisión del equipo de Yugo (RF-EVE-02).
  const inReview = await prisma.event.findFirst({
    where: { churchId: church.id, status: 'IN_REVIEW' },
  });
  if (!inReview) {
    await prisma.event.create({
      data: {
        churchId: church.id,
        title: 'Retiro de damas: Mujer virtuosa',
        description:
          'Un día de enseñanza, adoración y descanso para las mujeres de la congregación y sus invitadas.',
        type: 'RETIRO',
        startsAt: daysAgo(-18, 8),
        endsAt: daysAgo(-18, 17),
        address: church.address ?? undefined,
        city: church.city ?? 'Santo Domingo',
        lat: church.lat ?? 18.4861,
        lng: church.lng ?? -69.9312,
        capacity: 80,
        audience: 'CONGREGATION',
        status: 'IN_REVIEW',
      },
    });
  }

  console.log(`Cuenta de iglesia: ${CHURCH_EMAIL} / ${CHURCH_PASSWORD} (${church.name})`);
}
