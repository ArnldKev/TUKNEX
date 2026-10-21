'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

/** Ignore intentional disposal during unmount/HMR; allow a transient GPU context to recover. */
export function ContextLifecycle({ onFailure }: { onFailure: () => void }) {
  const gl = useThree((state) => state.gl),
    failureRef = useRef(onFailure);
  failureRef.current = onFailure;
  useEffect(() => {
    const canvas = gl.domElement;
    let active = true,
      timer: number | undefined;
    const cancel = () => {
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timer = undefined;
      }
    };
    const lost = (event: Event) => {
      event.preventDefault();
      cancel();
      timer = window.setTimeout(() => {
        if (active && canvas.isConnected && gl.getContext().isContextLost()) failureRef.current();
      }, 900);
    };
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', cancel);
    return () => {
      active = false;
      cancel();
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', cancel);
    };
  }, [gl]);
  return null;
}
