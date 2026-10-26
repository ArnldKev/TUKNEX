'use client';

import { useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { Check, ChevronDown, Globe2, PackageSearch, MessageCircle, Workflow, ShoppingBag, RefreshCw, Lightbulb } from 'lucide-react';
import { money, PROJECT_TYPES, type ProjectType } from '@/lib/pricing';
import { defaultFeatures, goalRecommendations, type QuoteFormValues } from '@/lib/quote/form';
import { QuoteDetails, QuoteStepHelp, type QuoteStepProps } from './shared';

const objectives = [
  { id: 'visibility' as const, title: 'Dar a conocer mi negocio', example: 'Mostrar qué hago y cómo contactarme.', icon: Globe2 },
  { id: 'products' as const, title: 'Mostrar productos o un menú', example: 'Compartir lo que ofrezco con fotos y precios.', icon: PackageSearch },
  { id: 'sales' as const, title: 'Vender por internet', example: 'Recibir compras y cobrar desde mi web.', icon: ShoppingBag },
  { id: 'orders' as const, title: 'Recibir pedidos o consultas', example: 'Facilitar que me escriban por WhatsApp.', icon: MessageCircle },
  { id: 'organize' as const, title: 'Organizar mi trabajo', example: 'Llevar clientes, pedidos o inventario.', icon: Workflow },
  { id: 'unsure' as const, title: 'Tengo otra idea', example: 'Quiero contarla y ver qué necesito.', icon: Lightbulb },
];
export interface QuoteIdeaStepProps extends QuoteStepProps {
  chosen?: boolean;
  onGoalChosen?: () => void;
}
export function QuoteIdeaStep({ prices, chosen = true, onGoalChosen }: QuoteIdeaStepProps) {
  const { control, setValue, getValues } = useFormContext<QuoteFormValues>();
  const [goal, projectType] = useWatch({ control, name: ['goal', 'projectType'], exact: true });
  const [changing, setChanging] = useState(false);
  const changeButtonRef = useRef<HTMLButtonElement>(null);
  const selected = PROJECT_TYPES.find((project) => project.id === projectType)!;
  const recommendation = goalRecommendations[goal];
  function chooseGoal(next: QuoteFormValues['goal']) {
    setValue('goal', next, { shouldDirty: true });
    const recommended = goalRecommendations[next];
    if (recommended && recommended.type !== getValues('projectType')) {
      setValue('projectType', recommended.type, { shouldDirty: true });
      setValue('features', [...defaultFeatures[recommended.type]], { shouldDirty: true });
    }
    onGoalChosen?.();
  }
  function chooseType(type: ProjectType) {
    if (type !== getValues('projectType')) {
      setValue('projectType', type, { shouldDirty: true });
      setValue('features', [...defaultFeatures[type]], { shouldDirty: true });
    }
    onGoalChosen?.();
    setChanging(false);
    requestAnimationFrame(() => changeButtonRef.current?.focus());
  }
  return <>
    <div className="quote-objective-grid" role="group" aria-label="¿Qué quieres conseguir?">
      {objectives.map((item) => <button type="button" key={item.id}
        className={`quote-objective ${chosen && goal === item.id ? 'selected' : ''}`}
        aria-pressed={chosen && goal === item.id} onClick={() => chooseGoal(item.id)}>
        <item.icon size={25} aria-hidden="true" />
        <span><strong>{item.title}</strong><small>{item.example}</small></span>
        <span className="quote-radio" aria-hidden="true">{chosen && goal === item.id && <span />}</span>
      </button>)}
    </div>
    <div className="quote-recommendation">
      {chosen ? <>
        <span className="quote-eyebrow">PUNTO DE PARTIDA ORIENTATIVO</span>
        <div><h4>{selected.name}</h4><strong>{selected.price === null ? 'Evaluación personalizada' : `Desde ${money(prices[projectType] ?? selected.price)}`}</strong></div>
        <p>{recommendation?.type === projectType ? recommendation.reason : 'Podemos partir de esta opción y ajustarla con tus respuestas.'}</p>
      </> : <p>Elige lo que quieres conseguir. Después podrás ajustar el tipo de proyecto y sus funciones.</p>}
      <button type="button" ref={changeButtonRef} onClick={() => setChanging(value => !value)} aria-expanded={changing}>
        {chosen ? 'Cambiar tipo de proyecto' : 'Prefiero elegir el tipo de proyecto'} <ChevronDown size={17} aria-hidden="true" />
      </button>
      {changing && <div className="quote-project-grid" role="group" aria-label="Tipo de proyecto">
        {PROJECT_TYPES.map(project => <button type="button" key={project.id} aria-pressed={chosen && projectType === project.id}
          className={`quote-project-card ${chosen && projectType === project.id ? 'selected' : ''}`} onClick={() => chooseType(project.id)}>
          <strong>{project.name}</strong><p>{project.description}</p>
          <small>{project.price === null ? 'A evaluar' : `Desde ${money(prices[project.id] ?? project.price)}`}</small>
          {chosen && projectType === project.id && <Check size={18} aria-hidden="true" />}
        </button>)}
      </div>}
    </div>
    <QuoteDetails title="Ya tengo una web y quiero mejorarla">
      <button type="button" className={`quote-extra-goal ${chosen && goal === 'modernize' ? 'selected' : ''}`}
        aria-pressed={chosen && goal === 'modernize'} onClick={() => chooseGoal('modernize')}>
        <RefreshCw size={22} aria-hidden="true" /><span>Mejorar mi web actual<small>Revisar qué conservar y qué cambiar.</small></span>
      </button>
    </QuoteDetails>
    <QuoteStepHelp>Puedes cambiar de idea en cualquier paso. No necesitas saber de tecnología para empezar.</QuoteStepHelp>
  </>;
}
