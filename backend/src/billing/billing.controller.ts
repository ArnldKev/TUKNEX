import { DEFAULT_PRICES, estimateQuote, PROJECT_TYPES } from '../domain/pricing';
import { quoteFormSchema } from '../domain/quote/form';
import { minimalEstimateSchema, estimateInputToPricing } from '../domain/quote/estimate-input';
import { parse } from './dto';

import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { randomUUID, createHash } from 'node:crypto';
import { BillingService } from './billing.service';
import { PdfService } from '../documents/pdf.service';
import { AdminGuard } from '../auth/auth';
@Controller('api/billing')
@UseGuards(AdminGuard)
export class BillingController {
  constructor(
    @Inject(BillingService) private service: BillingService,
    @Inject(PdfService) private pdf: PdfService,
  ) {}
  @Get('state') state() {
    return this.service.state();
  }
  @Post('clients') client(@Body() b: unknown) {
    return this.service.createClient(b);
  }
  @Patch('clients/:id') editClient(@Param('id') id: string, @Body() b: unknown) {
    return this.service.createClient(b, id);
  }
  @Post('quotes') quote(@Body() b: unknown) {
    return this.service.createQuote(b);
  }
  @Patch('quotes/:id') editQuote(@Param('id') id: string, @Body() b: unknown) {
    return this.service.createQuote(b, id);
  }
  @Post('quotes/:id/accept') accept(@Param('id') id: string) {
    return this.service.acceptQuote(id);
  }
  @Post('quotes/:id/contract') convert(@Param('id') id: string) {
    return this.service.convert(id);
  }
  @Post('bridge') bridge(@Body() b: unknown) {
    return this.service.bridge(b);
  }
  @Post('contracts') contract(@Body() b: unknown) {
    return this.service.createContract(b);
  }
  @Patch('contracts/:id') editContract(@Param('id') id: string, @Body() b: unknown) {
    return this.service.createContract(b, id);
  }
  @Post('contracts/:id/status') status(@Param('id') id: string, @Body() b: unknown) {
    return this.service.status(id, b);
  }
  @Post('contracts/:id/payments') payment(@Param('id') id: string, @Body() b: unknown) {
    return this.service.recordPayment(id, b);
  }
  @Post('payments/:id/void') void(@Param('id') id: string, @Body() b: unknown) {
    return this.service.voidPayment(id, b);
  }
  @Patch('prices') prices(@Body() body: unknown) {
    return this.service.savePrices(body);
  }
  @Patch('settings') settings(@Body() b: unknown) {
    return this.service.saveSettings(b);
  }
  @Get('quotes/:id/pdf') async quotePdf(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.pdf.document('quote', id);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + doc.filename + '"',
        'Cache-Control': 'no-store',
      })
      .send(doc.bytes);
  }
  @Get('contracts/:id/pdf') async contractPdf(@Param('id') id: string, @Res() res: Response) {
    const doc = await this.pdf.document('contract', id);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="' + doc.filename + '"',
        'Cache-Control': 'no-store',
      })
      .send(doc.bytes);
  }
  @Post('receipts')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async receipt(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Selecciona un comprobante PDF, PNG o JPEG de hasta 5 MB.');
    const bytes = file.buffer;
    const mime =
      bytes.subarray(0, 5).toString() === '%PDF-'
        ? 'application/pdf'
        : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'image/png'
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? 'image/jpeg'
            : null;
    if (!mime) throw new BadRequestException('El archivo debe ser un PDF, PNG o JPEG válido.');
    const id = randomUUID(),
      name = file.originalname.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ._-]/g, '').slice(0, 120) || 'comprobante';
    await this.service.db.query(
      'INSERT INTO comprobantes(id,nombre,mime,contenido,sha256) VALUES($1,$2,$3,$4,$5)',
      [id, name, mime, bytes, createHash('sha256').update(bytes).digest('hex')],
    );
    return { id, name };
  }
  @Get('receipts/:id') async receiptFile(@Param('id') id: string, @Res() res: Response) {
    const row = (
      await this.service.db.query('SELECT nombre,mime,contenido FROM comprobantes WHERE id=$1', [id])
    ).rows[0];
    if (!row) throw new NotFoundException();
    res
      .set({
        'Content-Type': row.mime,
        'Content-Disposition':
          'attachment; filename="comprobante-' +
          id +
          (row.mime === 'application/pdf' ? '.pdf' : row.mime === 'image/png' ? '.png' : '.jpg') +
          '"',
        'Cache-Control': 'no-store',
      })
      .send(Buffer.from(row.contenido));
  }
}
@Controller('api/public')
export class PublicController {
  constructor(
    @Inject(BillingService) private service: BillingService,
    @Inject(PdfService) private pdf: PdfService,
  ) {}
  @Get('health') health() {
    return { ok: true, mode: this.service.db.mode };
  }
  @Get('payment-options') async options() {
    const config = await this.service.settings();
    return { prices: config.prices || DEFAULT_PRICES };
  }
  @Post('estimate') async estimate(@Body() body: unknown) {
    const values = body && typeof body === 'object' && Object.hasOwn(body, 'hasOtherFunctions')
      ? estimateInputToPricing(parse(minimalEstimateSchema, body))
      : parse(quoteFormSchema, body);
    const config = await this.service.settings(),
      estimate = estimateQuote(values, config.prices || {});
    return {
      ...estimate,
      category: values.projectType,
      label: PROJECT_TYPES.find((p) => p.id === values.projectType)?.name || 'Proyecto web',
      currency: 'PEN',
      version: '3.0',
      validUntil: new Date(Date.now() + estimate.validityDays * 86400000).toISOString(),
    };
  }
  @Post('quote-pdf') async quote(@Body() body: unknown, @Res() res: Response) {
    const doc = await this.pdf.preliminary(body);
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="' + doc.filename + '"',
        'Cache-Control': 'no-store',
      })
      .send(doc.bytes);
  }
}
@Controller('api/documents')
@UseGuards(AdminGuard)
export class DocumentController {
  constructor(@Inject(BillingService) private service: BillingService) {}
  @Get(':id') async document(@Param('id') id: string, @Res() res: Response) {
    const row = (await this.service.db.query('SELECT contenido FROM documentos WHERE id=$1', [id])).rows[0];
    if (!row) throw new NotFoundException();
    res
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="TUKNEX-' + id + '.pdf"',
        'Cache-Control': 'no-store',
      })
      .send(Buffer.from(row.contenido));
  }
}
