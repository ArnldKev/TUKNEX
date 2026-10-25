import { QuoteAiModule } from './ai/quote-ai';
import { QuoteDraftsModule } from './quotes/quote-drafts';
import { ReviewsModule } from './reviews/reviews';
import { ContactModule } from './contact/contact';
import { Database } from './database/database';
import { Inject } from '@nestjs/common';
import { QuoteRequestsModule } from './quotes/quote-requests';
import { AccountController } from './auth/account.controller';
import { Module, Controller, Get } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { DocumentsModule } from './documents/documents.module';
import { BillingController, PublicController, DocumentController } from './billing/billing.controller';
@Controller()
class HealthController {
  constructor(@Inject(Database) private db:Database) {}
  @Get('health') async health() {await this.db.query('SELECT 1'); return {status:'ok'};}
}
@Module({
  imports: [QuoteAiModule, DatabaseModule, QuoteDraftsModule, AuthModule, BillingModule, DocumentsModule, QuoteRequestsModule, ContactModule, ReviewsModule],
  controllers: [BillingController, PublicController, DocumentController, HealthController, AccountController],
})
export class AppModule {}
