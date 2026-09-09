import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { LIMITS } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { serverLocale } from '../../common/i18n/server-messages';
import { SettingsService } from '../../common/settings.service';
import { AuditService } from '../../common/audit.service';
import { MailerService } from '../queues/mailer.service';
import {
  AzulProvider,
  PaymentProvider,
  StoreReceiptProvider,
  StripeProvider,
  StubProvider,
} from './payment-providers';

export type Tier = 'FREE' | 'PLUS' | 'ORO';
type PaidTier = 'PLUS' | 'ORO';
type Plan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

const PLAN_DAYS: Record<Plan, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };
const PLAN_LABEL: Record<Plan, string> = {
  MONTHLY: 'mensual',
  QUARTERLY: 'trimestral',
  ANNUAL: 'anual',
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly mailer: MailerService,
  ) {}

  private provider(channel: string): PaymentProvider {
    if (process.env.PAYMENT_PROVIDER === 'stub' && process.env.NODE_ENV !== 'production') {
      return new StubProvider();
    }
    switch (channel) {
      case 'AZUL':
        return new AzulProvider();
      case 'APP_STORE':
        return new StoreReceiptProvider('APP_STORE');
      case 'GOOGLE_PLAY':
        return new StoreReceiptProvider('GOOGLE_PLAY');
      default:
        return new StripeProvider();
    }
  }

  /** One state per account (RF-PLU-03): the newest active subscription wins. */
  async activeSubscription(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['ACTIVE', 'TRIAL'] }, endsAt: { gt: new Date() } },
      orderBy: { endsAt: 'desc' },
    });
  }

  async tierOf(userId: string): Promise<Tier> {
    const sub = await this.activeSubscription(userId);
    return (sub?.tier as Tier | undefined) ?? 'FREE';
  }

  async state(userId: string) {
    const sub = await this.activeSubscription(userId);
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const travel = await this.prisma.travelLocation.findFirst({
      where: { userId, activeUntil: { gt: new Date() } },
    });
    return {
      tier: sub?.tier ?? null,
      plan: sub?.plan,
      status: sub?.status,
      renewsAt: sub?.endsAt,
      canceledAt: sub?.canceledAt ?? null,
      channel: sub?.channel ?? null,
      downgradeToTier: sub?.downgradeToTier ?? null,
      invisibleMode: profile?.invisibleMode ?? false,
      showOroBadge: profile?.showOroBadge ?? false,
      travelMode: travel ? { city: travel.city, activeUntil: travel.activeUntil } : null,
    };
  }

  async prices() {
    return this.settings.getPrices();
  }

  /**
   * RF-PLU-01/02/07: what a purchase would cost right now. Upgrading
   * Plus→Oro prorates the remaining period into a credit; downgrading Oro→Plus
   * applies at period end with no charge.
   */
  async quote(userId: string, tier: PaidTier, plan: Plan, currency: 'DOP' | 'USD') {
    const prices = await this.settings.getPrices();
    const basePrice = prices[tier]?.[plan]?.[currency];
    if (!basePrice) throw new BadRequestException('price_not_configured');

    const current = await this.activeSubscription(userId);
    let amount = basePrice;

    if (current && current.tier === 'ORO' && tier === 'PLUS') {
      return { current, amount: 0, scheduledDowngrade: true as const };
    }
    if (current && current.tier === 'PLUS' && tier === 'ORO') {
      const remainingDays = Math.max(0, (current.endsAt.getTime() - Date.now()) / 86400000);
      const currentPlanPrice = prices.PLUS?.[current.plan as Plan]?.[currency] ?? 0;
      const credit = (currentPlanPrice / PLAN_DAYS[current.plan as Plan]) * remainingDays;
      amount = Math.max(0, Math.round((basePrice - credit) * 100) / 100);
    }
    return { current, amount, scheduledDowngrade: false as const };
  }

  /** Schedules the Oro→Plus downgrade for period end (RF-PLU-07). */
  private async scheduleDowngrade(current: { id: string; endsAt: Date }) {
    await this.prisma.subscription.update({
      where: { id: current.id },
      data: { downgradeToTier: 'PLUS' },
    });
    return { scheduledDowngrade: true, effectiveAt: current.endsAt };
  }

  /**
   * Activates a paid period once the money is confirmed: closes the previous
   * subscription, records the payment, audits and emails the receipt.
   * Idempotent on providerRef so a repeated webhook cannot double-activate.
   */
  async activate(
    userId: string,
    tier: PaidTier,
    plan: Plan,
    channel: 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY',
    currency: 'DOP' | 'USD',
    amount: number,
    providerRef?: string,
  ) {
    if (providerRef) {
      const already = await this.prisma.payment.findFirst({ where: { providerRef } });
      if (already?.subscriptionId) {
        const existing = await this.prisma.subscription.findUnique({
          where: { id: already.subscriptionId },
        });
        if (existing) return existing;
      }
    }
    const current = await this.activeSubscription(userId);
    const startsAt = new Date();
    const endsAt = new Date(Date.now() + PLAN_DAYS[plan] * 86400000);

    const subscription = await this.prisma.$transaction(async (tx) => {
      if (current) {
        await tx.subscription.update({
          where: { id: current.id },
          data: { status: 'CANCELED', canceledAt: new Date() },
        });
      }
      const sub = await tx.subscription.create({
        data: {
          userId,
          tier,
          plan,
          channel,
          status: 'ACTIVE',
          startsAt,
          endsAt,
          externalId: providerRef,
        },
      });
      await tx.payment.create({
        data: {
          userId,
          subscriptionId: sub.id,
          amount: new Prisma.Decimal(amount),
          currency,
          provider: channel,
          providerRef,
          status: 'SUCCEEDED',
        },
      });
      return sub;
    });

    await this.audit.log({
      actorId: userId,
      action: 'SUBSCRIPTION_PURCHASED',
      targetType: 'SUBSCRIPTION',
      targetId: subscription.id,
      after: { tier, plan, channel, amount, currency },
    });

    const buyer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, locale: true, profile: { select: { displayName: true } } },
    });
    if (buyer?.email) {
      const locale = serverLocale(buyer.locale);
      await this.mailer.send(
        buyer.email,
        'PAYMENT_RECEIPT',
        {
          displayName: buyer.profile?.displayName,
          tier,
          plan,
          amount: amount.toLocaleString(locale),
          currency,
          renewsAt: endsAt.toLocaleDateString(locale),
        },
        locale,
      );
    }
    return subscription;
  }

  /** Purchase with a provider that charges synchronously (stub, tiendas, Azul). */
  async purchase(
    userId: string,
    tier: PaidTier,
    plan: Plan,
    channel: 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY',
    currency: 'DOP' | 'USD',
    token?: string,
  ) {
    const quote = await this.quote(userId, tier, plan, currency);
    if (quote.scheduledDowngrade && quote.current) return this.scheduleDowngrade(quote.current);

    const result = await this.provider(channel).charge({
      userId,
      amount: quote.amount,
      currency,
      description: `Yugo ${tier} ${plan}`,
      token,
    });
    if (!result.ok) throw new BadRequestException(result.error ?? 'payment_failed');
    return this.activate(userId, tier, plan, channel, currency, quote.amount, result.providerRef);
  }

  private get stubMode() {
    return process.env.PAYMENT_PROVIDER === 'stub' && process.env.NODE_ENV !== 'production';
  }

  /**
   * Web checkout (RF-PLU-02). En local (proveedor stub) activa al instante;
   * con Stripe crea una sesión de Checkout alojada y devuelve su URL: la
   * tarjeta nunca pasa por Yugo y la activación llega por webhook.
   */
  async checkout(
    userId: string,
    tier: PaidTier,
    plan: Plan,
    currency: 'DOP' | 'USD',
  ): Promise<
    | { mode: 'activated'; subscription: { id: string; tier: string; endsAt: Date } }
    | { mode: 'scheduled'; effectiveAt: Date }
    | { mode: 'redirect'; url: string; sessionId: string }
  > {
    const quote = await this.quote(userId, tier, plan, currency);
    if (quote.scheduledDowngrade && quote.current) {
      const scheduled = await this.scheduleDowngrade(quote.current);
      return { mode: 'scheduled', effectiveAt: scheduled.effectiveAt };
    }
    if (this.stubMode || quote.amount === 0) {
      const subscription = await this.activate(
        userId,
        tier,
        plan,
        'STRIPE',
        currency,
        quote.amount,
        this.stubMode ? `stub:${userId}:${Date.now()}` : `credit:${userId}:${Date.now()}`,
      );
      return { mode: 'activated', subscription };
    }

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new BadRequestException('stripe_not_configured');
    const webUrl = process.env.WEB_URL ?? 'https://yugo.do';
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    const body = new URLSearchParams({
      mode: 'payment',
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(Math.round(quote.amount * 100)),
      'line_items[0][price_data][product_data][name]': `Yugo ${tier === 'ORO' ? 'Oro' : 'Plus'} · ${PLAN_LABEL[plan]}`,
      success_url: `${webUrl}/plus/gracias?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${webUrl}/plus`,
      'metadata[userId]': userId,
      'metadata[tier]': tier,
      'metadata[plan]': plan,
      'metadata[currency]': currency,
      'metadata[amount]': String(quote.amount),
      ...(user?.email ? { customer_email: user.email } : {}),
    });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = (await response.json()) as {
      id?: string;
      url?: string;
      error?: { message: string };
    };
    if (!response.ok || !data.url || !data.id) {
      throw new BadRequestException(data.error?.message ?? 'checkout_failed');
    }
    return { mode: 'redirect', url: data.url, sessionId: data.id };
  }

  /**
   * Webhook de Stripe: la única fuente de verdad de que el dinero llegó.
   * Verifica la firma (HMAC-SHA256 de `t.payload`) y activa el período a
   * partir de los metadatos de la sesión.
   */
  async handleStripeWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('stripe_webhook_not_configured');
    if (!rawBody || !signature) throw new BadRequestException('missing_signature');

    const parts = Object.fromEntries(
      signature.split(',').map((pair) => pair.split('=') as [string, string]),
    );
    const timestamp = parts.t;
    const expected = createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex');
    const given = Buffer.from(parts.v1 ?? '', 'hex');
    const wanted = Buffer.from(expected, 'hex');
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      throw new BadRequestException('invalid_signature');
    }
    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
      throw new BadRequestException('stale_signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as {
      type: string;
      data: {
        object: {
          id: string;
          payment_status?: string;
          metadata?: Record<string, string>;
        };
      };
    };
    if (event.type !== 'checkout.session.completed') return { received: true, ignored: event.type };
    const session = event.data.object;
    if (session.payment_status && session.payment_status !== 'paid') {
      return { received: true, ignored: session.payment_status };
    }
    const meta = session.metadata ?? {};
    if (!meta.userId || !meta.tier || !meta.plan || !meta.currency) {
      throw new BadRequestException('metadata_missing');
    }
    await this.activate(
      meta.userId,
      meta.tier as PaidTier,
      meta.plan as Plan,
      'STRIPE',
      meta.currency as 'DOP' | 'USD',
      Number(meta.amount ?? 0),
      session.id,
    );
    return { received: true };
  }

  /** Recibos del miembro (RF-PLU-05): cada cobro con su estado. */
  async myPayments(userId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { subscription: { select: { tier: true, plan: true, endsAt: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      amount: Number(row.amount),
      currency: row.currency,
      provider: row.provider,
      status: row.status,
      createdAt: row.createdAt,
      tier: row.subscription?.tier ?? null,
      plan: row.subscription?.plan ?? null,
      periodEndsAt: row.subscription?.endsAt ?? null,
    }));
  }

  /**
   * RF-PLU-04: redeem a promotional code — typically a trial granted to an
   * allied congregation. Creates a TRIAL subscription with no charge; a
   * member can only use one promo and never while already subscribed.
   */
  async redeemPromoCode(userId: string, rawCode: string) {
    const code = rawCode.trim().toUpperCase();
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });
    if (!promo) throw new BadRequestException('invalid_promo_code');
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('promo_code_expired');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('promo_code_exhausted');
    }

    const current = await this.activeSubscription(userId);
    if (current) throw new BadRequestException('already_subscribed');

    const alreadyUsed = await this.prisma.subscription.findFirst({
      where: { userId, promoCodeId: promo.id },
    });
    if (alreadyUsed) throw new BadRequestException('promo_already_used');

    const endsAt = new Date(Date.now() + promo.trialDays * 86400000);
    const subscription = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscription.create({
        data: {
          userId,
          tier: promo.tier,
          plan: 'MONTHLY',
          channel: 'PROMO',
          status: 'TRIAL',
          startsAt: new Date(),
          endsAt,
          promoCodeId: promo.id,
        },
      });
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });
      return created;
    });

    await this.audit.log({
      actorId: userId,
      action: 'PROMO_CODE_REDEEMED',
      targetType: 'SUBSCRIPTION',
      targetId: subscription.id,
      after: { code, tier: promo.tier, trialDays: promo.trialDays },
    });
    return { tier: promo.tier, trialDays: promo.trialDays, endsAt };
  }

  /** Admin side of RF-PLU-04: create and list promotional codes. */
  async createPromoCode(
    actorId: string,
    input: { code: string; tier: PaidTier; trialDays: number; maxUses?: number; expiresAt?: Date },
  ) {
    const promo = await this.prisma.promoCode.create({
      data: {
        code: input.code.trim().toUpperCase(),
        tier: input.tier,
        trialDays: input.trialDays,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
      },
    });
    await this.audit.log({
      actorId,
      action: 'PROMO_CODE_CREATED',
      targetType: 'PROMO_CODE',
      targetId: promo.id,
      after: { code: promo.code, tier: promo.tier, trialDays: promo.trialDays },
    });
    return promo;
  }

  async listPromoCodes() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscriptions: true } } },
    });
  }

  /** RF-PLU-05: cancel anytime; access continues until period end. */
  async cancel(userId: string) {
    const current = await this.activeSubscription(userId);
    if (!current) throw new BadRequestException('no_active_subscription');
    await this.prisma.subscription.update({
      where: { id: current.id },
      data: { canceledAt: new Date() },
    });
    await this.audit.log({
      actorId: userId,
      action: 'SUBSCRIPTION_CANCELED',
      targetType: 'SUBSCRIPTION',
      targetId: current.id,
    });
    return { accessUntil: current.endsAt };
  }

  /**
   * RF-PLU-08 / RF-DES-12: invisible mode is an Oro entitlement. When Oro
   * lapses a scheduled job disables it (with a 3-day warning beforehand).
   */
  async setInvisibleMode(userId: string, enabled: boolean) {
    if (enabled) {
      const tier = await this.tierOf(userId);
      if (tier !== 'ORO') throw new ForbiddenException('oro_required');
    }
    await this.prisma.profile.update({
      where: { userId },
      data: { invisibleMode: enabled },
    });
    return { invisibleMode: enabled };
  }

  async setOroBadge(userId: string, show: boolean) {
    if (show && (await this.tierOf(userId)) !== 'ORO') throw new ForbiddenException('oro_required');
    await this.prisma.profile.update({ where: { userId }, data: { showOroBadge: show } });
    return { showOroBadge: show };
  }

  /** RF-DES-14: travel mode (Oro). */
  async setTravelMode(
    userId: string,
    input: { city: string; lat: number; lng: number; days: number } | null,
  ) {
    if ((await this.tierOf(userId)) !== 'ORO') throw new ForbiddenException('oro_required');
    await this.prisma.travelLocation.deleteMany({ where: { userId } });
    if (!input) return { travelMode: null };
    const travel = await this.prisma.travelLocation.create({
      data: {
        userId,
        city: input.city,
        lat: input.lat,
        lng: input.lng,
        activeUntil: new Date(Date.now() + Math.min(90, input.days) * 86400000),
      },
    });
    return { travelMode: { city: travel.city, activeUntil: travel.activeUntil } };
  }

  /**
   * Daily maintenance (RF-PLU-08): warn 3 days before Oro expiry with
   * invisible mode on; disable invisible mode and apply scheduled downgrades
   * when the period ends.
   */
  async runDailyMaintenance() {
    const soon = new Date(Date.now() + LIMITS.INVISIBLE_EXPIRY_WARNING_DAYS * 86400000);
    const expiring = await this.prisma.subscription.findMany({
      where: {
        tier: 'ORO',
        status: 'ACTIVE',
        endsAt: { lte: soon, gt: new Date() },
        canceledAt: { not: null },
      },
      include: { user: { include: { profile: true } } },
    });
    for (const sub of expiring) {
      if (sub.user.profile?.invisibleMode) {
        const days = Math.ceil((sub.endsAt.getTime() - Date.now()) / 86400000);
        await this.prisma.notification.create({
          data: {
            userId: sub.userId,
            category: 'SUBSCRIPTION',
            title: 'Tu Yugo Oro está por vencer',
            body: `Tu Yugo Oro vence en ${days} días; el modo invisible se desactivará automáticamente.`,
          },
        });
      }
    }

    const expired = await this.prisma.subscription.findMany({
      where: { status: 'ACTIVE', endsAt: { lte: new Date() } },
    });
    for (const sub of expired) {
      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      if (sub.downgradeToTier) {
        await this.prisma.subscription.create({
          data: {
            userId: sub.userId,
            tier: sub.downgradeToTier,
            plan: sub.plan,
            channel: sub.channel,
            status: 'ACTIVE',
            startsAt: new Date(),
            endsAt: new Date(Date.now() + PLAN_DAYS[sub.plan as Plan] * 86400000),
          },
        });
      }
      if (sub.tier === 'ORO') {
        // Invisible mode is an Oro entitlement — switch it off on expiry.
        await this.prisma.profile.updateMany({
          where: { userId: sub.userId, invisibleMode: true },
          data: { invisibleMode: false, showOroBadge: false },
        });
      }
    }
  }
}
