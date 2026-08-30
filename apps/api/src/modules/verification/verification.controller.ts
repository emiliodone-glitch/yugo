import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { VerificationService } from './verification.service';
import { CurrentUser, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const submitSelfieSchema = z.object({
  evidenceKey: z.string().min(1),
  livenessPassed: z.boolean(),
});
const redeemSchema = z.object({ code: z.string().min(4).max(40) });
const leaderSchema = z.object({
  churchId: z.string().min(1),
  leaderEmail: z.string().email().optional(),
  leaderName: z.string().max(80).optional(),
  attendsSince: z.number().int().min(1900).max(2100).optional(),
});

@Controller('verification')
export class VerificationController {
  constructor(private readonly verification: VerificationService) {}

  @Get('status')
  status(@CurrentUser() user: AuthUser) {
    return this.verification.status(user.id);
  }

  @Post('selfie/start')
  startSelfie(@CurrentUser() user: AuthUser) {
    return this.verification.startSelfie(user.id);
  }

  @Post('selfie/submit')
  submitSelfie(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(submitSelfieSchema)) body: { evidenceKey: string; livenessPassed: boolean },
  ) {
    return this.verification.submitSelfie(user.id, body.evidenceKey, body.livenessPassed);
  }

  @Post('church-code')
  redeem(@CurrentUser() user: AuthUser, @Body(new ZodPipe(redeemSchema)) body: { code: string }) {
    return this.verification.redeemChurchCode(user.id, body.code);
  }

  @Post('leader-request')
  leaderRequest(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(leaderSchema)) body: z.infer<typeof leaderSchema>,
  ) {
    return this.verification.requestLeaderEndorsement(user.id, body);
  }
}
