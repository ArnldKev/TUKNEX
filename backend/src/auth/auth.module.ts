import { VerificationService } from './verification';
import { VerificationDelivery } from './delivery';
import { VerificationController } from './verification.controller';
import { Module } from '@nestjs/common';
import { AuthService, TeamGuard, AdminGuard, AuthController, SessionGuard } from './auth';
@Module({
  providers: [VerificationService, VerificationDelivery, AuthService, TeamGuard, AdminGuard, SessionGuard],
  controllers: [AuthController, VerificationController],
  exports: [VerificationService, AuthService, TeamGuard, AdminGuard, SessionGuard],
})
export class AuthModule {}
