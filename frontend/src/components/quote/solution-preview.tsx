'use client';

import { memo, useMemo } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { quoteDefaults, type QuoteFormValues } from '@/lib/quote/form';
import { PREVIEW_FIELDS, type PreviewContext } from '@/lib/quote/preview';
import type { QuoteInput } from '@/lib/pricing';
import { LiveSolutionPreview } from './live-solution-preview';

export { LiveSolutionPreview } from './live-solution-preview';
export { ExpandedSolutionPreviewModal } from './expanded-solution-preview-modal';

type CompatibleInput = QuoteInput & PreviewContext & { businessName?: string };

/** Existing integrations keep working; only visual fields are forwarded to the memoized view. */
export const SolutionPreview = memo(function SolutionPreview({
  input,
  businessName,
  context,
}: {
  input: CompatibleInput;
  businessName?: string;
  context?: PreviewContext;
}) {
  const visualContext = useMemo<PreviewContext>(
    () => ({
      goal: context?.goal ?? input.goal,
      sector: context?.sector ?? input.sector,
      offering: context?.offering ?? input.offering,
      stylePreference: context?.stylePreference ?? input.stylePreference,
      colorsLiked: context?.colorsLiked ?? input.colorsLiked,
      firstImpression: context?.firstImpression ?? input.firstImpression,
    }),
    [
      context?.goal,
      context?.sector,
      context?.offering,
      context?.stylePreference,
      context?.colorsLiked,
      context?.firstImpression,
      input.goal,
      input.sector,
      input.offering,
      input.stylePreference,
      input.colorsLiked,
      input.firstImpression,
    ],
  );
  return (
    <LiveSolutionPreview
      input={input}
      businessName={businessName ?? input.businessName}
      context={visualContext}
    />
  );
});

/** One isolated subscription, independent of contact fields, price fields and wizard navigation. */
export const QuotePreviewPanel = memo(function QuotePreviewPanel({
  control,
}: {
  control: Control<QuoteFormValues>;
}) {
  const [
    projectType,
    features,
    businessName,
    sector,
    offering,
    goal,
    design,
    stylePreference,
    colorsLiked,
    firstImpression,
  ] = useWatch({ control, name: PREVIEW_FIELDS, exact: true });
  const input = useMemo<QuoteInput>(
    () => ({
      projectType: projectType ?? quoteDefaults.projectType,
      features: features ?? quoteDefaults.features,
      design: design ?? quoteDefaults.design,
      timeline: 'standard',
    }),
    [projectType, features, design],
  );
  const context = useMemo<PreviewContext>(
    () => ({
      goal: goal ?? quoteDefaults.goal,
      sector: sector ?? quoteDefaults.sector,
      offering: offering ?? '',
      stylePreference: stylePreference ?? quoteDefaults.stylePreference,
      colorsLiked: colorsLiked ?? '',
      firstImpression: firstImpression ?? '',
    }),
    [goal, sector, offering, stylePreference, colorsLiked, firstImpression],
  );
  return <LiveSolutionPreview input={input} businessName={businessName ?? ''} context={context} />;
});
