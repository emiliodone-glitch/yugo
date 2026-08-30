import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { CacheService } from '../../common/cache.service';
import { QueueService } from '../queues/queue.service';
import { Public, Roles } from '../../common/decorators';

/**
 * Liveness/readiness and operational metrics (RNF-08). `/health` is public so
 * load balancers can probe it; `/health/metrics` needs a staff role because it
 * exposes queue depth and moderation backlog.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly queues: QueueService,
  ) {}

  @Public()
  @Get()
  async health() {
    const checks: Record<string, 'ok' | 'down'> = {};
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'down';
    }
    try {
      await this.cache.set('health:ping', '1', 10);
      checks.cache = (await this.cache.get('health:ping')) === '1' ? 'ok' : 'down';
    } catch {
      checks.cache = 'down';
    }
    const healthy = Object.values(checks).every((status) => status === 'ok');
    return { status: healthy ? 'ok' : 'degraded', checks, uptimeSeconds: Math.round(process.uptime()) };
  }

  /**
   * Operational counters for dashboards and alerts: moderation backlog,
   * overdue SLAs and queue depth (RNF-08).
   */
  @Roles('MODERATOR', 'SUPERADMIN')
  @Get('metrics')
  async metrics() {
    const now = new Date();
    const [heldMessages, openCases, overdueCases, pendingVerifications, queueDepths] =
      await Promise.all([
        this.prisma.message.count({ where: { moderationStatus: 'HELD' } }),
        this.prisma.moderationCase.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
        this.prisma.moderationCase.count({
          where: { status: { in: ['OPEN', 'IN_REVIEW'] }, slaDueAt: { lt: now } },
        }),
        this.prisma.verification.count({ where: { status: 'PENDING', level: 2 } }),
        this.queues.depths(),
      ]);

    return {
      moderation: { heldMessages, openCases, overdueCases, pendingVerifications },
      queues: queueDepths,
      // Alert thresholds documented in docs/OPERATIONS.md
      alerts: [
        overdueCases > 0 && { level: 'critical', text: `${overdueCases} casos fuera de SLA` },
        heldMessages > 100 && { level: 'warning', text: `Cola de IA con ${heldMessages} mensajes` },
        pendingVerifications > 50 && {
          level: 'warning',
          text: `${pendingVerifications} verificaciones pendientes`,
        },
      ].filter(Boolean),
    };
  }
}
