import { z } from 'zod';
export const credentials = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(128),
}).strict();
export function normalizePhone(value: string) {
  const digits = value.replace(/[\s()-]/g,'');
  return /^9\d{8}$/.test(digits) ? '+51'+digits : digits;
}
export const phoneField = z.string().trim().transform(normalizePhone).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, 'Escribe el móvil con código de país; por ejemplo +51 y 9 dígitos.'));
export const dniField = z.string().trim().regex(/^\d{8}$/, 'El DNI debe tener 8 dígitos.');
export const clientRegistration = credentials.extend({phone:phoneField,dni:dniField,privacyConsent:z.literal(true)}).strict();
export function verificationPolicy() {
  return { emailRequired: process.env.NODE_ENV==='production' || process.env.REQUIRE_EMAIL_VERIFICATION==='true',
    phoneRequired: process.env.REQUIRE_PHONE_VERIFICATION==='true' };
}
