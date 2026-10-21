'use client';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/** Interaction starts a short render burst; a settled showroom costs no animation frames. */
export function DemandInteractions() {
  const { gl, invalidate, pointer } = useThree();
  useEffect(() => {
    const canvas = gl.domElement;
    const redraw = () => invalidate();
    const leave = () => {
      pointer.set(0, 0);
      invalidate();
    };
    canvas.addEventListener('pointermove', redraw, { passive: true });
    canvas.addEventListener('pointerdown', redraw, { passive: true });
    canvas.addEventListener('pointerup', redraw, { passive: true });
    canvas.addEventListener('pointerleave', leave, { passive: true });
    return () => {
      canvas.removeEventListener('pointermove', redraw);
      canvas.removeEventListener('pointerdown', redraw);
      canvas.removeEventListener('pointerup', redraw);
      canvas.removeEventListener('pointerleave', leave);
    };
  }, [gl, invalidate, pointer]);
  return null;
}
