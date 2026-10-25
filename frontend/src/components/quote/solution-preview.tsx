'use client';

import { memo, useMemo } from 'react';
import { projectPreviewInput } from '@/lib/quote/project';
import { useQuoteProjectSession } from './project-session';
import type { PreviewContext } from '@/lib/quote/preview';
import type { QuoteInput } from '@/lib/pricing';
import { QuoteVisualEditor } from './visual-editor';
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
      visualPreferences: context?.visualPreferences ?? input.visualPreferences,
    }),
    [
      context?.goal,
      context?.sector,
      context?.offering,
      context?.stylePreference,
      context?.colorsLiked,
      context?.firstImpression,
      context?.visualPreferences,
      input.goal,
      input.sector,
      input.offering,
      input.stylePreference,
      input.colorsLiked,
      input.firstImpression,
      input.visualPreferences,
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

/** Preview and pricing derive from the same validated project revision. */
export const QuotePreviewPanel = memo(function QuotePreviewPanel({ disabled = false, onEdit }: { disabled?: boolean; onEdit?: () => void }) {
  const { history } = useQuoteProjectSession();
  const preview = useMemo(() => projectPreviewInput(history.present), [history.present]);
  return <><LiveSolutionPreview {...preview} /><QuoteVisualEditor disabled={disabled} />
    {onEdit && <button type="button" className="lp-expand-button qve-edit-result" onClick={onEdit}>Editar boceto y recalcular</button>}
  </>;
});
