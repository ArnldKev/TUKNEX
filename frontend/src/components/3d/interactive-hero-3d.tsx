'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Globe2, Layers3, ShoppingBag } from 'lucide-react';
import { SceneGate } from './scene-gate';
import type { HeroSolution, InteractiveHero3DProps, ServiceKind } from '@/lib/3d/types';
import './scenes.css';

const HeroCanvas = dynamic(() => import('./hero-scene-canvas'), { ssr: false });
const solutions = [
  { id: 'web' as const, label: 'Web', description: 'Una gran primera impresión', Icon: Globe2 },
  { id: 'store' as const, label: 'Tienda', description: 'Tus productos, más lejos', Icon: ShoppingBag },
  { id: 'system' as const, label: 'Sistema', description: 'Todo bajo control', Icon: Layers3 },
];

export function TerminalFallback({ kind }: { kind: ServiceKind | HeroSolution }) {
  const commerce = kind === 'catalog' || kind === 'store',
    system = kind === 'system';
  return (
    <div
      className={`tnx-terminal-fallback ${commerce ? 'commerce' : ''} ${system ? 'system' : ''}`}
      aria-label="Vista estática de la solución: interfaz de demostración"
    >
      <div className="tnx-fallback-screen">
        <div className="tnx-fallback-browser">
          <i />
          <i />
          <i />
          <span>tu siguiente nivel.</span>
        </div>
        <div className="tnx-fallback-content">
          <span>
            {system ? 'TU NEGOCIO, CONECTADO' : commerce ? 'TU NUEVA VITRINA' : 'HECHO PARA IR MÁS ALLÁ'}
          </span>
          <strong>
            {system ? (
              <>
                Todo bajo
                <br />
                control.
              </>
            ) : commerce ? (
              <>
                Productos que
                <br />
                conectan.
              </>
            ) : (
              <>
                Tu próxima
                <br />
                gran idea.
              </>
            )}
          </strong>
          <div className="tnx-fallback-tiles">
            <i />
            <i />
            <i />
          </div>
          <b>{system ? 'Vista general' : commerce ? 'Explorar colección' : 'Descubre más'} ↗</b>
        </div>
      </div>
      <div className="tnx-fallback-base" />
      <small>Vista estática · alternativa accesible al 3D</small>
    </div>
  );
}

export function InteractiveHero3D({ selected, onSelect, className = '' }: InteractiveHero3DProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={`tnx-hero-stage ${className}`}>
      <SceneGate paused={failed} fallback={<TerminalFallback kind={selected} />}>
        <HeroCanvas selected={selected} onSelect={onSelect} onFailure={() => setFailed(true)} />
      </SceneGate>
      <div className="tnx-scene-controls" role="group" aria-label="Explora tres soluciones de TUKNEX">
        {solutions.map(({ id, label, description, Icon }) => (
          <button
            type="button"
            key={id}
            onClick={() => onSelect(id)}
            aria-pressed={selected === id}
            title={description}
          >
            <Icon size={16} />
            <span>{label}</span>
            <i />
          </button>
        ))}
      </div>
      <p className="tnx-scene-caption">Selecciona una solución · Arrastra para explorar</p>
    </div>
  );
}
