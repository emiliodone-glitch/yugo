import { Body, Controller, Delete, Get, Ip, Post } from '@nestjs/common';
import { z } from 'zod';
import { covenantAcceptSchema, loginSchema, otpVerifySchema, registerSchema } from '@yugo/shared';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { CurrentUser, Public, type AuthUser } from '../../common/decorators';
import { ZodPipe } from '../../common/zod.pipe';

const refreshSchema = z.object({ refreshToken: z.string().min(10) });
const resetRequestSchema = z.object({ identifier: z.string().min(3) });
const resetSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6),
  newPassword: z.string().min(8).max(128),
});
const pauseSchema = z.object({ paused: z.boolean() });

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
  ) {}

  @Public()
  @Post('register')
  register(@Body(new ZodPipe(registerSchema)) body: never, @Ip() ip: string) {
    return this.auth.register(body, ip);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body(new ZodPipe(otpVerifySchema)) body: { identifier: string; code: string }) {
    return this.auth.verifyOtp(body.identifier, body.code);
  }

  @Public()
  @Post('login')
  login(@Body(new ZodPipe(loginSchema)) body: { identifier: string; password: string }) {
    return this.auth.login(body.identifier, body.password);
  }

  @Public()
  @Post('login/2fa')
  login2fa(@Body(new ZodPipe(otpVerifySchema)) body: { identifier: string; code: string }) {
    return this.auth.loginSecondFactor(body.identifier, body.code);
  }

  @Public()
  @Post('refresh')
  refresh(@Body(new ZodPipe(refreshSchema)) body: { refreshToken: string }) {
    return this.tokens.rotate(body.refreshToken);
  }

  @Public()
  @Post('password/request-reset')
  requestReset(@Body(new ZodPipe(resetRequestSchema)) body: { identifier: string }) {
    return this.auth.requestPasswordReset(body.identifier);
  }

  @Public()
  @Post('password/reset')
  reset(@Body(new ZodPipe(resetSchema)) body: { identifier: string; code: string; newPassword: string }) {
    return this.auth.resetPassword(body.identifier, body.code, body.newPassword);
  }

  @Post('covenant/accept')
  acceptCovenant(
    @CurrentUser() user: AuthUser,
    @Body(new ZodPipe(covenantAcceptSchema)) body: { version: string },
  ) {
    return this.auth.acceptCovenant(user.id, body.version);
  }

  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthUser) {
    await this.tokens.revokeAll(user.id);
    return { ok: true };
  }

  @Post('pause')
  pause(@CurrentUser() user: AuthUser, @Body(new ZodPipe(pauseSchema)) body: { paused: boolean }) {
    return this.auth.pauseAccount(user.id, body.paused);
  }

  @Delete('account')
  requestDeletion(@CurrentUser() user: AuthUser) {
    return this.auth.requestDeletion(user.id);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}
