import { Module } from '@nestjs/common';
import { BillingModule } from '../billing/billing.module';
import { PdfService } from './pdf.service';
@Module({ imports: [BillingModule], providers: [PdfService], exports: [PdfService] })
export class DocumentsModule {}
