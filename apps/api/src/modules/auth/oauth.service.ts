import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createPublicKey, createVerify } from 'crypto';
import { isAdult } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { TokenService } from './token.service';

interface IdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  email?: string;
  email_verified?: boolean | string;
}

interface Jwk {
  kid: string;
  n: string;
  e: string;
  alg?: string;
}

const PROVIDERS = {
  google: {
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    audienceEnv: 'GOOGLE_CLIENT_ID',
  },
  apple: {
    issuers: ['https://appleid.apple.com'],
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    audienceEnv: 'APPLE_CLIENT_ID',
  },
} as const;

export type OAuthProvider = keyof typeof PROVIDERS;

/**
 * RF-AUT-02: sign-in with Google and Apple (Apple is mandatory for App Store
 * review). The client performs the native/redirect flow and sends us the
 * resulting **id_token**; we verify its signature against the provider's JWKS,
 * the issuer, the audience and the expiry before trusting any claim.
 *
 * Age is still validated server-side: providers do not give us a birth date,
 * so a first-time OAuth user must supply one and it must be 18+ (RF-AUT-03).
 */
@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  private jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  private async jwks(provider: OAuthProvider): Promise<Jwk[]> {
    const cached = this.jwksCache.get(provider);
    if (cached && Date.now() - cached.fetchedAt < 3600_000) return cached.keys;
    const response = await fetch(PROVIDERS[provider].jwksUrl);
    if (!response.ok) throw new BadRequestException('jwks_unavailable');
    const { keys } = (await response.json()) as { keys: Jwk[] };
    this.jwksCache.set(provider, { keys, fetchedAt: Date.now() });
    return keys;
  }

  /** Verifies an RS256 id_token against the provider's published keys. */
  private async verifyIdToken(provider: OAuthProvider, idToken: string): Promise<IdTokenClaims> {
    const parts = idToken.split('.');
    if (parts.length !== 3) throw new BadRequestException('invalid_id_token');
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString()) as {
      kid?: string;
      alg?: string;
    };
    if (header.alg !== 'RS256') throw new BadRequestException('unsupported_token_algorithm');

    const key = (await this.jwks(provider)).find((candidate) => candidate.kid === header.kid);
    if (!key) throw new BadRequestException('unknown_signing_key');

    const publicKey = createPublicKey({
      key: { kty: 'RSA', n: key.n, e: key.e },
      format: 'jwk',
    });
    const verifier = createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    if (!verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'))) {
      throw new BadRequestException('invalid_token_signature');
    }

    const claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as IdTokenClaims;
    const config = PROVIDERS[provider];

    if (!config.issuers.includes(claims.iss as never)) {
      throw new BadRequestException('invalid_token_issuer');
    }
    if (claims.exp * 1000 < Date.now()) throw new BadRequestException('expired_id_token');

    const expectedAudience = process.env[config.audienceEnv];
    if (!expectedAudience) throw new BadRequestException(`${provider}_client_id_not_configured`);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!audiences.includes(expectedAudience)) throw new BadRequestException('invalid_token_audience');

    return claims;
  }

  /**
   * Signs in or registers with a verified provider token. `birthDate` and
   * `gender` are required the first time because the provider never supplies
   * them and no account exists without a verified adult birth date.
   */
  async signIn(
    provider: OAuthProvider,
    idToken: string,
    profile?: { birthDate?: Date; gender?: 'MALE' | 'FEMALE' },
    ip?: string,
  ) {
    const claims = await this.verifyIdToken(provider, idToken);
    const providerField = provider === 'google' ? 'googleId' : 'appleId';

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { [providerField]: claims.sub } as never,
          ...(claims.email ? [{ email: claims.email.toLowerCase() }] : []),
        ],
      },
    });

    if (existing) {
      if (existing.status === 'BANNED') throw new ForbiddenException('account_banned');
      // Link the provider to the existing account on first use.
      const updated = await this.prisma.user.update({
        where: { id: existing.id },
        data: {
          [providerField]: claims.sub,
          lastActiveAt: new Date(),
          ...(claims.email && !existing.emailVerifiedAt ? { emailVerifiedAt: new Date() } : {}),
        } as never,
      });
      return { ...(await this.tokens.issuePair(updated)), isNewAccount: false };
    }

    // New account: adulthood is validated here, exactly as in email sign-up.
    if (!profile?.birthDate || !profile.gender) {
      return { needsProfile: true as const, email: claims.email ?? null };
    }
    if (!isAdult(profile.birthDate)) {
      await this.audit.log({
        action: 'REGISTER_UNDERAGE_BLOCKED',
        targetType: 'REGISTRATION',
        after: { provider, email: claims.email, birthDate: profile.birthDate },
        ip,
      });
      throw new ForbiddenException('must_be_adult');
    }

    const user = await this.prisma.user.create({
      data: {
        email: claims.email?.toLowerCase(),
        [providerField]: claims.sub,
        birthDate: profile.birthDate,
        gender: profile.gender,
        emailVerifiedAt: claims.email_verified ? new Date() : null,
      } as never,
    });
    // Contact verification level 1 comes free with a verified provider email.
    if (claims.email_verified) {
      await this.prisma.verification.create({
        data: {
          userId: user.id,
          level: 1,
          method: 'OTP',
          status: 'APPROVED',
          resolvedAt: new Date(),
        },
      });
    }
    await this.audit.log({
      actorId: user.id,
      action: 'OAUTH_ACCOUNT_CREATED',
      targetType: 'USER',
      targetId: user.id,
      after: { provider },
    });
    return { ...(await this.tokens.issuePair(user)), isNewAccount: true };
  }
}
