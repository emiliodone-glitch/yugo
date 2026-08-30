import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { QueueService } from './queue.service';

export type EmailTemplate =
  | 'WELCOME'
  | 'OTP'
  | 'VERIFICATION_RESULT'
  | 'PAYMENT_RECEIPT'
  | 'WEEKLY_DIGEST'
  | 'MODERATION_NOTICE'
  | 'DATA_EXPORT_READY';

interface TemplateInput {
  displayName?: string;
  [key: string]: unknown;
}

/**
 * Transactional email (RF-NOT-03). Templates live here so the copy is
 * centralized in Spanish (es-DO) like the rest of the user-visible strings.
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

  /** Renders a template and enqueues it. */
  async send(to: string, template: EmailTemplate, input: TemplateInput = {}) {
    const { subject, html, text } = renderTemplate(template, input);
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

function layout(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:${BRAND.linen};font-family:'DM Sans',system-ui,sans-serif;color:#1B1F2A">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #E4E0D5">
      <tr><td style="background:${BRAND.ink};padding:20px 24px">
        <div style="font-family:Georgia,serif;font-size:24px;font-weight:600;color:#fff">Yugo</div>
        <div style="font-family:Georgia,serif;font-style:italic;font-size:13px;color:${BRAND.wheat}">Unidos en la misma fe</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="font-family:Georgia,serif;font-size:20px;color:${BRAND.ink};margin:0 0 12px">${title}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #E4E0D5;font-size:11px;color:${BRAND.muted}">
        Recibes este correo porque tienes una cuenta en Yugo. Puedes ajustar tus preferencias de
        notificación en la aplicación.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

const p = (text: string) =>
  `<p style="font-size:14px;line-height:1.6;margin:0 0 12px">${text}</p>`;

/** Pure renderer — unit-tested so the copy cannot silently break. */
export function renderTemplate(
  template: EmailTemplate,
  input: TemplateInput,
): { subject: string; html: string; text: string } {
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
        ),
      };
    case 'VERIFICATION_RESULT': {
      const approved = input.approved === true;
      return {
        subject: approved ? 'Tu identidad fue verificada' : 'Necesitamos una nueva selfie',
        text: approved
          ? 'Tu selfie fue aprobada. Tu perfil ahora muestra la insignia de identidad verificada.'
          : 'Tu selfie no pudo validarse. Intenta de nuevo con buena luz, sin lentes ni gorra.',
        html: layout(
          approved ? 'Identidad verificada' : 'Selfie rechazada',
          p(
            approved
              ? 'Tu selfie fue aprobada. Tu perfil ahora muestra la insignia de identidad verificada.'
              : 'Tu selfie no pudo validarse. Intenta de nuevo con buena luz, sin lentes ni gorra.',
          ),
        ),
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
            p('Puedes cancelar cuando quieras; conservas el acceso hasta el fin del período pagado.'),
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
        ),
      };
    case 'WEEKLY_DIGEST':
      return {
        subject: 'Tu resumen de la semana en Yugo',
        text: `Esta semana: ${input.newInterests ?? 0} personas marcaron interés, ${input.newConnections ?? 0} conexiones nuevas y ${input.upcomingEvents ?? 0} eventos cerca de ti.`,
        html: layout(
          'Tu resumen de la semana',
          p(`<b>${input.newInterests ?? 0}</b> personas marcaron interés en tu perfil.`) +
            p(`<b>${input.newConnections ?? 0}</b> conexiones nuevas.`) +
            p(`<b>${input.upcomingEvents ?? 0}</b> eventos cerca de ti esta semana.`),
        ),
      };
  }
}
