export type ThemeMode =
  | 'light'
  | 'dark'
  | 'system'
  | 'midnight'
  | 'ocean'
  | 'matrix'
  | 'noir'
  | 'navy'
  | 'graphite'
  | 'cosmos';

const THEME_KEY = 'mf_theme';
export const DEFAULT_PRIMARY = '#2563EB';

const PRESET_DARK_CLASSES = [
  'theme-midnight',
  'theme-ocean',
  'theme-matrix',
  'theme-noir',
  'theme-navy',
  'theme-graphite',
  'theme-cosmos',
];

export const THEME_OPTIONS: ThemeMode[] = [
  'light',
  'dark',
  'system',
  'midnight',
  'ocean',
  'matrix',
  'noir',
  'navy',
  'graphite',
  'cosmos',
];

/** El color de acento lo define el tema (ya no hay selector independiente). */
export const THEME_ACCENTS: Record<ThemeMode, string> = {
  light: '#2563EB',
  dark: '#2563EB',
  system: '#2563EB',
  midnight: '#4338CA',
  ocean: '#0E7490',
  matrix: '#15803D',
  noir: '#94A3B8',
  navy: '#60A5FA',
  graphite: '#A1A1AA',
  cosmos: '#A78BFA',
};

export function accentForTheme(mode: ThemeMode): string {
  return THEME_ACCENTS[mode] || DEFAULT_PRIMARY;
}

export function getStoredTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return (THEME_OPTIONS as string[]).includes(value ?? '')
    ? (value as ThemeMode)
    : 'system';
}

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(mode: ThemeMode): { dark: boolean; preset: string | null } {
  if (mode === 'light') return { dark: false, preset: null };
  if (mode === 'system') return { dark: prefersDark(), preset: null };
  if (mode === 'dark') return { dark: true, preset: null };
  return { dark: true, preset: `theme-${mode}` };
}

function relativeLuminance(hex: string): number {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 1;
  const value = parseInt(match[1], 16);
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255)
  );
}

function mixWithWhite(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const mix = (raw: number) => Math.round(raw * 0.5 + 255 * 0.5);
  const parts = [(value >> 16) & 255, (value >> 8) & 255, value & 255].map(raw =>
    mix(raw).toString(16).padStart(2, '0'),
  );
  return `#${parts.join('')}`;
}

export function applyPrimary(color: string) {
  const root = document.documentElement;
  const base = /^#[0-9a-f]{6}$/i.test(color.trim()) ? color : DEFAULT_PRIMARY;
  root.style.setProperty('--color-primary', base);
  root.style.setProperty('--color-primary-base', base);
  // Acentos oscuros: variante legible para texto/iconos sobre fondos oscuros (tema dark)
  if (relativeLuminance(base) < 0.18) {
    root.style.setProperty('--color-primary-readable', mixWithWhite(base));
  } else {
    root.style.removeProperty('--color-primary-readable');
  }
}

export function applyTheme(mode: ThemeMode) {
  const { dark, preset } = resolve(mode);
  const root = document.documentElement;
  root.classList.toggle('dark', dark);
  for (const cls of PRESET_DARK_CLASSES) {
    root.classList.toggle(cls, cls === preset);
  }
}

export function setThemePreference(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
  applyPrimary(accentForTheme(mode));
}

export function initTheme() {
  const mode = getStoredTheme();
  applyTheme(mode);
  applyPrimary(accentForTheme(mode));
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system');
      applyPrimary(accentForTheme('system'));
    }
  });
}
