import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { isAdult, LIMITS, RegisterInput } from '@yugo/shared';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SettingsService } from '../../common/settings.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
    private readonly otp: OtpService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * RF-AUT-01/03: create the account after validating adulthood server-side.
   * Underage attempts are recorded (audit) and blocked — never relaxed.
   */
  async register(input: RegisterInput, ip?: string) {
    if (!isAdult(input.birthDate)) {
      await this.audit.log({
        action: 'REGISTER_UNDERAGE_BLOCKED',
        targetType: 'REGISTRATION',
        after: { identifier: input.email ?? input.phone, birthDate: input.birthDate },
        ip,
      });
      throw new ForbiddenException('must_be_adult');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          input.email ? { email: input.email } : undefined,
          input.phone ? { phone: input.phone } : undefined,
        ].filter(Boolean) as never,
      },
    });
    if (existing) throw new ConflictException('account_exists');

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash: await argon2.hash(input.password),
        birthDate: input.birthDate,
        gender: input.gender,
      },
    });

    const identifier = input.email ?? input.phone!;
    await this.otp.send(identifier, 'REGISTER');
    return { userId: user.id, otpSentTo: identifier };
  }

  /** RF-AUT-01: verify the OTP → contact verified (verification level 1). */
  async verifyOtp(identifier: string, code: string) {
    const ok = await this.otp.verify(identifier, code, 'REGISTER');
    if (!ok) throw new BadRequestException('invalid_otp');

    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (!user) throw new BadRequestException('unknown_identifier');

    const isEmail = identifier.includes('@');
    await this.prisma.user.update({
      where: { id: user.id },
      data: isEmail ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() },
    });
    await this.prisma.verification.create({
      data: { userId: user.id, level: 1, method: 'OTP', status: 'APPROVED', resolvedAt: new Date() },
    });
    return this.tokens.issuePair(user);
  }

  /**
   * RF-AUT-04: explicit, versioned covenant acceptance. Stored with date and
   * version; a covenant change forces re-acceptance (RF-SEG-01).
   */
  async acceptCovenant(userId: string, version: string) {
    const current = await this.settings.getCovenantVersion();
    if (version !== current) throw new BadRequestException('covenant_version_outdated');
    await this.prisma.user.update({
      where: { id: userId },
      data: { covenantAcceptedAt: new Date(), covenantVersion: version },
    });
    return { accepted: true, version };
  }

  async login(identifier: string, password: string, deviceInfo?: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier.toLowerCase() }, { phone: identifier }] },
    });
    if (!user?.passwordHash) throw new UnauthorizedException('invalid_credentials');
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('invalid_credentials');
    }
    if (user.status === 'BANNED') throw new ForbiddenException('account_banned');
    if (user.status === 'DELETED') throw new UnauthorizedException('invalid_credentials');

    // Re-entering during the 14-day grace period cancels deletion (RF-AUT-08).
    if (user.status === 'DELETION_PENDING') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', deletionRequestedAt: null },
      });
    }

    // 2FA is mandatory for administrative roles (RF-AUT-07, RF-ADM-11).
    if (user.role !== 'MEMBER' && user.twoFactorEnabled) {
      const identifierForOtp = user.email ?? user.phone!;
      await this.otp.send(identifierForOtp, 'LOGIN');
      return { twoFactorRequired: true as const, identifier: identifierForOtp };
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    return this.tokens.issuePair(user, deviceInfo);
  }

  async loginSecondFactor(identifier: string, code: string) {
    const ok = await this.otp.verify(identifier, code, 'LOGIN');
    if (!ok) throw new UnauthorizedException('invalid_otp');
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (!user) throw new UnauthorizedException('invalid_credentials');
    return this.tokens.issuePair(user);
  }

  async requestPasswordReset(identifier: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    // Always respond OK to avoid account enumeration.
    if (user) await this.otp.send(identifier, 'RESET');
    return { sent: true };
  }

  async resetPassword(identifier: string, code: string, newPassword: string) {
    const ok = await this.otp.verify(identifier, code, 'RESET');
    if (!ok) throw new BadRequestException('invalid_otp');
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { phone: identifier }] },
    });
    if (!user) throw new BadRequestException('unknown_identifier');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(newPassword) },
    });
    await this.tokens.revokeAll(user.id);
    return { reset: true };
  }

  /** RF-AUT-08: pause hides the profile without losing data. */
  async pauseAccount(userId: string, paused: boolean) {
    await this.prisma.user.update({
      where: { id: userId },
      data: paused
        ? { status: 'PAUSED', pausedAt: new Date() }
        : { status: 'ACTIVE', pausedAt: null },
    });
    return { paused };
  }

  /** RF-AUT-08: deletion with a 14-day grace period. */
  async requestDeletion(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'DELETION_PENDING', deletionRequestedAt: new Date() },
    });
    await this.tokens.revokeAll(userId);
    await this.audit.log({ actorId: userId, action: 'ACCOUNT_DELETION_REQUESTED' });
    return { graceDays: LIMITS.DELETION_GRACE_DAYS };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: { include: { denomination: true, church: true, serviceAreas: { include: { serviceArea: true } } } },
        verifications: { where: { status: 'APPROVED' }, include: { church: true } },
        subscriptions: { where: { status: { in: ['ACTIVE', 'TRIAL'] } }, orderBy: { endsAt: 'desc' }, take: 1 },
      },
    });
    if (!user) throw new UnauthorizedException();
    const { passwordHash, twoFactorSecret, ...safe } = user;
    return safe;
  }
}
