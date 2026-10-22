import { BACKEND_ROOT } from '../config/paths';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Database } from '../database/database';
import { BillingService } from '../billing/billing.service';
import { amount, todayLima, buildPlan, addDays } from '../domain/billing/finance';
import {
  paymentModes,
  serviceLabels,
  statusLabels,
  type BillingQuote,
  type Contract,
  type Issuer,
  type PlanInput,
} from '../domain/billing/types';
import { quoteFormSchema } from '../domain/quote/form';
import { estimateQuote } from '../domain/pricing';
import { parse } from '../billing/dto';
import { documentTerms, referenceImages } from './templates';
import { z } from 'zod';
const navy = rgb(0.06, 0.15, 0.23),
  teal = rgb(0.02, 0.48, 0.48),
  muted = rgb(0.32, 0.39, 0.44),
  line = rgb(0.85, 0.89, 0.91),
  pale = rgb(0.95, 0.97, 0.98);
const clean = (value: unknown) =>
  String(value ?? '')
    .normalize('NFC')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/→|↗/g, ' / ')
    .replace(/[^\u0009\u000a\u000d\u0020-\u00ff\u20ac]/g, '');
class Layout {
  doc!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont;
  bold!: PDFFont;
  y = 0;
  pageTitle = '';
  number = '';
  width = 595.28;
  height = 841.89;
  margin = 46;
  contentWidth = 503.28;
  static async create(title: string, number: string) {
    const l = new Layout();
    l.doc = await PDFDocument.create();
    l.font = await l.doc.embedFont(StandardFonts.Helvetica);
    l.bold = await l.doc.embedFont(StandardFonts.HelveticaBold);
    l.pageTitle = title;
    l.number = number;
    l.newPage();
    return l;
  }
  newPage() {
    this.page = this.doc.addPage([this.width, this.height]);
    this.y = this.height - 52;
    if (this.doc.getPageCount() > 1) {
      this.text('TUKNEX / ' + this.pageTitle, 9, this.bold, teal);
      this.text(this.number, 9, this.font, muted);
      this.y -= 14;
    }
  }
  ensure(height: number) {
    if (this.y - height < 58) this.newPage();
  }
  lines(text: string, font = this.font, size = 10, width = this.contentWidth) {
    const out: string[] = [];
    for (const paragraph of clean(text).split('\n')) {
      let row = '';
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (font.widthOfTextAtSize((row ? row + ' ' : '') + word, size) > width && row) {
          out.push(row);
          row = '';
        }
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
          let cut = 1;
          while (cut < rest.length && font.widthOfTextAtSize(rest.slice(0, cut + 1), size) < width) cut++;
          if (row) {
            out.push(row);
            row = '';
          }
          out.push(rest.slice(0, cut));
          rest = rest.slice(cut);
        }
        row += (row ? ' ' : '') + rest;
      }
      out.push(row || ' ');
    }
    return out;
  }
  text(text: string, size = 10, font = this.font, color = navy, width = this.contentWidth) {
    for (const row of this.lines(text, font, size, width)) {
      this.ensure(size * 1.5);
      this.page.drawText(row, { x: this.margin, y: this.y - size, font, size, color });
      this.y -= size * 1.5;
    }
  }
  heading(text: string) {
    this.ensure(55);
    this.y -= 13;
    this.text(text, 12, this.bold, teal);
    this.y -= 5;
  }
  rule() {
    this.page.drawLine({
      start: { x: this.margin, y: this.y },
      end: { x: this.width - this.margin, y: this.y },
      thickness: 0.7,
      color: line,
    });
    this.y -= 14;
  }
  field(label: string, value: string) {
    this.ensure(32);
    this.text(label.toUpperCase(), 8, this.bold, muted);
    this.text(value || 'Por completar', 10);
    this.y -= 4;
  }
  pair(leftLabel: string, left: string, rightLabel: string, right: string) {
    const start = this.y,
      col = (this.contentWidth - 24) / 2;
    const lh = this.lines(left || 'Por completar', this.font, 10, col),
      rh = this.lines(right || 'Por completar', this.font, 10, col);
    const h = 21 + Math.max(lh.length, rh.length) * 15;
    this.ensure(h);
    const y = this.y;
    this.page.drawText(clean(leftLabel.toUpperCase()), {
      x: this.margin,
      y: y - 8,
      size: 8,
      font: this.bold,
      color: muted,
    });
    this.page.drawText(clean(rightLabel.toUpperCase()), {
      x: this.margin + col + 24,
      y: y - 8,
      size: 8,
      font: this.bold,
      color: muted,
    });
    for (const [rows, x] of [
      [lh, this.margin],
      [rh, this.margin + col + 24],
    ] as [string[], number][]) {
      rows.forEach((row, i) =>
        this.page.drawText(row, { x, y: y - 25 - i * 15, size: 10, font: this.font, color: navy }),
      );
    }
    this.y = y - h;
  }
  async header(title: string, number: string, issued: string, demo: boolean) {
    const logo = await this.doc.embedPng(await readFile(resolve(BACKEND_ROOT, 'assets/branding/logo-tuknex.png')));
    const w = 140,
      h = (w * logo.height) / logo.width;
    this.page.drawImage(logo, { x: this.margin, y: this.y - h, width: w, height: h });
    this.y -= h + 22;
    this.text(demo ? 'DOCUMENTO DE DEMOSTRACIÓN' : 'TUKNEX / SERVICIOS DIGITALES', 8, this.bold, teal);
    this.y -= 5;
    this.text(title, 21, this.bold);
    this.y -= 10;
    this.pair('Número', number, 'Fecha de emisión', issued);
    this.rule();
  }
  price(label: string, value: string, total = false) {
    const h = total ? 38 : 27;
    this.ensure(h + 4);
    if (total)
      this.page.drawRectangle({
        x: this.margin,
        y: this.y - h + 4,
        width: this.contentWidth,
        height: h,
        color: pale,
      });
    this.page.drawText(clean(label), {
      x: this.margin + (total ? 12 : 0),
      y: this.y - 17,
      size: total ? 12 : 10,
      font: total ? this.bold : this.font,
      color: navy,
    });
    const t = clean(value);
    this.page.drawText(t, {
      x: this.width - this.margin - (total ? 12 : 0) - this.bold.widthOfTextAtSize(t, total ? 14 : 11),
      y: this.y - 17,
      size: total ? 14 : 11,
      font: this.bold,
      color: total ? teal : navy,
    });
    this.y -= h;
  }
  schedule(items: Contract['schedule']) {
    this.heading('Cronograma de pagos');
    this.text(
      'Fechas e importes acordados. El recargo es único y está incluido en el total.',
      9,
      this.font,
      muted,
    );
    this.y -= 8;
    for (const item of items) {
      const label = String(item.number).padStart(2, '0') + '  ' + clean(item.label) + '  /  ' + item.date;
      const rows = this.lines(label, this.font, 9, 345);
      this.ensure(rows.length * 14 + 10);
      const y = this.y;
      for (const [i, row] of rows.entries())
        this.page.drawText(row, {
          x: this.margin + 6,
          y: y - 11 - i * 14,
          size: 9,
          font: this.font,
          color: navy,
        });
      const value = amount(item.amountCents);
      this.page.drawText(value, {
        x: this.width - this.margin - this.bold.widthOfTextAtSize(value, 10) - 6,
        y: y - 11,
        size: 10,
        font: this.bold,
        color: navy,
      });
      this.y -= rows.length * 14 + 12;
      this.page.drawLine({
        start: { x: this.margin, y: this.y + 4 },
        end: { x: this.width - this.margin, y: this.y + 4 },
        color: line,
        thickness: 0.5,
      });
    }
  }
  async finish() {
    const pages = this.doc.getPages();
    pages.forEach((page, i) => {
      page.drawLine({
        start: { x: 46, y: 43 },
        end: { x: this.width - 46, y: 43 },
        color: line,
        thickness: 0.6,
      });
      page.drawText('TUKNEX  |  ' + clean(this.number), {
        x: 46,
        y: 28,
        size: 8,
        font: this.font,
        color: muted,
      });
      page.drawText(String(i + 1) + ' / ' + pages.length, {
        x: this.width - 78,
        y: 28,
        size: 8,
        font: this.font,
        color: muted,
      });
    });
    this.doc.setTitle(clean(this.pageTitle + ' ' + this.number));
    this.doc.setAuthor('TUKNEX');
    return Buffer.from(await this.doc.save());
  }
}
@Injectable()
export class PdfService {
  constructor(
    @Inject(Database) private db: Database,
    @Inject(BillingService) private billing: BillingService,
  ) {}
  async quotePdf(q: BillingQuote, preliminary = false, custom = false) {
    const l = await Layout.create('Cotización', q.number);
    await l.header(
      preliminary ? 'Propuesta preliminar' : 'Cotización de servicios digitales',
      q.number,
      q.issuedDate,
      q.isDemo,
    );
    l.pair('Cliente / razón social', q.client.name, 'DNI / RUC', q.client.taxId);
    l.pair('Correo', q.client.email, 'Teléfono', q.client.phone);
    l.field('Dirección', q.client.address);
    l.pair('Proyecto', q.projectName, 'Vigencia', q.validUntil);
    l.heading('La solución que proponemos');
    l.text(serviceLabels[q.service] || q.service, 14, l.bold);
    l.y -= 8;
    const image = await l.doc.embedPng(
      await readFile(
        resolve(BACKEND_ROOT, 'assets/document-references', (referenceImages[q.service] || 'maintenance') + '.png'),
      ),
    );
    const h = (l.contentWidth * image.height) / image.width;
    l.ensure(h + 30);
    l.page.drawImage(image, { x: l.margin, y: l.y - h, width: l.contentWidth, height: h });
    l.y -= h + 8;
    l.text(
      'Imagen referencial del tipo de solución. No representa el diseño final ni amplía el alcance.',
      8,
      l.font,
      muted,
    );
    l.heading('Resumen y alcance');
    l.text(q.scope);
    l.field('Plazo estimado', q.delivery);
    l.heading('Inversión y modalidad de pago');
    if (custom) {
      l.text(
        'Importe por definir tras evaluar el alcance. Este documento no fija un precio ni un cronograma de cobro.',
        11,
        l.bold,
      );
    } else {
      l.price('Servicios acordados', amount(q.baseCents));
      l.price('Recargo único de financiamiento (' + q.plan.rate + '%)', amount(q.feeCents));
      l.price(preliminary ? 'Total orientativo' : 'Total acordado', amount(q.totalCents), true);
      l.field('Modalidad', paymentModes[q.plan.mode].label);
      l.schedule(q.schedule);
    }
    l.heading('Condiciones');
    l.text(q.conditions || documentTerms.exclusions);
    if (q.observations) l.field('Observaciones', q.observations);
    if (preliminary)
      l.text(
        'Estimación orientativa, sujeta a validación de requisitos, impuestos y condiciones finales. No constituye un contrato ni una aceptación automática.',
        9,
        l.font,
        muted,
      );
    l.heading('Tu contacto en TUKNEX');
    l.text(q.issuer.name);
    l.text(
      [q.issuer.taxId ? 'DNI / RUC: ' + q.issuer.taxId : '', q.issuer.phone, q.issuer.email, q.issuer.address]
        .filter(Boolean)
        .join(' / '),
      9,
      l.font,
      muted,
    );
    return l.finish();
  }
  async contractPdf(c: Contract) {
    const l = await Layout.create('Contrato de servicios digitales', c.number);
    await l.header('Contrato de Prestación de Servicios Digitales', c.number, c.issuedDate, c.isDemo);
    l.field('Estado registrado', statusLabels[c.status]);
    if (c.isDemo || c.status === 'borrador')
      l.text(
        'Borrador de referencia. Revisar los datos y acuerdos antes de su formalización.',
        9,
        l.font,
        muted,
      );
    l.heading('1. Las partes');
    l.field('Cliente', c.client.name);
    l.pair('DNI / RUC', c.client.taxId, 'Dirección', c.client.address);
    l.pair('Teléfono', c.client.phone, 'Correo', c.client.email);
    l.field('Prestador del servicio · TUKNEX', c.issuer.name);
    l.pair('DNI / RUC', c.issuer.taxId, 'Dirección', c.issuer.address);
    l.pair('Teléfono', c.issuer.phone, 'Correo', c.issuer.email);
    l.heading('2. Objeto del contrato');
    l.text(
      'Desarrollo de ' +
        (serviceLabels[c.service] || c.service) +
        ' para el proyecto "' +
        c.projectName +
        '", según el alcance y condiciones que se describen en este documento.',
    );
    l.heading('3. Alcance del servicio');
    l.text(c.scope);
    l.heading('4. Precio y forma de pago');
    l.price('Monto base', amount(c.baseCents));
    l.price('Recargo único (' + c.plan.rate + '%)', amount(c.feeCents));
    l.price('Monto final', amount(c.totalCents), true);
    l.field('Modalidad acordada', paymentModes[c.plan.mode].label);
    l.schedule(c.schedule);
    l.heading('5. Cronograma y entrega');
    l.pair('Inicio estimado', c.startDate, 'Entrega estimada', c.deliveryDate);
    l.text(
      'El cronograma se coordina con la entrega de los materiales y aprobaciones acordados. Las variaciones se documentarán entre las partes.',
    );
    l.heading('6. Obligaciones de TUKNEX');
    l.text(documentTerms.tuknex);
    l.heading('7. Obligaciones del cliente');
    l.text(documentTerms.client);
    l.heading('8. Conformidad y cumplimiento');
    l.text(documentTerms.compliance);
    l.y -= 6;
    l.text(documentTerms.conformity);
    l.heading('9. Condiciones particulares');
    l.text(c.conditions || documentTerms.exclusions);
    if (c.observations) l.field('Observaciones', c.observations);
    l.heading('10. Aceptación y firmas');
    l.text(
      'Las firmas se recaban fuera de esta plataforma. El estado del panel es un registro administrativo y no constituye una firma digital certificada.',
      9,
      l.font,
      muted,
    );
    l.ensure(150);
    l.y -= 48;
    const col = (l.contentWidth - 28) / 2;
    for (const [x, name, tax] of [
      [l.margin, c.client.name, c.client.taxId],
      [l.margin + col + 28, c.issuer.name, c.issuer.taxId],
    ] as [number, string, string][]) {
      l.page.drawLine({ start: { x, y: l.y }, end: { x: x + col, y: l.y }, thickness: 0.8, color: navy });
      let y = l.y - 18;
      for (const row of l.lines(name, l.bold, 10, col)) {
        l.page.drawText(row, { x, y, size: 10, font: l.bold, color: navy });
        y -= 14;
      }
      l.page.drawText('DNI / RUC: ' + clean(tax || '________________'), {
        x,
        y: y - 4,
        size: 9,
        font: l.font,
        color: muted,
      });
      l.page.drawText('Fecha: __________________', { x, y: y - 24, size: 9, font: l.font, color: muted });
    }
    l.y -= 110;
    return l.finish();
  }
  async document(kind: 'quote' | 'contract', id: string) {
    const table = kind === 'quote' ? 'cotizaciones' : 'contratos';
    const row = (await this.db.query('SELECT datos FROM ' + table + ' WHERE id=$1', [id])).rows[0];
    if (!row) throw new NotFoundException('Documento no encontrado.');
    const entity = row.datos as Contract | BillingQuote;
    const bytes =
      kind === 'quote'
        ? await this.quotePdf(entity as BillingQuote)
        : await this.contractPdf(entity as Contract);
    const docId = randomUUID();
    await this.db.query(
      'INSERT INTO documentos(id,tipo,entidad_id,version,contenido,sha256) VALUES($1,$2,$3,$4,$5,$6)',
      [docId, kind, id, entity.version, bytes, createHash('sha256').update(bytes).digest('hex')],
    );
    if (kind === 'contract')
      await this.db.query('UPDATE contratos SET pdf_url=$2 WHERE id=$1', [id, '/api/documents/' + docId]);
    return { bytes, filename: entity.number + '.pdf' };
  }
  async preliminary(body: unknown, reference?: string, snapshot?: Awaited<ReturnType<BillingService['settings']>>) {
    const schema = z
      .object({
        values: quoteFormSchema,
        mode: z.enum(['cash', 'half', 'three', 'weekly', 'fortnightly', 'monthly']),
        count: z.number().int().min(1).max(120),
        expectedMinCents: z.number().int().min(0),
      })
      .strict();
    const { values, mode, count, expectedMinCents } = parse(schema, body),
      settings = snapshot ?? await this.billing.settings(),
      estimate = estimateQuote(values, settings.prices || {}),
      today = todayLima();
    if (expectedMinCents !== Math.round(estimate.min * 100))
      throw new BadRequestException(
        'Las tarifas cambiaron. Vuelve a preparar la propuesta antes de descargar el PDF.',
      );
    const plan: PlanInput = { mode, rate: settings.rates[mode], count, firstDueDate: today };
    const calculation = buildPlan(Math.max(1, Math.round(estimate.min * 100)), plan);
    const quote: BillingQuote = {
      id: randomUUID(),
      number: reference || 'PRE-' + today.replaceAll('-', '') + '-' + randomUUID().slice(0, 8).toUpperCase(),
      clientId: '',
      client: {
        id: '',
        name: values.name || values.businessName || 'Cliente por confirmar',
        taxId: '',
        phone: values.phone,
        email: values.email,
        address: values.city,
        isDemo: false,
        createdAt: today,
      },
      issuer: settings.issuer,
      projectName: values.businessName || values.offering,
      service: values.projectType,
      scope: values.offering + '\n' + estimate.scope.map((s) => '- ' + s).join('\n'),
      observations: values.problem,
      conditions:
        estimate.conditions +
        '\n' +
        estimate.thirdPartyCosts.join('\n') +
        '\n' +
        estimate.exclusions.join('\n'),
      delivery: estimate.duration,
      ...calculation,
      schedule: calculation.installments,
      plan,
      status: 'draft',
      issuedDate: today,
      validUntil: addDays(today, estimate.validityDays),
      isDemo: false,
      version: 1,
    };
    return { bytes: await this.quotePdf(quote, true, estimate.custom), filename: quote.number + '.pdf' };
  }
}
