export interface SceneHardware {
  hardwareConcurrency?: number;
  deviceMemory?: number;
  saveData?: boolean;
  coarsePointer?: boolean;
}
export interface SceneQuality {
  tier: 'static' | 'balanced' | 'high';
  enabled: boolean;
  dpr: number;
  shadows: boolean;
  antialias: boolean;
  shadowSize: number;
}
export function chooseSceneQuality(hardware: SceneHardware): SceneQuality {
  if (
    hardware.saveData ||
    (hardware.deviceMemory !== undefined && hardware.deviceMemory <= 2) ||
    (hardware.hardwareConcurrency !== undefined && hardware.hardwareConcurrency <= 2)
  ) {
    return { tier: 'static', enabled: false, dpr: 1, shadows: false, antialias: false, shadowSize: 256 };
  }
  const high =
    !hardware.coarsePointer && (hardware.hardwareConcurrency ?? 4) > 4 && (hardware.deviceMemory ?? 8) > 4;
  return high
    ? { tier: 'high', enabled: true, dpr: 1.5, shadows: true, antialias: true, shadowSize: 1024 }
    : { tier: 'balanced', enabled: true, dpr: 1, shadows: false, antialias: false, shadowSize: 512 };
}

/** One owner at a time; the next visible scene is granted the released slot. */
export class SceneBudget {
  private candidates = new Map<string, { priority: number; order: number; token: symbol }>();
  private active: string[] = [];
  private listeners = new Set<() => void>();
  private order = 0;
  private version = 0;
  constructor(private readonly limit = 1) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error('Scene budget must be a positive integer.');
  }
  getSnapshot = () => this.version;
  getServerSnapshot = () => 0;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  isGranted(id: string) {
    return this.active.includes(id);
  }
  request(id: string, priority = 0) {
    const token = Symbol(id);
    this.candidates.set(id, { priority, order: this.order++, token });
    this.reconcile();
    return () => {
      if (this.candidates.get(id)?.token !== token) return;
      this.candidates.delete(id);
      this.reconcile();
    };
  }
  private reconcile() {
    const next = [...this.candidates.entries()]
      .sort((a, b) => b[1].priority - a[1].priority || a[1].order - b[1].order)
      .slice(0, this.limit)
      .map(([id]) => id);
    if (next.join('|') === this.active.join('|')) return;
    this.active = next;
    this.version++;
    this.listeners.forEach((listener) => listener());
  }
}
