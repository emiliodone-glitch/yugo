import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'crypto';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../../common/cache.service';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5; // OTP abuse protection (Hito 14)

/**
 * OTP issuance/verification (RF-AUT-01/05). The provider is configurable:
 * "console" logs the code locally (dev); production wires SMS/email senders.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  async send(identifier: string, purpose: string): Promise<void> {
    const rateKey = `otp:rate:${identifier}`;
    const sends = await this.cache.incr(rateKey, 3600);
    if (sends > MAX_SENDS_PER_HOUR) {
      throw new BadRequestException('otp_rate_limited');
    }

    const code = String(randomInt(100000, 1000000));
    await this.prisma.otpCode.create({
      data: {
        identifier,
        purpose,
        codeHash: this.hash(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
      },
    });

    const provider = process.env.OTP_PROVIDER ?? 'console';
    if (provider === 'console') {
      this.logger.log(`OTP for ${identifier} (${purpose}): ${code}`);
    }
    // Production providers (Twilio / SMTP) plug in here via env config.
  }

  async verify(identifier: string, code: string, purpose: string): Promise<boolean> {
    const record = await this.prisma.otpCode.findFirst({
      where: { identifier, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) return false;
    if (record.attempts >= MAX_ATTEMPTS) return false;

    if (record.codeHash !== this.hash(code)) {
      await this.prisma.otpCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
    return true;
  }
}
