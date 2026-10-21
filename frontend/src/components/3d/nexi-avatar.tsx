'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Pause, Play, RotateCw } from 'lucide-react';
import { SceneGate } from './scene-gate';
import type { NexiAvatarProps } from '@/lib/3d/types';
import { brand } from '@/config/brand';
import './scenes.css';

const NexiCanvas = dynamic(() => import('./nexi-scene-canvas'), { ssr: false });
const angleOptions = [
  { label: 'Frente', value: 0 },
  { label: '¾', value: -0.52 },
  { label: 'Perfil', value: -Math.PI / 2 },
];

export function NexiAvatar({
  state = 'idle',
  compact = false,
  interactive = true,
  paused = false,
  className = '',
  name = brand.assistantName,
}: NexiAvatarProps) {
  const [muted, setMuted] = useState(false),
    [failed, setFailed] = useState(false),
    [angle, setAngle] = useState(-0.2);
  const fallback = (
    <div className="tnx-nexi-fallback">
      <img
        src="/images/nexi-fallback.svg"
        alt={`${name}, perrito crema de orejas caídas, ojos oscuros y collar turquesa`}
        width="320"
        height="360"
      />
      {!compact && <span>Vista ligera · animaciones pausadas, movimiento reducido o 3D no disponible</span>}
    </div>
  );
  if (compact)
    return (
      <figure
        className={'tnx-nexi tnx-nexi-compact tnx-nexi-mini ' + className}
        aria-label={name + ', ilustración ligera de tu compañero digital'}
        data-renderer="static-mini"
        data-state={state}
      >
        {fallback}
      </figure>
    );
  return (
    <figure
      className={`tnx-nexi ${compact ? 'tnx-nexi-compact' : ''} ${className}`}
      aria-label={`${name}, tu compañero digital. Modelo original de un perrito inspirado en las fotografías de referencia.`}
    >
      <SceneGate paused={paused || muted || failed} fallback={fallback}>
        <NexiCanvas
          state={state}
          compact={compact}
          interactive={interactive}
          angle={angle}
          onFailure={() => setFailed(true)}
        />
      </SceneGate>
      {!compact && (
        <figcaption>
          <span className="tnx-nexi-name">
            {name}
            <small>{brand.assistantSubtitle}</small>
          </span>
          {interactive && (
            <button
              type="button"
              className="tnx-motion-toggle"
              onClick={() => setMuted(!muted)}
              aria-pressed={muted}
              aria-label={muted ? 'Activar animaciones del perrito' : 'Pausar animaciones del perrito'}
            >
              {muted ? <Play size={14} /> : <Pause size={14} />}
              <span>{muted ? 'Animar' : 'Pausar'}</span>
            </button>
          )}
        </figcaption>
      )}
      {!compact && interactive && !paused && !muted && !failed && (
        <div className="tnx-nexi-views" role="group" aria-label={`Ángulos del modelo de ${name}`}>
          <RotateCw size={13} />
          {angleOptions.map((option) => (
            <button
              type="button"
              key={option.label}
              onClick={() => setAngle(option.value)}
              aria-pressed={Math.abs(angle - option.value) < 0.01}
            >
              {option.label}
            </button>
          ))}
          <span>También puedes arrastrar</span>
        </div>
      )}
    </figure>
  );
}
