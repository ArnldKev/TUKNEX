'use client';

import { useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import {
  ArrowRight,
  Check,
  ChevronDown,
  Globe2,
  PackageSearch,
  MessageCircle,
  Workflow,
  ShoppingBag,
  RefreshCw,
} from 'lucide-react';
import { brand } from '@/config/brand';
import { money, PROJECT_TYPES, type ProjectType } from '@/lib/pricing';
import { defaultFeatures, goalRecommendations, type QuoteFormValues } from '@/lib/quote/form';
import { QuoteDetails, QuoteStepHelp, type QuoteStepProps } from './shared';

const objectives = [
  {
    id: 'visibility' as const,
    title: 'Que conozcan mi negocio',
    example: 'Presentar lo que hago y cómo contactarme.',
    icon: Globe2,
  },
  {
    id: 'products' as const,
    title: 'Mostrar productos o mi menú',
    example: 'Una vitrina que pueda compartir fácilmente.',
    icon: PackageSearch,
  },
  {
    id: 'orders' as const,
    title: 'Recibir pedidos y consultas',
    example: 'Facilitar que me escriban por WhatsApp.',
    icon: MessageCircle,
  },
  {
    id: 'organize' as const,
    title: 'Organizar clientes o inventario',
    example: 'Dedicar menos tiempo a tareas manuales.',
    icon: Workflow,
  },
];
export function QuoteIdeaStep({ prices }: QuoteStepProps) {
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
  }
  function chooseType(type: ProjectType) {
    setValue('projectType', type, { shouldDirty: true });
    setValue('features', [...defaultFeatures[type]], { shouldDirty: true });
    setChanging(false);
    requestAnimationFrame(() => changeButtonRef.current?.focus());
  }
  return (
    <>
      <div className="quote-objective-grid" role="group" aria-label="Objetivo principal">
        {objectives.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`quote-objective ${goal === item.id ? 'selected' : ''}`}
            aria-pressed={goal === item.id}
            onClick={() => chooseGoal(item.id)}
          >
            <item.icon size={25} />
            <span>
              <strong>{item.title}</strong>
              <small>{item.example}</small>
            </span>
            <span className="quote-radio">{goal === item.id && <span />}</span>
          </button>
        ))}
      </div>
      <div className="quote-recommendation">
        <span className="quote-eyebrow">TU PUNTO DE PARTIDA</span>
        <div>
          <h4>{selected.name}</h4>
          <strong>
            {selected.price === null
              ? 'Evaluación personalizada'
              : `Desde ${money(prices[projectType] ?? selected.price)}`}
          </strong>
        </div>
        <p>
          {recommendation?.type === projectType
            ? recommendation.reason
            : 'Esta es tu opción elegida. Puedes ajustarla antes de preparar la propuesta.'}
        </p>
        <button
          type="button"
          ref={changeButtonRef}
          onClick={() => setChanging((value) => !value)}
          aria-expanded={changing}
        >
          Cambiar solución <ChevronDown size={17} />
        </button>
        {changing && (
          <div className="quote-project-grid" role="group" aria-label="Cambiar solución recomendada">
            {PROJECT_TYPES.map((project) => (
              <button
                type="button"
                key={project.id}
                aria-pressed={projectType === project.id}
                className={`quote-project-card ${projectType === project.id ? 'selected' : ''}`}
                onClick={() => chooseType(project.id)}
              >
                <strong>{project.name}</strong>
                <p>{project.description}</p>
                <small>
                  {project.price === null
                    ? 'A evaluar'
                    : `Desde ${money(prices[project.id] ?? project.price)}`}
                </small>
                {projectType === project.id && <Check size={18} />}
              </button>
            ))}
          </div>
        )}
      </div>
      <QuoteDetails title="Tengo otro objetivo">
        <button
          type="button"
          className={`quote-extra-goal ${goal === 'sales' ? 'selected' : ''}`}
          aria-pressed={goal === 'sales'}
          onClick={() => chooseGoal('sales')}
        >
          <ShoppingBag size={22} />
          <span>
            Quiero vender y cobrar por internet<small>Revisaremos pagos, entregas e integraciones.</small>
          </span>
        </button>
        <button
          type="button"
          className={`quote-extra-goal ${goal === 'modernize' ? 'selected' : ''}`}
          aria-pressed={goal === 'modernize'}
          onClick={() => chooseGoal('modernize')}
        >
          <RefreshCw size={22} />
          <span>
            Quiero mejorar la web que ya tengo<small>Conservamos lo útil y revisamos lo que falta.</small>
          </span>
        </button>
      </QuoteDetails>
      <button
        type="button"
        className="quote-uncertain"
        onClick={() => {
          setValue('goal', 'unsure');
          window.dispatchEvent(new Event('open-tuknex-chat'));
        }}
      >
        <MessageCircle size={21} />
        <span>No estoy seguro. Quiero hablar con {brand.assistantName}.</span>
        <ArrowRight size={18} />
      </button>
      <QuoteStepHelp>
        Empieza por lo que quieres conseguir. La solución se puede cambiar y esta estimación no requiere
        iniciar sesión.
      </QuoteStepHelp>
    </>
  );
}
