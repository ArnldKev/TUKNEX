import { VerificationService } from './verification';
import { VerificationDelivery } from './delivery';
import { VerificationController } from './verification.controller';
import { Module } from '@nestjs/common';
import { AuthService, TeamGuard, AdminGuard, OwnerGuard, AuthController, SessionGuard } from './auth';
@Module({
  providers: [VerificationService, VerificationDelivery, AuthService, TeamGuard, AdminGuard, OwnerGuard, SessionGuard],
  controllers: [AuthController, VerificationController],
  exports: [VerificationService, AuthService, TeamGuard, AdminGuard, OwnerGuard, SessionGuard],
})
export class AuthModule {}
