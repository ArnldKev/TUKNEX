export type HeroSolution = 'web' | 'store' | 'system';
export type ServiceKind = 'landing' | 'business' | 'catalog' | 'store' | 'system';
export type NexiState = 'idle' | 'wave' | 'listening' | 'thinking' | 'celebrate';

export interface InteractiveHero3DProps {
  selected: HeroSolution;
  onSelect: (solution: HeroSolution) => void;
  className?: string;
}

export interface ServiceSceneProps {
  kind: ServiceKind;
  className?: string;
}

export interface NexiAvatarProps {
  state?: NexiState;
  compact?: boolean;
  interactive?: boolean;
  paused?: boolean;
  className?: string;
  name?: string;
}
