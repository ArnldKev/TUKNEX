'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { SceneGate } from './scene-gate';
import { TerminalFallback } from './interactive-hero-3d';
import type { ServiceSceneProps } from '@/lib/3d/types';
import './scenes.css';

const ServiceCanvas = dynamic(() => import('./service-scene-canvas'), { ssr: false });
const labels = {
  landing: 'Landing page',
  business: 'Web de negocio',
  catalog: 'Catálogo digital',
  store: 'Tienda online',
  system: 'Sistema web',
};

export function ServiceScene({ kind, className = '' }: ServiceSceneProps) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className={`tnx-service-stage ${className}`}
      aria-label={`Modelo de ${labels[kind]}; la demostración navegable se encuentra junto a esta vista`}
    >
      <SceneGate paused={failed} fallback={<TerminalFallback kind={kind} />}>
        <ServiceCanvas kind={kind} onFailure={() => setFailed(true)} />
      </SceneGate>
      <span className="tnx-model-label">
        <i />
        {labels[kind]} · concepto visual
      </span>
    </div>
  );
}
