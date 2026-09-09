import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { serverLocale, type ServerLocale } from '../../common/i18n/server-messages';
import { QueueService } from './queue.service';

export type EmailTemplate =
  | 'WELCOME'
  | 'OTP'
  | 'VERIFICATION_RESULT'
  | 'PAYMENT_RECEIPT'
  | 'WEEKLY_DIGEST'
  | 'MODERATION_NOTICE'
  | 'DATA_EXPORT_READY'
  | 'NOTIFICATION'
  | 'CHURCH_INVITE'
  | 'WEEKEND_PLAN';

interface TemplateInput {
  displayName?: string;
  [key: string]: unknown;
}

/**
 * Transactional email (RF-NOT-03). Templates live here so the copy is
 * centralized like the rest of the user-visible strings: Spanish (es-DO) by
 * default and English for the diaspora when the account asks for it (RNF-06).
 * SMTP in local dev points at Mailpit; production can swap to Resend by env.
 */
@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transport: nodemailer.Transporter | null = null;

  constructor(private readonly queues: QueueService) {}

  onModuleInit() {
    if (process.env.SMTP_HOST) {
      this.transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 1025),
        secure: Number(process.env.SMTP_PORT) === 465,
        ...(process.env.SMTP_USER
          ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } }
          : {}),
      });
    }
    this.queues.register('email', async (payload) => {
      await this.deliver(
        payload.to as string,
        payload.subject as string,
        payload.html as string,
        payload.text as string,
      );
    });
  }

  /** Renders a template in the recipient's language and enqueues it. */
  async send(
    to: string,
    template: EmailTemplate,
    input: TemplateInput = {},
    locale: string | null | undefined = 'es-DO',
  ) {
    const { subject, html, text } = renderTemplate(template, input, serverLocale(locale));
    await this.queues.add('email', { to, subject, html, text });
  }

  private async deliver(to: string, subject: string, html: string, text: string) {
    if (!this.transport) {
      this.logger.log(`[email:${subject}] → ${to}\n${text}`);
      return;
    }
    await this.transport.sendMail({
      from: process.env.MAIL_FROM ?? 'Yugo <hola@yugo.do>',
      to,
      subject,
      html,
      text,
    });
  }
}

const BRAND = {
  ink: '#22315C',
  wheat: '#E0B25A',
  linen: '#FAF8F3',
  muted: '#6C7280',
};

const CHROME: Record<ServerLocale, { lang: string; tagline: string; footer: string }> = {
  'es-DO': {
    lang: 'es',
    tagline: 'Unidos en la misma fe',
    footer:
      'Recibes este correo porque tienes una cuenta en Yugo. Puedes ajustar tus preferencias de notificación en la aplicación.',
  },
  'en-US': {
    lang: 'en',
    tagline: 'United in the same faith',
    footer:
      'You receive this email because you have a Yugo account. You can adjust your notification preferences in the app.',
  },
};

function layout(title: string, bodyHtml: string, locale: ServerLocale): string {
  const chrome = CHROME[locale];
  return `<!doctype html><html lang="${chrome.lang}"><body style="margin:0;background:${BRAND.linen};font-family:'DM Sans',system-ui,sans-serif;color:#1B1F2A">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #E4E0D5">
      <tr><td style="background:${BRAND.ink};padding:20px 24px">
        <div style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#fff">Yugo</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:${BRAND.wheat}">${chrome.tagline}</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="font-family:Georgia,serif;font-size:20px;color:${BRAND.ink};margin:0 0 12px">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #E4E0D5;font-size:11px;color:${BRAND.muted}">
        ${chrome.footer}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const p = (text: string) => `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${text}</p>`;

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

/** Pure renderer — unit-tested so the copy cannot silently break. */
export function renderTemplate(
  template: EmailTemplate,
  input: TemplateInput,
  locale: ServerLocale = 'es-DO',
): Rendered {
  return locale === 'en-US' ? renderEn(template, input) : renderEs(template, input);
}

/* ------------------------------------------------------------------ es-DO */

function renderEs(template: EmailTemplate, input: TemplateInput): Rendered {
  const L: ServerLocale = 'es-DO';
  const name = (input.displayName as string) ?? 'hermano';

  switch (template) {
    case 'WELCOME':
      return {
        subject: 'Bienvenido a Yugo',
        text: `Bendiciones, ${name}. Tu cuenta en Yugo está lista. Completa tu perfil y tu verificación para que más personas puedan conocerte con confianza.`,
        html: layout(
          `Bendiciones, ${name}`,
          p('Tu cuenta en Yugo está lista.') +
            p(
              'Completa tu perfil y tu verificación para que más personas puedan conocerte con confianza. Recuerda que los grupos y eventos son gratis en cualquier nivel.',
            ),
          L,
        ),
      };
    case 'OTP':
      return {
        subject: `Tu código de Yugo: ${input.code}`,
        text: `Tu código de verificación es ${input.code}. Vence en 10 minutos. Si no lo pediste, ignora este correo.`,
        html: layout(
          'Tu código de verificación',
          p(
            `<span style="font-size:28px;letter-spacing:6px;font-weight:700;color:${BRAND.ink}">${input.code}</span>`,
          ) + p('Vence en 10 minutos. Si no lo pediste, ignora este correo.'),
          L,
        ),
      };
    case 'VERIFICATION_RESULT': {
      const approved = input.approved === true;
      const body = approved
        ? 'Tu selfie fue aprobada. Tu perfil ahora muestra la insignia de identidad verificada.'
        : 'Tu selfie no pudo validarse. Intenta de nuevo con buena luz, sin lentes ni gorra.';
      return {
        subject: approved ? 'Tu identidad fue verificada' : 'Necesitamos una nueva selfie',
        text: body,
        html: layout(approved ? 'Identidad verificada' : 'Selfie rechazada', p(body), L),
      };
    }
    case 'PAYMENT_RECEIPT':
      return {
        subject: `Recibo de tu suscripción Yugo ${input.tier}`,
        text: `Gracias por tu suscripción Yugo ${input.tier} (${input.plan}). Monto: ${input.amount} ${input.currency}. Renueva el ${input.renewsAt}.`,
        html: layout(
          'Recibo de tu suscripción',
          p(`Gracias por tu suscripción <b>Yugo ${input.tier}</b> (${input.plan}).`) +
            p(`Monto: <b>${input.amount} ${input.currency}</b>`) +
            p(`Próxima renovación: ${input.renewsAt}`) +
            p(
              'Puedes cancelar cuando quieras; conservas el acceso hasta el fin del período pagado.',
            ),
          L,
        ),
      };
    case 'MODERATION_NOTICE':
      return {
        subject: 'Aviso sobre tu cuenta en Yugo',
        text: String(input.reason ?? 'Tu contenido incumple el Pacto de conducta.'),
        html: layout(
          'Aviso sobre tu cuenta',
          p(String(input.reason ?? 'Tu contenido incumple el Pacto de conducta.')) +
            p('Si crees que fue un error, puedes apelar desde la aplicación.'),
          L,
        ),
      };
    case 'DATA_EXPORT_READY':
      return {
        subject: 'Tu descarga de datos está lista',
        text: 'Preparamos la copia de tus datos personales. Descárgala desde Privacidad y seguridad en la aplicación; el enlace vence en 24 horas.',
        html: layout(
          'Tu descarga de datos está lista',
          p(
            'Preparamos la copia de tus datos personales conforme a la Ley 172-13. Descárgala desde Privacidad y seguridad en la aplicación.',
          ) + p('El enlace vence en 24 horas.'),
          L,
        ),
      };
    case 'WEEKLY_DIGEST': {
      // Solo lo que pasó alrededor de la persona; una línea por número mayor
      // que cero. Nada de rachas ni de «te perdiste» (principio del producto).
      const n = (key: string) => Number(input[key] ?? 0);
      const lines: Array<[number, string, string]> = [
        [
          n('newInterests'),
          'persona marcó interés en tu perfil',
          'personas marcaron interés en tu perfil',
        ],
        [n('newConnections'), 'conexión nueva', 'conexiones nuevas'],
        [n('unreadMessages'), 'mensaje sin leer te espera', 'mensajes sin leer te esperan'],
        [n('prayersReceived'), 'persona oró por tu petición', 'personas oraron por tu petición'],
        [n('upcomingEvents'), 'evento cerca de ti esta semana', 'eventos cerca de ti esta semana'],
      ];
      const shown = lines.filter(([count]) => count > 0);
      const devotional = typeof input.devotionalTitle === 'string' ? input.devotionalTitle : null;
      const textLines = shown.map(([count, one, many]) => `${count} ${count === 1 ? one : many}.`);
      if (devotional) textLines.push(`Devocional de hoy: «${devotional}».`);
      return {
        subject: 'Tu semana en Yugo',
        text: `Bendiciones, ${name}. ${textLines.join(' ')} Ábrelo cuando tengas un momento tranquilo.`,
        html: layout(
          `Bendiciones, ${name}`,
          shown
            .map(([count, one, many]) => p(`<b>${count}</b> ${count === 1 ? one : many}.`))
            .join('') +
            (devotional ? p(`Devocional de hoy: <i>«${devotional}»</i>.`) : '') +
            p(
              'Ábrelo cuando tengas un momento tranquilo. Si prefieres no recibir este resumen, apágalo en Notificaciones dentro de la app.',
            ),
          L,
        ),
      };
    }
    case 'WEEKEND_PLAN': {
      // Plan de domingo: el evento, la Palabra de mañana y la persona. Nada
      // de rachas ni de «te perdiste»; si no hubo nada, no se envió.
      const w = weekendInput(input);
      const blocks: string[] = [];
      if (w.eventTitle) {
        blocks.push(
          p(
            `<b>Este fin de semana:</b> ${w.eventTitle}${w.eventChurch ? ` (${w.eventChurch})` : ''}${
              w.eventWhen ? `, ${w.eventWhen}` : ''
            }.`,
          ),
        );
      }
      if (w.devotionalRef) {
        blocks.push(
          p(
            `<b>Mañana:</b> ${w.devotionalRef}${w.devotionalTitle ? `, <i>«${w.devotionalTitle}»</i>` : ''}.`,
          ),
        );
      }
      if (w.quietName) {
        blocks.push(
          p(
            `<b>${w.quietName}</b> lleva ${w.quietDays} días sin saber de ti. Un «¿cómo estuvo tu semana?» basta.`,
          ),
        );
      }
      return {
        subject: 'Tu plan de domingo',
        text: `Bendiciones, ${name}. ${w.lines.join('. ')}. Que sea un fin de semana con propósito.`,
        html: layout(
          `Bendiciones, ${name}`,
          blocks.join('') +
            p(
              'Que sea un fin de semana con propósito. Si prefieres no recibir este plan, apágalo en Notificaciones dentro de la app.',
            ),
          L,
        ),
      };
    }
    case 'CHURCH_INVITE': {
      const church = String(input.churchName ?? 'tu iglesia');
      const role = input.role === 'ADMIN' ? 'administrador' : 'editor de eventos';
      const url = String(input.inviteUrl ?? '');
      return {
        subject: `${church} te invita a su portal en Yugo`,
        text: `Te invitaron como ${role} del portal de ${church} en Yugo. Abre este enlace para aceptar (vence en 7 días): ${url}`,
        html: layout(
          `${church} te invita a su portal`,
          p(
            `Te invitaron como <b>${role}</b> del portal de ${church} en Yugo: eventos, códigos de respaldo y métricas de la congregación.`,
          ) +
            p(
              `<a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600">Aceptar la invitación</a>`,
            ) +
            p(
              'Si todavía no tienes cuenta en Yugo, el mismo enlace te lleva a crearla. Vence en 7 días.',
            ),
          L,
        ),
      };
    }
    case 'NOTIFICATION': {
      const title = String(input.title ?? 'Tienes una novedad en Yugo');
      const body = String(input.body ?? '');
      return {
        subject: title,
        text: `${title}. ${body}`.trim(),
        html: layout(title, p(body) + p('Ábrelo en la app para responder.'), L),
      };
    }
  }
}

/* ------------------------------------------------------------------ en-US */

function renderEn(template: EmailTemplate, input: TemplateInput): Rendered {
  const L: ServerLocale = 'en-US';
  const name = (input.displayName as string) ?? 'friend';

  switch (template) {
    case 'WELCOME':
      return {
        subject: 'Welcome to Yugo',
        text: `Blessings, ${name}. Your Yugo account is ready. Complete your profile and your verification so more people can get to know you with confidence.`,
        html: layout(
          `Blessings, ${name}`,
          p('Your Yugo account is ready.') +
            p(
              'Complete your profile and your verification so more people can get to know you with confidence. Remember that groups and events are free on every plan.',
            ),
          L,
        ),
      };
    case 'OTP':
      return {
        subject: `Your Yugo code: ${input.code}`,
        text: `Your verification code is ${input.code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
        html: layout(
          'Your verification code',
          p(
            `<span style="font-size:28px;letter-spacing:6px;font-weight:700;color:${BRAND.ink}">${input.code}</span>`,
          ) + p('It expires in 10 minutes. If you did not request it, ignore this email.'),
          L,
        ),
      };
    case 'VERIFICATION_RESULT': {
      const approved = input.approved === true;
      const body = approved
        ? 'Your selfie was approved. Your profile now shows the verified identity badge.'
        : 'Your selfie could not be validated. Try again in good light, without glasses or a cap.';
      return {
        subject: approved ? 'Your identity was verified' : 'We need a new selfie',
        text: body,
        html: layout(approved ? 'Identity verified' : 'Selfie rejected', p(body), L),
      };
    }
    case 'PAYMENT_RECEIPT':
      return {
        subject: `Receipt for your Yugo ${input.tier} subscription`,
        text: `Thank you for your Yugo ${input.tier} subscription (${input.plan}). Amount: ${input.amount} ${input.currency}. Renews on ${input.renewsAt}.`,
        html: layout(
          'Your subscription receipt',
          p(`Thank you for your <b>Yugo ${input.tier}</b> subscription (${input.plan}).`) +
            p(`Amount: <b>${input.amount} ${input.currency}</b>`) +
            p(`Next renewal: ${input.renewsAt}`) +
            p('You can cancel anytime; you keep access until the end of the paid period.'),
          L,
        ),
      };
    case 'MODERATION_NOTICE':
      return {
        subject: 'A notice about your Yugo account',
        text: String(input.reason ?? 'Your content breaks the Covenant of conduct.'),
        html: layout(
          'A notice about your account',
          p(String(input.reason ?? 'Your content breaks the Covenant of conduct.')) +
            p('If you believe this was a mistake, you can appeal from the app.'),
          L,
        ),
      };
    case 'DATA_EXPORT_READY':
      return {
        subject: 'Your data download is ready',
        text: 'We prepared the copy of your personal data. Download it from Privacy and security in the app; the link expires in 24 hours.',
        html: layout(
          'Your data download is ready',
          p(
            'We prepared the copy of your personal data as required by Law 172-13. Download it from Privacy and security in the app.',
          ) + p('The link expires in 24 hours.'),
          L,
        ),
      };
    case 'WEEKLY_DIGEST': {
      // Only what happened around the person; one line per number above zero.
      // No streaks, no "you missed" (product principle).
      const n = (key: string) => Number(input[key] ?? 0);
      const lines: Array<[number, string, string]> = [
        [
          n('newInterests'),
          'person showed interest in your profile',
          'people showed interest in your profile',
        ],
        [n('newConnections'), 'new connection', 'new connections'],
        [
          n('unreadMessages'),
          'unread message is waiting for you',
          'unread messages are waiting for you',
        ],
        [n('prayersReceived'), 'person prayed for your request', 'people prayed for your request'],
        [n('upcomingEvents'), 'event near you this week', 'events near you this week'],
      ];
      const shown = lines.filter(([count]) => count > 0);
      const devotional = typeof input.devotionalTitle === 'string' ? input.devotionalTitle : null;
      const textLines = shown.map(([count, one, many]) => `${count} ${count === 1 ? one : many}.`);
      if (devotional) textLines.push(`Today's devotional: "${devotional}".`);
      return {
        subject: 'Your week on Yugo',
        text: `Blessings, ${name}. ${textLines.join(' ')} Open it when you have a quiet moment.`,
        html: layout(
          `Blessings, ${name}`,
          shown
            .map(([count, one, many]) => p(`<b>${count}</b> ${count === 1 ? one : many}.`))
            .join('') +
            (devotional ? p(`Today's devotional: <i>"${devotional}"</i>.`) : '') +
            p(
              'Open it when you have a quiet moment. If you would rather not receive this summary, turn it off under Notifications in the app.',
            ),
          L,
        ),
      };
    }
    case 'WEEKEND_PLAN': {
      const w = weekendInput(input);
      const blocks: string[] = [];
      if (w.eventTitle) {
        blocks.push(
          p(
            `<b>This weekend:</b> ${w.eventTitle}${w.eventChurch ? ` (${w.eventChurch})` : ''}${
              w.eventWhen ? `, ${w.eventWhen}` : ''
            }.`,
          ),
        );
      }
      if (w.devotionalRef) {
        blocks.push(
          p(
            `<b>Tomorrow:</b> ${w.devotionalRef}${w.devotionalTitle ? `, <i>"${w.devotionalTitle}"</i>` : ''}.`,
          ),
        );
      }
      if (w.quietName) {
        blocks.push(
          p(
            `<b>${w.quietName}</b> hasn't heard from you in ${w.quietDays} days. A "how was your week?" is enough.`,
          ),
        );
      }
      return {
        subject: 'Your Sunday plan',
        text: `Blessings, ${name}. ${w.lines.join('. ')}. May it be a weekend with purpose.`,
        html: layout(
          `Blessings, ${name}`,
          blocks.join('') +
            p(
              'May it be a weekend with purpose. If you would rather not receive this plan, turn it off under Notifications in the app.',
            ),
          L,
        ),
      };
    }
    case 'CHURCH_INVITE': {
      const church = String(input.churchName ?? 'your church');
      const role = input.role === 'ADMIN' ? 'administrator' : 'events editor';
      const url = String(input.inviteUrl ?? '');
      return {
        subject: `${church} invites you to its Yugo portal`,
        text: `You were invited as ${role} of the ${church} portal on Yugo. Open this link to accept (expires in 7 days): ${url}`,
        html: layout(
          `${church} invites you to its portal`,
          p(
            `You were invited as <b>${role}</b> of the ${church} portal on Yugo: events, endorsement codes and congregation metrics.`,
          ) +
            p(
              `<a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#fff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600">Accept the invitation</a>`,
            ) +
            p(
              'If you do not have a Yugo account yet, the same link takes you to create one. It expires in 7 days.',
            ),
          L,
        ),
      };
    }
    case 'NOTIFICATION': {
      const title = String(input.title ?? 'You have news on Yugo');
      const body = String(input.body ?? '');
      return {
        subject: title,
        text: `${title}. ${body}`.trim(),
        html: layout(title, p(body) + p('Open the app to respond.'), L),
      };
    }
  }
}

/** Reads the loosely typed WEEKEND_PLAN input once for both languages. */
function weekendInput(input: TemplateInput) {
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : null);
  return {
    lines: Array.isArray(input.lines) ? (input.lines as string[]) : [],
    eventTitle: str('eventTitle'),
    eventChurch: str('eventChurch'),
    eventWhen: str('eventWhen'),
    devotionalRef: str('devotionalReference'),
    devotionalTitle: str('devotionalTitle'),
    quietName: str('quietName'),
    quietDays: Number(input.quietDays ?? 0),
  };
}
