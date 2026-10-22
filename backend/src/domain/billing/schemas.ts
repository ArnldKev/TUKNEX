import { z } from 'zod';
import { validDate } from './finance';
import { contractStatuses, paymentModes, serviceLabels } from './types';
const text = (max = 300) => z.string().trim().max(max);
const date = z.string().refine(validDate, 'Fecha inválida (AAAA-MM-DD).');
const id = z.uuid();
const cents = z.number().int().min(1).max(1000000000);
export const clientDto = z
  .object({
    name: text(160).min(2),
    taxId: text(11).refine(
      (v) => v === '' || /^\d{8}$|^\d{11}$/.test(v),
      'DNI de 8 dígitos o RUC de 11 dígitos.',
    ),
    phone: text(30),
    email: z.union([z.literal(''), z.email()]),
    address: text(300),
    isDemo: z.boolean().default(false),
    legacyId: text(150).optional(),
  })
  .strict();
export const planDto = z
  .object({
    mode: z.enum(Object.keys(paymentModes) as [keyof typeof paymentModes, ...(keyof typeof paymentModes)[]]),
    rate: z.number().min(0).max(100),
    count: z.number().int().min(1).max(120),
    firstDueDate: date,
    lastDueDate: date.optional(),
    fixedAmountCents: cents.optional(),
    custom: z
      .array(z.object({ label: text(160).min(1), date, amountCents: cents }).strict())
      .max(120)
      .optional(),
  })
  .strict();
export const quoteDto = z
  .object({
    clientId: id,
    projectName: text(200).min(2),
    service: z.enum(Object.keys(serviceLabels) as [string, ...string[]]),
    scope: text(8000).min(5),
    observations: text(3000),
    conditions: text(5000),
    delivery: text(300).min(2),
    baseCents: cents,
    plan: planDto,
    status: z.enum(['draft', 'sent', 'accepted', 'rejected']),
    issuedDate: date,
    validUntil: date,
    legacyId: text(150).optional(),
    isDemo: z.boolean().default(false),
  })
  .strict();
export const contractDto = z
  .object({
    clientId: id,
    quoteId: id.optional(),
    projectId: id.optional(),
    projectName: text(200).min(2),
    service: z.enum(Object.keys(serviceLabels) as [string, ...string[]]),
    scope: text(8000).min(5),
    observations: text(3000),
    conditions: text(5000),
    issuedDate: date,
    startDate: date,
    deliveryDate: date,
    baseCents: cents,
    plan: planDto,
    isDemo: z.boolean().default(false),
    version: z.number().int().min(1).optional(),
  })
  .strict()
  .refine((v) => v.deliveryDate >= v.startDate, 'La entrega no puede ser anterior al inicio.');
export const statusDto = z
  .object({ status: z.enum(contractStatuses), version: z.number().int().min(1) })
  .strict();
export const paymentDto = z
  .object({
    installmentId: id.optional(),
    amountCents: cents,
    date,
    method: z.enum(['transferencia', 'yape', 'plin', 'efectivo', 'tarjeta', 'otro']),
    reference: text(120),
    observation: text(2000),
    receiptId: id.optional(),
    idempotencyKey: id,
  })
  .strict();
export const settingsDto = z
  .object({
    issuer: z
      .object({
        name: text(160).min(2),
        taxId: text(11).refine((v) => v === '' || /^\d{8}$|^\d{11}$/.test(v)),
        address: text(300),
        email: z.union([z.literal(''), z.email()]),
        phone: text(30),
      })
      .strict(),
    rates: z.record(z.string(), z.number().min(0).max(100)),
  })
  .strict();
export const bridgeDto = z.object({ client: clientDto, quote: quoteDto.omit({ clientId: true }) }).strict();
export const voidDto = z.object({ reason: text(1000).min(5) }).strict();
