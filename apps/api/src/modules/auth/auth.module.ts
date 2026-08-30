import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { TokenService } from './token.service';
import { OAuthService } from './oauth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpService, TokenService, OAuthService],
  exports: [AuthService, TokenService, OAuthService],
})
export class AuthModule {}
