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

export function applyPrimary(color: string) {
  document.documentElement.style.setProperty('--color-primary', color);
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
