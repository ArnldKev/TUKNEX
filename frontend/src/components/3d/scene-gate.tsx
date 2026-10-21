'use client';

import { Component, useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { chooseSceneQuality, SceneBudget, type SceneQuality } from '@/lib/3d/runtime-policy';
import { SceneQualityContext } from './scene-quality';

let webGLSupported: boolean | undefined;
const sceneBudget = new SceneBudget(1);
function supportsWebGL() {
  if (webGLSupported !== undefined) return webGLSupported;
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    webGLSupported = !!context;
    if (context) (context as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webGLSupported = false;
  }
  return webGLSupported;
}
class SceneErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function SceneGate({
  children,
  fallback,
  paused = false,
  className = '',
  priority = 0,
}: {
  children: ReactNode;
  fallback: ReactNode;
  paused?: boolean;
  className?: string;
  priority?: number;
}) {
  const ref = useRef<HTMLDivElement>(null),
    id = useId();
  const [visible, setVisible] = useState(false),
    [pageVisible, setPageVisible] = useState(false),
    [enabled, setEnabled] = useState(false),
    [failed, setFailed] = useState(false);
  const [quality, setQuality] = useState<SceneQuality>(() => chooseSceneQuality({}));
  useSyncExternalStore(sceneBudget.subscribe, sceneBudget.getSnapshot, sceneBudget.getServerSnapshot);
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarse = window.matchMedia('(pointer: coarse)');
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const sync = () => {
      const next = chooseSceneQuality({
        hardwareConcurrency: nav.hardwareConcurrency,
        deviceMemory: nav.deviceMemory,
        coarsePointer: coarse.matches,
        saveData: nav.connection?.saveData,
      });
      setQuality(next);
      setEnabled(!reduced.matches && next.enabled && supportsWebGL());
    };
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible');
    sync();
    syncVisibility();
    reduced.addEventListener('change', sync);
    coarse.addEventListener('change', sync);
    document.addEventListener('visibilitychange', syncVisibility);
    let observer: IntersectionObserver | undefined;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
        { rootMargin: '0px', threshold: 0.01 },
      );
      if (ref.current) observer.observe(ref.current);
    } else setVisible(true);
    return () => {
      reduced.removeEventListener('change', sync);
      coarse.removeEventListener('change', sync);
      document.removeEventListener('visibilitychange', syncVisibility);
      observer?.disconnect();
    };
  }, []);
  const eligible = visible && pageVisible && enabled && !paused && !failed;
  useEffect(() => {
    if (eligible) return sceneBudget.request(id, priority);
  }, [eligible, id, priority]);
  const ready = eligible && sceneBudget.isGranted(id);
  return (
    <div
      ref={ref}
      className={'tnx-scene-gate ' + className}
      data-renderer={ready ? 'webgl' : 'static'}
      data-scene-quality={quality.tier}
    >
      {ready ? (
        <SceneQualityContext.Provider value={quality}>
          <SceneErrorBoundary fallback={fallback} onFailure={() => setFailed(true)}>
            {children}
          </SceneErrorBoundary>
        </SceneQualityContext.Provider>
      ) : (
        fallback
      )}
    </div>
  );
}
