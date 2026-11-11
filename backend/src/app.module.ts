import {DossiersModule} from './documents/project-dossiers';
import {AddendaModule} from './billing/addenda';
import {PaymentReportsModule} from './billing/payment-reports';
import {NexiReportsModule} from './ai/nexi-reports';
import {QuoteResponsesModule} from './billing/quote-responses';
import {NotificationsModule} from './notifications/notifications';
import {ProjectTrackingModule} from './projects/project-tracking';
import {ClientAssociationsModule} from './auth/client-associations';
import { OnlineContractModule } from './billing/online-contract';
import { TeamModule } from './team/team.module';
import { QuoteAudioModule } from './ai/quote-audio';
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
  imports: [DossiersModule, AddendaModule, PaymentReportsModule, NexiReportsModule, QuoteResponsesModule, NotificationsModule, ProjectTrackingModule, ClientAssociationsModule, OnlineContractModule, TeamModule, QuoteAudioModule, QuoteAiModule, DatabaseModule, QuoteDraftsModule, AuthModule, BillingModule, DocumentsModule, QuoteRequestsModule, ContactModule, ReviewsModule],
  controllers: [BillingController, PublicController, DocumentController, HealthController, AccountController],
})
export class AppModule {}
