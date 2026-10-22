import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
export {
  clientDto,
  planDto,
  quoteDto,
  contractDto,
  statusDto,
  paymentDto,
  settingsDto,
  bridgeDto,
  voidDto,
} from '../domain/billing/schemas';
export function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues.map((i) => i.path.join('.') + ': ' + i.message).join('; '),
    );
  return result.data;
}
