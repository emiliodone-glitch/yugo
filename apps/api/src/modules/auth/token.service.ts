import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import type { User } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';

const REFRESH_TTL_DAYS = 30;

/** Access/refresh token pair with server-side refresh revocation (RF-AUT-06). */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async issuePair(user: Pick<User, 'id' | 'role'>, deviceInfo?: string) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        deviceInfo,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400000),
      },
    });
    return { accessToken, refreshToken };
  }

  async rotate(refreshToken: string) {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(refreshToken) },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('invalid_refresh_token');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issuePair(record.user, record.deviceInfo ?? undefined);
  }

  /** Remote sign-out on all devices (RF-AUT-06). */
  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
