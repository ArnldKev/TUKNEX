// Keep identical in frontend/src/lib/quote and backend/src/domain/quote.
import { z } from 'zod';
import type { QuoteInput } from '../pricing';
import { quoteFormSchema } from './form';

// Pricing receives choices only; extra requirements are represented by presence, never their text.
export const minimalEstimateSchema = quoteFormSchema.pick({
  projectType: true, features: true, design: true, timeline: true,
  productsRange: true, userRange: true,
}).partial({ productsRange: true, userRange: true }).extend({
  hasOtherFunctions: z.boolean(),
}).strict();
export type MinimalEstimateInput = z.infer<typeof minimalEstimateSchema>;

export function toMinimalEstimateInput(input: QuoteInput): MinimalEstimateInput {
  return minimalEstimateSchema.parse({
    projectType: input.projectType, features: input.features, design: input.design,
    timeline: input.timeline, productsRange: input.productsRange, userRange: input.userRange,
    hasOtherFunctions: Boolean(input.otherFunctions?.trim()),
  });
}

export function estimateInputToPricing(input: MinimalEstimateInput): QuoteInput {
  const { hasOtherFunctions, ...choices } = minimalEstimateSchema.parse(input);
  // The existing rule only checks nonempty text. This constant is used in memory for that rule.
  return { ...choices, otherFunctions: hasOtherFunctions ? 'requires-review' : '' };
}
