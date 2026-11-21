'use client';

import { memo, useEffect, useMemo, useReducer, useRef, useState, type RefObject } from 'react';
import { ChevronDown, Expand, Palette, Sparkles } from 'lucide-react';
import {
  buildSolutionPreview,
  initialPreviewInteraction,
  previewInteractionReducer,
  type PreviewContext,
} from '@/lib/quote/preview';
import type { QuoteInput } from '@/lib/pricing';
import { ExpandedSolutionPreviewModal } from './expanded-solution-preview-modal';
import { SolutionPreviewMockup } from './solution-preview-mockup';
import './solution-preview.css';

export interface ExpandedPreviewControl {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}

export interface LiveSolutionPreviewProps {
  input: QuoteInput;
  businessName?: string;
  context?: PreviewContext;
  openOnMobile?: boolean;
  expandedPreview?: ExpandedPreviewControl;
}
const contextFields: (keyof PreviewContext)[] = [
  'goal',
  'sector',
  'offering',
  'stylePreference',
  'colorsLiked',
  'firstImpression',
  'visualPreferences',
];
const emptyContext: PreviewContext = {};

export const LiveSolutionPreview = memo(
  function LiveSolutionPreview({
    input,
    businessName = '',
    context = emptyContext,
    openOnMobile = false,
    expandedPreview,
  }: LiveSolutionPreviewProps) {
    const model = useMemo(
      () => buildSolutionPreview(input, businessName, context),
      [
        input.projectType,
        input.features,
        input.design,
        businessName,
        context.goal,
        context.sector,
        context.offering,
        context.stylePreference,
        context.colorsLiked,
        context.firstImpression,
        context.visualPreferences,
      ],
    );
    const [state, dispatch] = useReducer(previewInteractionReducer, undefined, initialPreviewInteraction);
    const [ownExpanded, setOwnExpanded] = useState(false);
    const [inlineOpen, setInlineOpen] = useState(false);
    const ownTriggerRef = useRef<HTMLButtonElement>(null);
    const previousKind = useRef(model.key);
    const expanded = expandedPreview?.open ?? ownExpanded;
    const setExpanded = expandedPreview?.onOpenChange ?? setOwnExpanded;
    const triggerRef = expandedPreview?.triggerRef ?? ownTriggerRef;
    useEffect(() => {
      const query = window.matchMedia('(min-width: 1024px)');
      const sync = () => setInlineOpen(query.matches || openOnMobile);
      sync();
      query.addEventListener('change', sync);
      return () => query.removeEventListener('change', sync);
    }, [openOnMobile]);
    useEffect(() => {
      if (previousKind.current === model.key) return;
      previousKind.current = model.key;
      dispatch({ type: 'reset' });
    }, [model.key]);

    return (
      <section className="live-solution-preview" aria-label="Vista previa en vivo de tu solución">
        <header className="lp-panel-heading">
          <div>
            <span className="lp-panel-icon"><Sparkles size={20} aria-hidden="true" /></span>
            <h3>Boceto de tu proyecto</h3>
          </div>
        </header>
        <p className="lp-panel-description">
          Explora cómo cambia la maqueta con tus respuestas.
        </p>
        <div className="lp-model-meta">
          <span>{model.solutionName}</span>
          <span>
            <Palette size={14} />
            <i style={{ background: model.palette.accent }} />
            {model.palette.name}
          </span>
          <span>{model.styleName}</span>
        </div>
        <p className="lp-style-description">{model.styleDescription}</p>
        <button
          type="button"
          className="lp-expand-button"
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            setExpanded(true);
          }}
          aria-haspopup="dialog"
          aria-expanded={expanded}
        >
          <Expand size={18} /> Expandir vista previa <span>↗</span>
        </button>
        <details
          className="lp-inline-details"
          open={inlineOpen}
          onToggle={(event) => setInlineOpen(event.currentTarget.open)}
        >
          <summary>
            <span>Ver maqueta lateral</span>
            <ChevronDown size={17} />
          </summary>
          {inlineOpen && !expanded && (
            <SolutionPreviewMockup model={model} state={state} onAction={dispatch} />
          )}
          {inlineOpen && expanded && (
            <p className="lp-open-placeholder">Estás explorando la maqueta en pantalla amplia.</p>
          )}
        </details>
        <p className="lp-panel-disclaimer">{model.disclaimer}</p>
        {model.featureLabels.length > 0 && (
          <div className="lp-included-summary">
            <strong>Va tomando forma con:</strong>
            <span>
              {model.featureLabels.slice(0, 3).join(' · ')}
              {model.featureLabels.length > 3 ? ' y ' + (model.featureLabels.length - 3) + ' más' : ''}.
            </span>
          </div>
        )}
        {expanded && (
          <ExpandedSolutionPreviewModal
            model={model}
            onClose={() => setExpanded(false)}
            returnFocusRef={triggerRef}
          >
            <SolutionPreviewMockup model={model} state={state} onAction={dispatch} expanded />
          </ExpandedSolutionPreviewModal>
        )}
      </section>
    );
  },
  (before, after) =>
    before.input.projectType === after.input.projectType &&
    before.input.design === after.input.design &&
    before.input.features === after.input.features &&
    before.businessName === after.businessName &&
    before.openOnMobile === after.openOnMobile &&
    before.expandedPreview === after.expandedPreview &&
    contextFields.every((field) => before.context?.[field] === after.context?.[field]),
);
