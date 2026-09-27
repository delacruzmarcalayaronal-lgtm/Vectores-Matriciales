export type ThemeMode = 'light' | 'dark' | 'system' | 'midnight' | 'ocean' | 'matrix';

const THEME_KEY = 'mf_theme';
const PRIMARY_KEY = 'mf_primary_color';
export const DEFAULT_PRIMARY = '#2563EB';

const PRESET_DARK_CLASSES = ['theme-midnight', 'theme-ocean', 'theme-matrix'];

export const THEME_OPTIONS: ThemeMode[] = ['light', 'dark', 'system', 'midnight', 'ocean', 'matrix'];

export const TECH_COLORS = [
  { hex: '#2563EB', name: 'Blue' },
  { hex: '#3B82F6', name: 'Azure' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#22C55E', name: 'Green' },
  { hex: '#4ADE80', name: 'Neon' },
  { hex: '#84CC16', name: 'Lime' },
  { hex: '#EAB308', name: 'Yellow' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#D946EF', name: 'Fuchsia' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#6366F1', name: 'Indigo' },
];

export const TECH_COLORS_DARK = [
  { hex: '#1E3A8A', name: 'Navy' },
  { hex: '#075985', name: 'DeepSky' },
  { hex: '#155E75', name: 'Ocean' },
  { hex: '#134E4A', name: 'DeepTeal' },
  { hex: '#14532D', name: 'Forest' },
  { hex: '#3F6212', name: 'Moss' },
  { hex: '#92400E', name: 'Umber' },
  { hex: '#9A3412', name: 'Rust' },
  { hex: '#991B1B', name: 'Crimson' },
  { hex: '#9F1239', name: 'Rosewood' },
  { hex: '#6B21A8', name: 'Grape' },
  { hex: '#4C1D95', name: 'Iris' },
  { hex: '#3730A3', name: 'Indigo Dark' },
  { hex: '#1F2937', name: 'Graphite' },
];

export const TECH_COLOR_GROUPS: Array<{ title: string; colors: typeof TECH_COLORS }> = [
  { title: 'Colores vivos', colors: TECH_COLORS },
  { title: 'Colores oscuros', colors: TECH_COLORS_DARK },
];

export function getStoredTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY);
  return (THEME_OPTIONS as string[]).includes(value ?? '')
    ? (value as ThemeMode)
    : 'system';
}

export function getStoredPrimary(): string {
  return localStorage.getItem(PRIMARY_KEY) || DEFAULT_PRIMARY;
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

export function setPrimaryColor(color: string) {
  localStorage.setItem(PRIMARY_KEY, color);
  applyPrimary(color);
}

export function setThemePreference(mode: ThemeMode) {
  localStorage.setItem(THEME_KEY, mode);
  applyTheme(mode);
}

export function initTheme() {
  applyPrimary(getStoredPrimary());
  applyTheme(getStoredTheme());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'system') applyTheme('system');
  });
}
