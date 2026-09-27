import type { Role } from '../types';

export type ModuleKey =
  | 'dashboard'
  | 'empresa'
  | 'sucursales'
  | 'productos'
  | 'ventas'
  | 'inventario'
  | 'vectores'
  | 'matrices'
  | 'operaciones'
  | 'combinaciones'
  | 'historial'
  | 'reportes'
  | 'usuarios'
  | 'identidad'
  | 'geografia'
  | 'configuracion';

export const ALL_MODULES: ModuleKey[] = [
  'dashboard',
  'empresa',
  'sucursales',
  'productos',
  'ventas',
  'inventario',
  'vectores',
  'matrices',
  'operaciones',
  'combinaciones',
  'historial',
  'reportes',
  'usuarios',
  'identidad',
  'geografia',
  'configuracion',
];

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador General',
  manager: 'Gerente de Operaciones',
  analyst: 'Analista de Datos',
  operator: 'Operario de Caja',
};

export const ROLE_ICONS: Record<Role, string> = {
  admin: '👑',
  manager: '💼',
  analyst: '🔬',
  operator: '🛒',
};

export const ROLE_MODULES: Record<Role, ModuleKey[]> = {
  admin: ALL_MODULES,
  manager: ['dashboard', 'empresa', 'sucursales', 'productos', 'ventas', 'inventario', 'reportes', 'identidad', 'geografia', 'configuracion'],
  analyst: ['dashboard', 'vectores', 'matrices', 'operaciones', 'combinaciones', 'historial', 'identidad', 'configuracion'],
  operator: ['dashboard', 'ventas', 'inventario', 'identidad', 'configuracion'],
};

export function can(role: Role | undefined | null, module: ModuleKey): boolean {
  if (!role) return false;
  return ROLE_MODULES[role].includes(module);
}

export function modulesFor(role: Role | undefined | null): ModuleKey[] {
  if (!role) return [];
  return ROLE_MODULES[role];
}

const HOME_ORDER: ModuleKey[] = [
  'dashboard',
  'empresa',
  'ventas',
  'inventario',
  'vectores',
  'matrices',
  'operaciones',
  'combinaciones',
  'historial',
  'reportes',
  'geografia',
  'identidad',
  'usuarios',
  'configuracion',
];

export function firstAllowedPath(role: Role | undefined | null): string {
  const allowed = modulesFor(role);
  if (allowed.length === 0) return '/login';
  for (const module of HOME_ORDER) {
    if (allowed.includes(module)) return modulePath(module);
  }
  return '/login';
}

function modulePath(module: ModuleKey): string {
  switch (module) {
    case 'empresa': return '/empresa?tab=empresa';
    case 'sucursales': return '/empresa?tab=sucursales';
    case 'productos': return '/empresa?tab=productos';
    case 'ventas': return '/ventas';
    case 'inventario': return '/inventario';
    case 'vectores': return '/analisis?tab=vectores';
    case 'matrices': return '/analisis?tab=matrices';
    case 'operaciones': return '/analisis?tab=operaciones';
    case 'combinaciones': return '/analisis?tab=combinaciones-lineales';
    case 'historial': return '/historial';
    case 'reportes': return '/reportes';
    case 'usuarios': return '/usuarios';
    case 'identidad': return '/identidad';
    case 'geografia': return '/geografia';
    case 'configuracion': return '/configuracion';
    default: return '/dashboard';
  }
}

export function resolveModule(pathname: string, search: string): ModuleKey | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');

  switch (pathname) {
    case '/dashboard':
      return 'dashboard';
    case '/empresa':
      if (tab === 'sucursales') return 'sucursales';
      if (tab === 'productos') return 'productos';
      return 'empresa';
    case '/analisis':
      if (tab === 'matrices') return 'matrices';
      if (tab === 'operaciones') return 'operaciones';
      if (tab === 'combinaciones-lineales') return 'combinaciones';
      return 'vectores';
    case '/ventas':
      return 'ventas';
    case '/inventario':
      return 'inventario';
    case '/historial':
      return 'historial';
    case '/reportes':
      return 'reportes';
    case '/usuarios':
      return 'usuarios';
    case '/identidad':
      return 'identidad';
    case '/geografia':
      return 'geografia';
    case '/configuracion':
      return 'configuracion';
    default:
      return null;
  }
}

export function defaultTabFor(pathname: string, role: Role | undefined | null): string | null {
  const allowed = modulesFor(role);

  if (pathname === '/empresa') {
    if (allowed.includes('empresa')) return 'empresa';
    if (allowed.includes('sucursales')) return 'sucursales';
    if (allowed.includes('productos')) return 'productos';
  }

  if (pathname === '/analisis') {
    if (allowed.includes('vectores')) return 'vectores';
    if (allowed.includes('matrices')) return 'matrices';
    if (allowed.includes('operaciones')) return 'operaciones';
    if (allowed.includes('combinaciones')) return 'combinaciones-lineales';
  }

  return null;
}
