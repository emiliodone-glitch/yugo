import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { AuditService } from '../../common/audit.service';
import { SettingsService } from '../../common/settings.service';

export type LegalKind = 'COVENANT' | 'TERMS' | 'PRIVACY' | 'SAFETY_TIPS';

/**
 * Versioned legal content (RF-SEG-01, RF-ADM-10). Publishing a new covenant
 * version forces every member to re-accept it before continuing.
 */
@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SettingsService,
  ) {}

  async current(kind: LegalKind) {
    const document = await this.prisma.legalDocument.findFirst({
      where: { kind, activeFrom: { lte: new Date() } },
      orderBy: { activeFrom: 'desc' },
    });
    if (!document) throw new NotFoundException('legal_document_not_found');
    return document;
  }

  async list(kind: LegalKind) {
    return this.prisma.legalDocument.findMany({ where: { kind }, orderBy: { activeFrom: 'desc' } });
  }

  /** Publishing a covenant bumps the required version → re-acceptance. */
  async publish(actorId: string, kind: LegalKind, version: string, body: unknown) {
    const document = await this.prisma.legalDocument.create({
      data: { kind, version, body: body as Prisma.InputJsonValue },
    });
    if (kind === 'COVENANT') {
      await this.settings.update('covenant.version', version, actorId);
    }
    await this.audit.log({
      actorId,
      action: 'LEGAL_DOCUMENT_PUBLISHED',
      targetType: 'LEGAL_DOCUMENT',
      targetId: document.id,
      after: { kind, version },
    });
    return document;
  }

  /**
   * Whether this member must re-accept the covenant before using the app
   * (RF-SEG-01): they never accepted, or the active version moved on.
   */
  async covenantStatus(userId: string) {
    const [user, requiredVersion] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { covenantAcceptedAt: true, covenantVersion: true },
      }),
      this.settings.getCovenantVersion(),
    ]);
    const accepted = !!user?.covenantAcceptedAt && user.covenantVersion === requiredVersion;
    return {
      accepted,
      acceptedVersion: user?.covenantVersion ?? null,
      acceptedAt: user?.covenantAcceptedAt ?? null,
      requiredVersion,
      mustReaccept: !accepted,
    };
  }
}
