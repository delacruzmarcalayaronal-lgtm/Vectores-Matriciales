export type BgDensity = 'low' | 'medium' | 'high';

export interface BgMotionConfig {
  enabled: boolean;
  density: BgDensity;
  speed: number;
  interactive: boolean;
}

export const BG_MOTION_KEY = 'mf_bg_motion';
export const BG_MOTION_EVENT = 'mf:bg-motion-change';

export const DEFAULT_BG_MOTION: BgMotionConfig = {
  enabled: true,
  density: 'medium',
  speed: 1,
  interactive: true,
};

export function readBgMotion(): BgMotionConfig {
  try {
    const raw = localStorage.getItem(BG_MOTION_KEY);
    if (!raw) return DEFAULT_BG_MOTION;
    const parsed = JSON.parse(raw);
    return {
      enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_BG_MOTION.enabled,
      density:
        parsed.density === 'low' || parsed.density === 'high'
          ? parsed.density
          : DEFAULT_BG_MOTION.density,
      speed:
        typeof parsed.speed === 'number'
          ? Math.min(2, Math.max(0.25, parsed.speed))
          : DEFAULT_BG_MOTION.speed,
      interactive:
        typeof parsed.interactive === 'boolean'
          ? parsed.interactive
          : DEFAULT_BG_MOTION.interactive,
    };
  } catch {
    return DEFAULT_BG_MOTION;
  }
}

export function writeBgMotion(config: BgMotionConfig): void {
  try {
    localStorage.setItem(BG_MOTION_KEY, JSON.stringify(config));
  } catch {
    // almacenamiento no disponible: la config solo vivirá en memoria
  }
  window.dispatchEvent(new Event(BG_MOTION_EVENT));
}
