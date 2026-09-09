/**
 * Lo que el servidor le dice a una persona, en su idioma (RNF-06).
 *
 * Avisos push, campana y correo «NOTIFICATION» salen de aquí. Cada mensaje es
 * una función de sus parámetros para los dos idiomas; el inglés está tipado
 * contra el español, así que una clave nueva sin traducción no compila.
 *
 * Misma voz que la interfaz: serena, directa, sin lenguaje de conquista, sin
 * rachas ni reproches. Nombres de personas, iglesias y ciudades viajan tal
 * cual; las fechas se formatean en el idioma y la hora de Santo Domingo.
 */
export type ServerLocale = 'es-DO' | 'en-US';

export interface ServerMessage {
  title: string;
  body: string;
}

export function serverLocale(value: string | null | undefined): ServerLocale {
  return value === 'en-US' ? 'en-US' : 'es-DO';
}

const TZ = process.env.APP_TIMEZONE ?? 'America/Santo_Domingo';

export function formatWhen(date: Date, locale: ServerLocale): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: TZ,
  }).format(date);
}

const ES = {
  'connection.new': () => ({
    title: 'Nueva conexión',
    body: 'Se marcaron interés mutuamente. ¡Ya pueden conversar!',
  }),
  'interest.received': () => ({
    title: 'Alguien te marcó interés',
    body: 'Descubre quién en Yugo Plus, o sigue marcando interés para coincidir.',
  }),
  'group.requestApproved': () => ({
    title: 'Solicitud aprobada',
    body: 'Ya eres parte del grupo. ¡Bienvenido!',
  }),
  'story.written': () => ({
    title: 'Escribieron la historia de ustedes',
    body: 'Léela y dinos si estás de acuerdo en que se publique. Sin tu sí no se publica.',
  }),
  'story.published': () => ({
    title: 'Su historia ya está publicada',
    body: 'Gracias por contarla. Puede ser justo lo que alguien necesita leer hoy.',
  }),
  'story.rejected': (p: { note?: string | null }) => ({
    title: 'Sobre su historia',
    body: p.note ?? 'No pudimos publicarla por ahora.',
  }),
  'identity.approved': () => ({
    title: 'Identidad verificada',
    body: 'Tu selfie fue aprobada. Tu perfil ahora muestra la insignia de identidad.',
  }),
  'identity.rejected': () => ({
    title: 'Selfie rechazada',
    body: 'Tu selfie no pudo validarse. Intenta de nuevo con buena luz y sin lentes.',
  }),
  'identity.revoked': (p: { reason: string }) => ({
    title: 'Verificación revocada',
    body: `Tu verificación fue revocada: ${p.reason}`,
  }),
  'endorsement.confirmed': (p: { church: string }) => ({
    title: 'Respaldo de iglesia confirmado',
    body: `Tu perfil ahora muestra "Respaldado por ${p.church}".`,
  }),
  'endorsement.revoked': () => ({
    title: 'Respaldo de iglesia retirado',
    body: 'Tu congregación retiró el respaldo de tu perfil.',
  }),
  'account.update': (p: { reason: string }) => ({
    title: 'Actualización de tu cuenta',
    body: p.reason,
  }),
  'report.reviewed': (p: { actionTaken: boolean }) => ({
    title: 'Revisamos tu reporte',
    body: p.actionTaken
      ? 'Una persona del equipo lo revisó y tomó medidas. Gracias por avisar: así cuidamos la comunidad entre todos.'
      : 'Una persona del equipo lo revisó. No encontramos una falta al Pacto, pero tu aviso queda registrado y nos ayuda a cuidar la comunidad.',
  }),
  'content.published': (p: { what: string }) => ({
    title: `Tu ${p.what} ya está publicada`,
    body: 'Una persona del equipo la revisó y ya la puede ver la comunidad.',
  }),
  'content.rejected': (p: { what: string }) => ({
    title: `Tu ${p.what} no se publicó`,
    body: 'Una persona del equipo la revisó y no cumple el Pacto de conducta.',
  }),
  'message.rejected': () => ({
    title: 'Mensaje no entregado',
    body: 'Tu mensaje no se entregó porque incumple el Pacto de conducta. Cuida el respeto en la conversación.',
  }),
  'church.approved': (p: { church: string }) => ({
    title: `${p.church} ya está en Yugo`,
    body: 'El equipo de Yugo aprobó la iglesia. Ya tienen grupo oficial y pueden publicar eventos y entregar códigos de respaldo.',
  }),
  'church.rejected': (p: { church: string; note?: string | null }) => ({
    title: `Revisamos la solicitud de ${p.church}`,
    body: `No pudimos aprobarla por ahora.${p.note ? ` Nota del equipo: ${p.note}` : ''} Puedes escribirnos para revisarlo.`,
  }),
  'event.approved': (p: { title: string }) => ({
    title: `«${p.title}» ya está publicado`,
    body: 'Ya aparece en la agenda de la app. Imprime el QR desde el portal para el check-in.',
  }),
  'event.returned': (p: { title: string; note?: string | null }) => ({
    title: `«${p.title}» necesita cambios`,
    body: `El equipo lo devolvió${p.note ? `: ${p.note}` : ' con una nota'}. Corrígelo y vuelve a enviarlo.`,
  }),
  'group.approved': (p: { name: string }) => ({
    title: `«${p.name}» ya está abierto`,
    body: 'El equipo aprobó tu grupo. Ya aparece en Comunidad y puedes invitar a otras personas.',
  }),
  'group.rejected': (p: { name: string }) => ({
    title: `Revisamos «${p.name}»`,
    body: 'No pudimos aprobarlo tal como está. Revisa el nombre y la descripción y vuelve a proponerlo.',
  }),
  'purpose.nudge': () => ({
    title: 'Sobre cómo estás usando Yugo',
    body: 'Notamos que marcas interés en mucha gente y conversas con pocas. No hay problema en tomarse su tiempo — solo queremos recordarte lo que aceptaste al entrar: aquí se busca conocer a alguien de verdad, no acumular conexiones.',
  }),
  'city.filling': (p: { city: string; count: number }) => ({
    title: `${p.city} ya se está llenando`,
    body: `Ya hay ${p.count} personas con perfil completo en tu ciudad. Tu lista de Descubrir de hoy tiene caras nuevas.`,
  }),
  'message.new': (p: { preview: string }) => ({
    title: 'Nuevo mensaje',
    body: p.preview,
  }),
  'connection.closed': (p: { name: string; text: string }) => ({
    title: `${p.name || 'Tu conexión'} cerró la conexión`,
    body: p.text,
  }),
  'connection.inactive': (p: { name: string }) => ({
    title: 'Conexión sin actividad',
    body: `Hace un mes que no conversas con ${p.name || 'tu conexión'}. Un saludo sencillo basta para retomar.`,
  }),
  'answers.revealed': (p: { question: string }) => ({
    title: 'Ya pueden verse las dos respuestas',
    body: `Contestaron «${p.question}».`,
  }),
  'answers.pending': (p: { question: string }) => ({
    title: 'Te dejaron una conversación pendiente',
    body: `Contestaron «${p.question}». Cuando contestes tú, se ven las dos.`,
  }),
  'meeting.checkIn': (p: { contact?: string | null }) => ({
    title: '¿Todo bien?',
    body: p.contact
      ? `Cuéntanos cómo te fue, y no olvides avisarle a ${p.contact}.`
      : 'Cuéntanos cómo te fue. Si algo no estuvo bien, puedes reportarlo desde la conversación.',
  }),
  'intro.received': (p: { mentor: string; note: string }) => ({
    title: `${p.mentor} quiere presentarte a alguien`,
    body: p.note,
  }),
  'intro.notConcluded': () => ({
    title: 'La presentación no se concretó',
    body: 'Una de las dos personas prefirió no seguir. Gracias por intentarlo; a veces el tiempo no es este.',
  }),
  'intro.matched': (p: { mentor: string }) => ({
    title: 'Presentación aceptada',
    body: `${p.mentor} los presentó y los dos dijeron que sí. Ya pueden conversar.`,
  }),
  'intro.proposerMatched': () => ({
    title: 'Se saludaron',
    body: 'Las dos personas aceptaron la presentación. Lo que hablen es de ellas; tú ya hiciste tu parte.',
  }),
  'video.proposed': (p: { name: string; when: Date }) => ({
    title: `${p.name || 'Tu conexión'} propuso una videollamada`,
    body: `${formatWhen(p.when, 'es-DO')} · 15 minutos, dentro de Yugo.`,
  }),
  'video.cancelled': (p: { name: string; when: Date }) => ({
    title: 'Videollamada cancelada',
    body: `${p.name || 'Tu conexión'} canceló la videollamada de ${formatWhen(p.when, 'es-DO')}.`,
  }),
  'stage.proposed': (p: { name: string }) => ({
    title: 'Una propuesta sobre su vínculo',
    body: `${p.name || 'Tu conexión'} propone avanzar de etapa.`,
  }),
  'stage.advanced': (p: { exclusive: boolean }) => ({
    title: 'Avanzaron de etapa',
    body: p.exclusive ? 'Ninguno de los dos aparece ya en Descubrir.' : 'Lo declararon los dos.',
  }),
  'stage.declined': () => ({
    title: 'Sobre la etapa que propusiste',
    body: 'Prefiere esperar. Pueden volver a hablarlo cuando quieran.',
  }),
  'journey.milestone': (p: { name: string; title: string }) => ({
    title: 'Un paso de su ruta',
    body: `${p.name} marcó «${p.title}».`,
  }),
  'counseling.requestedPartner': (p: { name: string; church: string }) => ({
    title: 'Consejería con la iglesia',
    body: `${p.name} quiere pedirle consejería a ${p.church}. Falta tu confirmación.`,
  }),
  'counseling.partnerDeclined': () => ({
    title: 'Consejería con la iglesia',
    body: 'La otra persona prefirió esperar. Pueden volver a pedirla cuando quieran.',
  }),
  'counseling.waitingChurch': (p: { church: string }) => ({
    title: 'Consejería con la iglesia',
    body: `${p.church} ya recibió la petición. Les avisaremos cuando responda.`,
  }),
  'counseling.churchNotice': (p: { names: [string, string]; church: string }) => ({
    title: 'Una pareja pide consejería',
    body: `${p.names[0]} y ${p.names[1]} piden consejería prematrimonial a ${p.church}.`,
  }),
  'counseling.churchAccepted': (p: { church: string; message?: string | null }) => ({
    title: `${p.church} aceptó acompañarlos`,
    body: p.message ?? `${p.church} aceptó acompañarlos.`,
  }),
  'counseling.churchDeclined': (p: { church: string; message?: string | null }) => ({
    title: `Sobre la consejería con ${p.church}`,
    body: p.message ?? `${p.church} no puede tomarla ahora.`,
  }),
  'accomp.partnerInvited': (p: { mentor: string }) => ({
    title: 'Los quieren acompañar',
    body: `Tu conexión invitó a ${p.mentor || 'un matrimonio'} a acompañarlos. Hace falta que tú también estés de acuerdo.`,
  }),
  'accomp.mentorInvited': () => ({
    title: 'Una pareja pide acompañamiento',
    body: 'Te invitaron a acompañar un vínculo. Verás su etapa, nunca sus conversaciones.',
  }),
  'accomp.mentorStarted': () => ({
    title: 'Empezaste a acompañar',
    body: 'Verás en qué etapa está el vínculo. Las conversaciones son solo de ellos.',
  }),
  'accomp.advanced': (p: { stage: string }) => ({
    title: 'La pareja que acompañas avanzó',
    body: `Ahora están en «${p.stage}».`,
  }),
  'accomp.active': (p: { mentor: string }) => ({
    title: 'Ya los acompañan',
    body: `${p.mentor || 'El matrimonio'} aceptó acompañarlos. Ve su etapa, nunca sus conversaciones.`,
  }),
  'accomp.ended': () => ({
    title: 'El acompañamiento terminó',
    body: 'Cualquiera de los tres puede terminarlo, sin dar explicaciones.',
  }),
  'accomp.declined': () => ({
    title: 'Sobre el acompañamiento',
    body: 'El matrimonio no puede acompañarlos ahora. Pueden invitar a otro cuando quieran.',
  }),
  'weekend.plan': (p: {
    event?: { title: string; churchName: string; startsAt: Date } | null;
    devotional?: { reference: string; title: string } | null;
    quiet?: { displayName: string; days: number } | null;
  }) => {
    const lines: string[] = [];
    if (p.event) {
      lines.push(
        `${p.event.title} (${p.event.churchName}) ${formatWhen(p.event.startsAt, 'es-DO')}`,
      );
    }
    if (p.devotional) lines.push(`Mañana: ${p.devotional.reference}, «${p.devotional.title}»`);
    if (p.quiet) lines.push(`${p.quiet.displayName} lleva ${p.quiet.days} días sin saber de ti`);
    return { title: 'Tu plan de domingo', body: lines.join(' · ') };
  },
  'event.seatFreed': (p: { title: string }) => ({
    title: 'Se liberó un cupo',
    body: `Ya tienes lugar en «${p.title}».`,
  }),
  'event.reminder': (p: { title: string }) => ({
    title: 'Recordatorio de evento',
    body: `${p.title} es mañana.`,
  }),
  'prayer.praying': (p: { count: number }) => ({
    title: 'Alguien está orando por ti',
    body:
      p.count === 1
        ? 'Una persona de la comunidad está orando por tu petición.'
        : `${p.count} personas están orando por tu petición.`,
  }),
  'prayer.answered': (p: { text?: string | null }) => ({
    title: 'Una petición por la que oraste fue contestada',
    body: p.text ?? 'Gracias por acompañar.',
  }),
};

export type ServerMessageKey = keyof typeof ES;
export type ServerMessageParams<K extends ServerMessageKey> = Parameters<(typeof ES)[K]>[0];

/** English, typed against Spanish: every key, same parameters. */
const EN: { [K in ServerMessageKey]: (typeof ES)[K] } = {
  'connection.new': () => ({
    title: 'New connection',
    body: 'You showed interest in each other. You can talk now!',
  }),
  'interest.received': () => ({
    title: 'Someone showed interest in you',
    body: 'See who with Yugo Plus, or keep showing interest to match.',
  }),
  'group.requestApproved': () => ({
    title: 'Request approved',
    body: 'You are now part of the group. Welcome!',
  }),
  'story.written': () => ({
    title: 'Your story was written',
    body: 'Read it and tell us whether you agree to publish it. Without your yes it is not published.',
  }),
  'story.published': () => ({
    title: 'Your story is published',
    body: 'Thank you for telling it. It may be exactly what someone needs to read today.',
  }),
  'story.rejected': (p) => ({
    title: 'About your story',
    body: p.note ?? "We couldn't publish it for now.",
  }),
  'identity.approved': () => ({
    title: 'Identity verified',
    body: 'Your selfie was approved. Your profile now shows the identity badge.',
  }),
  'identity.rejected': () => ({
    title: 'Selfie not approved',
    body: "Your selfie couldn't be validated. Try again in good light and without glasses.",
  }),
  'identity.revoked': (p) => ({
    title: 'Verification revoked',
    body: `Your verification was revoked: ${p.reason}`,
  }),
  'endorsement.confirmed': (p) => ({
    title: 'Church endorsement confirmed',
    body: `Your profile now shows "Endorsed by ${p.church}".`,
  }),
  'endorsement.revoked': () => ({
    title: 'Church endorsement withdrawn',
    body: 'Your congregation withdrew the endorsement from your profile.',
  }),
  'account.update': (p) => ({
    title: 'An update about your account',
    body: p.reason,
  }),
  'report.reviewed': (p) => ({
    title: 'We reviewed your report',
    body: p.actionTaken
      ? 'Someone on the team reviewed it and took action. Thank you for telling us: that is how we care for the community together.'
      : "Someone on the team reviewed it. We didn't find a breach of the Covenant, but your report is on record and helps us care for the community.",
  }),
  'content.published': () => ({
    title: 'Your post is published',
    body: 'Someone on the team reviewed it and the community can see it now.',
  }),
  'content.rejected': () => ({
    title: "Your post wasn't published",
    body: "Someone on the team reviewed it and it doesn't meet the Covenant of conduct.",
  }),
  'message.rejected': () => ({
    title: 'Message not delivered',
    body: "Your message wasn't delivered because it breaks the Covenant of conduct. Keep the conversation respectful.",
  }),
  'church.approved': (p) => ({
    title: `${p.church} is now on Yugo`,
    body: 'The Yugo team approved the church. You now have an official group and can publish events and hand out endorsement codes.',
  }),
  'church.rejected': (p) => ({
    title: `We reviewed the request from ${p.church}`,
    body: `We couldn't approve it for now.${p.note ? ` Team note: ${p.note}` : ''} You can write to us to review it.`,
  }),
  'event.approved': (p) => ({
    title: `"${p.title}" is published`,
    body: 'It now appears in the app agenda. Print the QR from the portal for check-in.',
  }),
  'event.returned': (p) => ({
    title: `"${p.title}" needs changes`,
    body: `The team sent it back${p.note ? `: ${p.note}` : ' with a note'}. Fix it and send it again.`,
  }),
  'group.approved': (p) => ({
    title: `"${p.name}" is open`,
    body: 'The team approved your group. It now appears in Community and you can invite other people.',
  }),
  'group.rejected': (p) => ({
    title: `We reviewed "${p.name}"`,
    body: "We couldn't approve it as it is. Review the name and description and propose it again.",
  }),
  'purpose.nudge': () => ({
    title: 'About how you are using Yugo',
    body: 'We noticed you show interest in many people and talk with few. Taking your time is fine; we just want to remind you of what you accepted when you joined: this is a place to really get to know someone, not to collect connections.',
  }),
  'city.filling': (p) => ({
    title: `${p.city} is filling up`,
    body: `There are now ${p.count} people with a complete profile in your city. Today's Discover list has new faces.`,
  }),
  'message.new': (p) => ({
    title: 'New message',
    body: p.preview,
  }),
  'connection.closed': (p) => ({
    title: `${p.name || 'Your connection'} closed the connection`,
    body: p.text,
  }),
  'connection.inactive': (p) => ({
    title: 'Quiet connection',
    body: `It has been a month since you talked with ${p.name || 'your connection'}. A simple hello is enough to pick it up.`,
  }),
  'answers.revealed': (p) => ({
    title: 'Both answers can be seen now',
    body: `You both answered "${p.question}".`,
  }),
  'answers.pending': (p) => ({
    title: 'A conversation is waiting for you',
    body: `They answered "${p.question}". When you answer, both appear.`,
  }),
  'meeting.checkIn': (p) => ({
    title: 'Everything okay?',
    body: p.contact
      ? `Tell us how it went, and don't forget to let ${p.contact} know.`
      : "Tell us how it went. If something wasn't right, you can report it from the conversation.",
  }),
  'intro.received': (p) => ({
    title: `${p.mentor} wants to introduce you to someone`,
    body: p.note,
  }),
  'intro.notConcluded': () => ({
    title: "The introduction didn't happen",
    body: 'One of the two people preferred not to continue. Thank you for trying; sometimes the time is not now.',
  }),
  'intro.matched': (p) => ({
    title: 'Introduction accepted',
    body: `${p.mentor} introduced you and you both said yes. You can talk now.`,
  }),
  'intro.proposerMatched': () => ({
    title: 'They said hello',
    body: 'Both people accepted the introduction. What they talk about is theirs; you did your part.',
  }),
  'video.proposed': (p) => ({
    title: `${p.name || 'Your connection'} proposed a video call`,
    body: `${formatWhen(p.when, 'en-US')} · 15 minutes, inside Yugo.`,
  }),
  'video.cancelled': (p) => ({
    title: 'Video call cancelled',
    body: `${p.name || 'Your connection'} cancelled the video call on ${formatWhen(p.when, 'en-US')}.`,
  }),
  'stage.proposed': (p) => ({
    title: 'A proposal about your bond',
    body: `${p.name || 'Your connection'} proposes moving to the next stage.`,
  }),
  'stage.advanced': (p) => ({
    title: 'You moved to the next stage',
    body: p.exclusive ? 'Neither of you appears in Discover anymore.' : 'You both declared it.',
  }),
  'stage.declined': () => ({
    title: 'About the stage you proposed',
    body: 'They prefer to wait. You can talk about it again whenever you want.',
  }),
  'journey.milestone': (p) => ({
    title: 'A step on your path',
    body: `${p.name} marked "${p.title}".`,
  }),
  'counseling.requestedPartner': (p) => ({
    title: 'Counseling with the church',
    body: `${p.name} wants to ask ${p.church} for counseling. Your confirmation is missing.`,
  }),
  'counseling.partnerDeclined': () => ({
    title: 'Counseling with the church',
    body: 'The other person preferred to wait. You can ask again whenever you want.',
  }),
  'counseling.waitingChurch': (p) => ({
    title: 'Counseling with the church',
    body: `${p.church} received the request. We'll let you know when they answer.`,
  }),
  'counseling.churchNotice': (p) => ({
    title: 'A couple asks for counseling',
    body: `${p.names[0]} and ${p.names[1]} ask ${p.church} for premarital counseling.`,
  }),
  'counseling.churchAccepted': (p) => ({
    title: `${p.church} agreed to walk with you`,
    body: p.message ?? `${p.church} agreed to walk with you.`,
  }),
  'counseling.churchDeclined': (p) => ({
    title: `About counseling with ${p.church}`,
    body: p.message ?? `${p.church} can't take it right now.`,
  }),
  'accomp.partnerInvited': (p) => ({
    title: 'Someone wants to walk with you',
    body: `Your connection invited ${p.mentor || 'a married couple'} to walk with you. You need to agree too.`,
  }),
  'accomp.mentorInvited': () => ({
    title: 'A couple asks for accompaniment',
    body: 'You were invited to walk with a bond. You will see their stage, never their conversations.',
  }),
  'accomp.mentorStarted': () => ({
    title: 'You started walking with a couple',
    body: 'You will see what stage the bond is in. The conversations are theirs alone.',
  }),
  'accomp.advanced': (p) => ({
    title: 'The couple you walk with moved forward',
    body: `They are now in "${p.stage}".`,
  }),
  'accomp.active': (p) => ({
    title: 'They now walk with you',
    body: `${p.mentor || 'The couple'} agreed to walk with you. They see your stage, never your conversations.`,
  }),
  'accomp.ended': () => ({
    title: 'The accompaniment ended',
    body: 'Any of the three can end it, with no explanation needed.',
  }),
  'accomp.declined': () => ({
    title: 'About the accompaniment',
    body: "The couple can't walk with you right now. You can invite another whenever you want.",
  }),
  'weekend.plan': (p) => {
    const lines: string[] = [];
    if (p.event) {
      lines.push(
        `${p.event.title} (${p.event.churchName}) ${formatWhen(p.event.startsAt, 'en-US')}`,
      );
    }
    if (p.devotional) lines.push(`Tomorrow: ${p.devotional.reference}, "${p.devotional.title}"`);
    if (p.quiet) {
      lines.push(`${p.quiet.displayName} hasn't heard from you in ${p.quiet.days} days`);
    }
    return { title: 'Your Sunday plan', body: lines.join(' · ') };
  },
  'event.seatFreed': (p) => ({
    title: 'A seat opened up',
    body: `You now have a seat at "${p.title}".`,
  }),
  'event.reminder': (p) => ({
    title: 'Event reminder',
    body: `${p.title} is tomorrow.`,
  }),
  'prayer.praying': (p) => ({
    title: 'Someone is praying for you',
    body:
      p.count === 1
        ? 'One person from the community is praying for your request.'
        : `${p.count} people are praying for your request.`,
  }),
  'prayer.answered': (p) => ({
    title: 'A request you prayed for was answered',
    body: p.text ?? 'Thank you for coming alongside.',
  }),
};

const CATALOGS: Record<ServerLocale, typeof ES> = { 'es-DO': ES, 'en-US': EN };

/** Resolves a message in the given language. Unknown language falls back to es-DO. */
export function serverMessage<K extends ServerMessageKey>(
  locale: ServerLocale,
  key: K,
  ...params: ServerMessageParams<K> extends undefined ? [] : [ServerMessageParams<K>]
): ServerMessage {
  const fn = (CATALOGS[locale] ?? ES)[key] as (p?: unknown) => ServerMessage;
  return fn(params[0]);
}
