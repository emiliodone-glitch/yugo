import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { SettingsService } from '../../common/settings.service';
import { AuditService } from '../../common/audit.service';

/**
 * Automatic escalation for repeated rejections (7.3): N rejected messages in
 * the window → automatic warning; the next one → 3-day suspension + case.
 */
@Injectable()
export class SanctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  async handleMessageRejected(userId: string): Promise<'NONE' | 'WARNING' | 'SUSPENSION'> {
    const thresholds = await this.settings.getModerationThresholds();
    const since = new Date(Date.now() - thresholds.rejectionWindowDays * 86400000);
    const rejected = await this.prisma.message.count({
      where: { senderId: userId, moderationStatus: 'REJECTED', sentAt: { gte: since } },
    });

    if (rejected === thresholds.rejectionsForWarning) {
      await this.prisma.sanction.create({
        data: {
          userId,
          type: 'WARNING',
          reason: `Advertencia automática: ${rejected} mensajes rechazados en ${thresholds.rejectionWindowDays} días.`,
        },
      });
      await this.audit.log({ action: 'AUTO_WARNING', targetType: 'USER', targetId: userId });
      return 'WARNING';
    }

    if (rejected > thresholds.rejectionsForWarning) {
      const days = 3;
      const until = new Date(Date.now() + days * 86400000);
      await this.prisma.$transaction([
        this.prisma.sanction.create({
          data: {
            userId,
            type: 'SUSPENSION',
            days,
            until,
            reason: 'Suspensión automática por reincidencia en mensajes rechazados.',
          },
        }),
        this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } }),
        this.prisma.moderationCase.create({
          data: {
            kind: 'AI_HELD',
            priority: 'HIGH',
            subjectUserId: userId,
            slaDueAt: new Date(Date.now() + 24 * 3600_000),
          },
        }),
      ]);
      await this.audit.log({ action: 'AUTO_SUSPENSION', targetType: 'USER', targetId: userId });
      return 'SUSPENSION';
    }

    return 'NONE';
  }
}
