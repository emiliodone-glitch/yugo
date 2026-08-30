import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Append-only audit trail (RF-ADM-11). No route ever updates or deletes rows
 * from AuditLog; this service only inserts.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: {
    actorId?: string | null;
    action: string;
    targetType?: string;
    targetId?: string;
    before?: unknown;
    after?: unknown;
    ip?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        before: entry.before === undefined ? undefined : (entry.before as Prisma.InputJsonValue),
        after: entry.after === undefined ? undefined : (entry.after as Prisma.InputJsonValue),
        ip: entry.ip,
      },
    });
  }
}
