import { VerificationService } from './verification';
import { VerificationDelivery } from './delivery';
import { VerificationController } from './verification.controller';
import { Module } from '@nestjs/common';
import { AuthService, AdminGuard, AuthController, SessionGuard } from './auth';
@Module({
  providers: [VerificationService, VerificationDelivery, AuthService, AdminGuard, SessionGuard],
  controllers: [AuthController, VerificationController],
  exports: [VerificationService, AuthService, AdminGuard, SessionGuard],
})
export class AuthModule {}
