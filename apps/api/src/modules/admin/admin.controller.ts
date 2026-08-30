import { Body, Controller, Get, Header, Param, Post, Put, Query } from '@nestjs/common';
import { z } from 'zod';
import { AdminService } from './admin.service';
import { ReportsService, toCsv, type ReportKind } from './reports.service';
import { ContentService } from '../../common/content.service';
import { CurrentUser, Roles, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const memberActionSchema = z.object({
  action: z.enum(['WARN', 'SUSPEND', 'BAN', 'REINSTATE']),
  reason: z.string().min(3).max(500),
  days: z.number().int().min(1).max(365).optional(),
});
const verificationDecisionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'ESCALATE']),
  note: z.string().max(500).optional(),
});
const revokeSchema = z.object({ reason: z.string().min(3).max(500) });
const caseDecisionSchema = z.object({
  decision: z.enum([
    'NO_ACTION',
    'WARNING',
    'SUSPEND_3',
    'SUSPEND_7',
    'SUSPEND_30',
    'BAN',
    'REMOVE_CONTENT',
    'REVOKE_VERIFICATION',
    'ESCALATE',
  ]),
  reason: z.string().min(3).max(500),
});
const approveSchema = z.object({ approve: z.boolean(), note: z.string().max(500).optional() });
const featuredSchema = z.object({ featured: z.boolean() });
const weightsSchema = z.object({
  denomination: z.number().min(0).max(100),
  intention: z.number().min(0).max(100),
  practices: z.number().min(0).max(100),
  distance: z.number().min(0).max(100),
  age: z.number().min(0).max(100),
});
const settingSchema = z.object({ key: z.string().min(1), value: z.unknown() });
const matrixSchema = z.object({ aId: z.string(), bId: z.string(), value: z.number().min(0).max(100) });
const heldSchema = z.object({ approve: z.boolean() });
const bannersSchema = z.object({
  banners: z.array(
    z.object({
      id: z.string().min(1),
      title: z.string().min(1).max(80),
      body: z.string().min(1).max(300),
      ctaLabel: z.string().max(40).optional(),
      ctaHref: z.string().max(200).optional(),
      tone: z.enum(['ink', 'olive', 'wheat', 'wine']),
      activeFrom: z.string().optional(),
      activeUntil: z.string().optional(),
    }),
  ),
});
const icebreakersSchema = z.object({
  byPractice: z.record(z.string().min(1).max(200)),
  generic: z.array(z.string().min(1).max(200)).min(1),
});

@Controller('admin')
@Roles('MODERATOR', 'COMMUNITY_MANAGER', 'SUPPORT', 'FINANCE', 'SUPERADMIN')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reports: ReportsService,
    private readonly content: ContentService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  // Members (RF-ADM-02)
  @Get('members')
  members(@Query('q') q?: string, @Query('page') page?: string) {
    return this.admin.members(q, page ? Number(page) : 1);
  }

  @Get('members/:id')
  memberDetail(@Param('id') id: string) {
    return this.admin.memberDetail(id);
  }

  @Post('members/:id/actions')
  @Roles('MODERATOR', 'SUPERADMIN')
  memberAction(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(memberActionSchema)) body: z.infer<typeof memberActionSchema>,
  ) {
    return this.admin.memberAction(user.id, id, body.action, body.reason, body.days);
  }

  // Verifications (RF-ADM-03)
  @Get('verifications')
  @Roles('MODERATOR', 'SUPERADMIN')
  verificationQueue() {
    return this.admin.verificationQueue();
  }

  @Post('verifications/:id/decision')
  @Roles('MODERATOR', 'SUPERADMIN')
  decideVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(verificationDecisionSchema)) body: z.infer<typeof verificationDecisionSchema>,
  ) {
    return this.admin.decideVerification(user.id, id, body.decision, body.note);
  }

  @Post('verifications/:id/revoke')
  @Roles('MODERATOR', 'SUPERADMIN')
  revokeVerification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(revokeSchema)) body: { reason: string },
  ) {
    return this.admin.revokeVerification(user.id, id, body.reason);
  }

  // Moderation (RF-ADM-04)
  @Get('moderation/queue')
  @Roles('MODERATOR', 'SUPERADMIN')
  moderationQueue(@Query('kind') kind?: 'REPORT' | 'AI_HELD' | 'APPEAL') {
    return this.admin.moderationQueue(kind);
  }

  @Post('moderation/take-next')
  @Roles('MODERATOR', 'SUPERADMIN')
  takeNext(@CurrentUser() user: AuthUser) {
    return this.admin.takeNextCase(user.id);
  }

  @Post('moderation/cases/:id/decision')
  @Roles('MODERATOR', 'SUPERADMIN')
  decideCase(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(caseDecisionSchema)) body: z.infer<typeof caseDecisionSchema>,
  ) {
    return this.admin.decideCase(user.id, id, body.decision, body.reason);
  }

  @Post('moderation/messages/:id/resolve')
  @Roles('MODERATOR', 'SUPERADMIN')
  resolveHeld(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(heldSchema)) body: { approve: boolean },
  ) {
    return this.admin.resolveHeldMessage(user.id, id, body.approve);
  }

  // Organizations (RF-ADM-05)
  @Get('churches/pending')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  pendingChurches() {
    return this.admin.pendingChurches();
  }

  @Post('churches/:id/decision')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  decideChurch(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(approveSchema)) body: { approve: boolean; note?: string },
  ) {
    return this.admin.decideChurch(user.id, id, body.approve, body.note);
  }

  // Events & groups (RF-ADM-06)
  @Get('events/in-review')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  eventsInReview() {
    return this.admin.eventsInReview();
  }

  @Post('events/:id/decision')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  decideEvent(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(approveSchema)) body: { approve: boolean; note?: string },
  ) {
    return this.admin.decideEvent(user.id, id, body.approve, body.note);
  }

  @Put('events/:id/featured')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  setFeatured(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(featuredSchema)) body: { featured: boolean },
  ) {
    return this.admin.setEventFeatured(user.id, id, body.featured);
  }

  @Get('groups/pending')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  pendingGroups() {
    return this.admin.pendingGroups();
  }

  @Post('groups/:id/decision')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  decideGroup(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodPipe(approveSchema)) body: { approve: boolean },
  ) {
    return this.admin.decideGroup(user.id, id, body.approve);
  }

  // Settings (RF-ADM-07/08)
  @Get('settings')
  @Roles('SUPERADMIN')
  settings() {
    return this.admin.getSettings();
  }

  @Put('settings/affinity-weights')
  @Roles('SUPERADMIN')
  updateWeights(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(weightsSchema)) body: z.infer<typeof weightsSchema>,
  ) {
    return this.admin.updateAffinityWeights(user.id, body);
  }

  @Put('settings')
  @Roles('SUPERADMIN')
  updateSetting(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(settingSchema)) body: { key: string; value: unknown },
  ) {
    return this.admin.updateSetting(user.id, body.key, body.value);
  }

  @Get('denomination-matrix')
  @Roles('SUPERADMIN', 'COMMUNITY_MANAGER')
  matrix() {
    return this.admin.denominationMatrix();
  }

  @Put('denomination-matrix')
  @Roles('SUPERADMIN')
  updateMatrix(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(matrixSchema)) body: z.infer<typeof matrixSchema>,
  ) {
    return this.admin.updateMatrixCell(user.id, body.aId, body.bId, body.value);
  }

  // Audit (RF-ADM-11)
  @Get('audit')
  @Roles('SUPERADMIN')
  audit(
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('page') page?: string,
  ) {
    return this.admin.auditLog({ actorId, action, page: page ? Number(page) : 1 });
  }

  // Contenido administrable (RF-ADM-10)
  @Get('content/banners')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  banners() {
    return this.content.allBanners();
  }

  @Put('content/banners')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  saveBanners(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(bannersSchema)) body: z.infer<typeof bannersSchema>,
  ) {
    return this.content.saveBanners(user.id, body.banners);
  }

  @Get('content/icebreakers')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  icebreakers() {
    return this.content.icebreakers();
  }

  @Put('content/icebreakers')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  saveIcebreakers(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(icebreakersSchema)) body: z.infer<typeof icebreakersSchema>,
  ) {
    return this.content.saveIcebreakers(user.id, body);
  }

  @Get('content/safety-tips')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  safetyTips() {
    return this.content.safetyTips();
  }

  @Put('content/safety-tips')
  @Roles('COMMUNITY_MANAGER', 'SUPERADMIN')
  saveSafetyTips(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.content.saveSafetyTips(user.id, body);
  }

  // Reportes exportables (RF-ADM-12)
  @Get('reports/:kind')
  report(@Param('kind') kind: ReportKind, @Query('weeks') weeks?: string) {
    return this.reports.build(kind, weeks ? Number(weeks) : 12);
  }

  @Get('reports/:kind/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="yugo-reporte.csv"')
  async exportReport(@Param('kind') kind: ReportKind, @Query('weeks') weeks?: string) {
    const { rows } = await this.reports.build(kind, weeks ? Number(weeks) : 12);
    return toCsv(rows);
  }

  // Payments (RF-ADM-09)
  @Get('payments')
  @Roles('FINANCE', 'SUPERADMIN')
  payments(@Query('page') page?: string) {
    return this.admin.payments(page ? Number(page) : 1);
  }

  @Post('payments/:id/refund-approve')
  @Roles('FINANCE', 'SUPERADMIN')
  approveRefund(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.admin.approveRefund(user.id, id);
  }
}
