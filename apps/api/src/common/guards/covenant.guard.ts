import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators';
import { PrismaService } from '../prisma.service';
import { SettingsService } from '../settings.service';

/**
 * RF-SEG-01: a member cannot use the product until they accepted the CURRENT
 * covenant version. Publishing a new version forces re-acceptance; only the
 * auth/legal/privacy routes stay reachable so they can read and accept it.
 */
const ALWAYS_ALLOWED = [/^\/v1\/auth\//, /^\/v1\/privacy\//, /^\/v1\/catalog\//];

@Injectable()
export class CovenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    if (!request?.url) return true;
    if (ALWAYS_ALLOWED.some((pattern) => pattern.test(request.url))) return true;

    const user = request.user;
    if (!user) return true; // JwtAuthGuard already rejected it
    if (user.role !== 'MEMBER') return true; // staff accounts are not members

    const [record, requiredVersion] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: user.id },
        select: { covenantVersion: true, covenantAcceptedAt: true },
      }),
      this.settings.getCovenantVersion(),
    ]);

    if (!record?.covenantAcceptedAt || record.covenantVersion !== requiredVersion) {
      throw new ForbiddenException({
        message: 'covenant_acceptance_required',
        requiredVersion,
      });
    }
    return true;
  }
}
