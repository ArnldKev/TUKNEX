'use client';

import { memo, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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

export interface LiveSolutionPreviewProps {
  input: QuoteInput;
  businessName?: string;
  context?: PreviewContext;
}
const contextFields: (keyof PreviewContext)[] = [
  'goal',
  'sector',
  'offering',
  'stylePreference',
  'colorsLiked',
  'firstImpression',
];
const emptyContext: PreviewContext = {};

export const LiveSolutionPreview = memo(
  function LiveSolutionPreview({
    input,
    businessName = '',
    context = emptyContext,
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
      ],
    );
    const [state, dispatch] = useReducer(previewInteractionReducer, undefined, initialPreviewInteraction);
    const [expanded, setExpanded] = useState(false),
      [inlineOpen, setInlineOpen] = useState(false);
    const expandRef = useRef<HTMLButtonElement>(null),
      previousKind = useRef(model.key);
    useEffect(() => {
      const query = window.matchMedia('(min-width: 1024px)');
      const sync = () => setInlineOpen(query.matches);
      sync();
      query.addEventListener('change', sync);
      return () => query.removeEventListener('change', sync);
    }, []);
    useEffect(() => {
      if (previousKind.current === model.key) return;
      previousKind.current = model.key;
      dispatch({ type: 'reset' });
    }, [model.key]);

    return (
      <section className="live-solution-preview" aria-label="Vista previa en vivo de tu solución">
        <header className="lp-panel-heading">
          <div>
            <span className="lp-panel-icon">
              <Sparkles size={20} />
            </span>
            <h3>
              Tu solución
              <br />
              <span>cobra forma.</span>
            </h3>
          </div>
          <span className="lp-live-badge">
            <i /> EN VIVO
          </span>
        </header>
        <p className="lp-panel-description">
          Una maqueta que cambia con tus respuestas. Explórala y empieza a imaginar tu proyecto.
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
        <button
          ref={expandRef}
          type="button"
          className="lp-expand-button"
          onClick={() => setExpanded(true)}
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
            returnFocusRef={expandRef}
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
    contextFields.every((field) => before.context?.[field] === after.context?.[field]),
);
