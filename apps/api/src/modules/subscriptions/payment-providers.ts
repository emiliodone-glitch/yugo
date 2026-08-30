/**
 * PaymentProvider adapter (RF-PLU-02). Implementations:
 * - StripeProvider: international cards (server-side confirmation flow).
 * - AzulProvider: stub over Azul RD's documented payment page interface.
 * - StoreReceiptProvider: App Store / Google Play receipt validation.
 * - StubProvider: local development — always succeeds.
 * All behind the same interface so channels can be swapped via env config.
 */
export interface ChargeRequest {
  userId: string;
  amount: number;
  currency: 'DOP' | 'USD';
  description: string;
  /** Store receipt or card token depending on channel. */
  token?: string;
}

export interface ChargeResult {
  ok: boolean;
  providerRef?: string;
  error?: string;
}

export interface PaymentProvider {
  readonly channel: 'STRIPE' | 'AZUL' | 'APP_STORE' | 'GOOGLE_PLAY';
  charge(request: ChargeRequest): Promise<ChargeResult>;
}

export class StripeProvider implements PaymentProvider {
  readonly channel = 'STRIPE' as const;

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) return { ok: false, error: 'stripe_not_configured' };
    // Create a PaymentIntent confirmed with the client-provided payment method.
    const body = new URLSearchParams({
      amount: String(Math.round(request.amount * 100)),
      currency: request.currency.toLowerCase(),
      description: request.description,
      confirm: 'true',
      'automatic_payment_methods[enabled]': 'true',
      'automatic_payment_methods[allow_redirects]': 'never',
      ...(request.token ? { payment_method: request.token } : {}),
    });
    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = (await response.json()) as { id?: string; status?: string; error?: { message: string } };
    if (!response.ok || data.status !== 'succeeded') {
      return { ok: false, error: data.error?.message ?? `stripe_status_${data.status}` };
    }
    return { ok: true, providerRef: data.id };
  }
}

/**
 * Azul RD stub. Mirrors the documented WebService fields (MerchantId,
 * Auth1/Auth2, Amount in cents, ITBIS) — wire the production endpoint when
 * credentials exist; the interface will not change.
 */
export class AzulProvider implements PaymentProvider {
  readonly channel = 'AZUL' as const;

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (!process.env.AZUL_MERCHANT_ID || !process.env.AZUL_AUTH_KEY) {
      return { ok: false, error: 'azul_not_configured' };
    }
    // Production call: POST https://pagos.azul.com.do/webservices/JSON/Default.aspx
    // { Channel: 'EC', Store: MERCHANT_ID, PosInputMode: 'E-Commerce',
    //   TrxType: 'Sale', Amount: cents, Itbis: taxCents, DataVaultToken: token, ... }
    return { ok: false, error: 'azul_stub_only' };
  }
}

/** Validates App Store / Google Play receipts (RF-PLU-02/03). */
export class StoreReceiptProvider implements PaymentProvider {
  readonly channel: 'APP_STORE' | 'GOOGLE_PLAY';

  constructor(channel: 'APP_STORE' | 'GOOGLE_PLAY') {
    this.channel = channel;
  }

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    if (!request.token) return { ok: false, error: 'receipt_required' };
    if (this.channel === 'APP_STORE') {
      const secret = process.env.APPSTORE_SHARED_SECRET;
      if (!secret) return { ok: false, error: 'appstore_not_configured' };
      const response = await fetch('https://buy.itunes.apple.com/verifyReceipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ 'receipt-data': request.token, password: secret }),
      });
      const data = (await response.json()) as { status: number };
      return data.status === 0
        ? { ok: true, providerRef: `appstore:${Date.now()}` }
        : { ok: false, error: `appstore_status_${data.status}` };
    }
    // Google Play: verify purchase token against androidpublisher API.
    if (!process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON) {
      return { ok: false, error: 'googleplay_not_configured' };
    }
    return { ok: false, error: 'googleplay_stub_only' };
  }
}

/** Development stub — always approves. Never used when NODE_ENV=production. */
export class StubProvider implements PaymentProvider {
  readonly channel = 'STRIPE' as const;

  async charge(request: ChargeRequest): Promise<ChargeResult> {
    return { ok: true, providerRef: `stub:${request.userId}:${Date.now()}` };
  }
}
