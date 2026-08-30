import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { PrivacyService } from './privacy.service';
import { LegalService, type LegalKind } from './legal.service';
import { PrismaService } from '../../common/prisma.service';
import { CurrentUser, Public, Roles, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const rectifySchema = z.object({
  field: z.string().min(2).max(60),
  requestedValue: z.string().min(1).max(500),
});
const publishSchema = z.object({
  kind: z.enum(['COVENANT', 'TERMS', 'PRIVACY', 'SAFETY_TIPS']),
  version: z.string().min(1).max(20),
  body: z.unknown(),
});
const privacyPrefsSchema = z.object({
  hideExactDistance: z.boolean().optional(),
  allowEventPresenceVisible: z.boolean().optional(),
});

@Controller('privacy')
export class PrivacyController {
  constructor(
    private readonly privacy: PrivacyService,
    private readonly legal: LegalService,
    private readonly prisma: PrismaService,
  ) {}

  /** Ley 172-13 · derecho de acceso: descarga de datos personales. */
  @Get('export')
  exportData(@CurrentUser() user: AuthUser) {
    return this.privacy.exportPersonalData(user.id);
  }

  /** Ley 172-13 · derecho de rectificación. */
  @Post('rectification')
  rectify(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(rectifySchema)) body: z.infer<typeof rectifySchema>,
  ) {
    return this.privacy.requestRectification(user.id, body.field, body.requestedValue);
  }

  /** RF-SEG-07: rangos de distancia y visibilidad en eventos. */
  @Put('preferences')
  async setPreferences(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(privacyPrefsSchema)) body: z.infer<typeof privacyPrefsSchema>,
  ) {
    await this.prisma.profile.update({ where: { userId: user.id }, data: body });
    return { saved: true };
  }

  @Get('covenant-status')
  covenantStatus(@CurrentUser() user: AuthUser) {
    return this.legal.covenantStatus(user.id);
  }

  @Public()
  @Get('legal/:kind')
  legalDocument(@Param('kind') kind: LegalKind) {
    return this.legal.current(kind);
  }

  @Post('legal')
  @Roles('SUPERADMIN')
  publish(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(publishSchema)) body: z.infer<typeof publishSchema>,
  ) {
    return this.legal.publish(user.id, body.kind, body.version, body.body);
  }
}
