'use client';
import { createContext, useContext } from 'react';
import { chooseSceneQuality, type SceneQuality } from '@/lib/3d/runtime-policy';
export const SceneQualityContext = createContext<SceneQuality>(chooseSceneQuality({}));
export function useSceneQuality() {
  return useContext(SceneQualityContext);
}
