import {
  Building2,
  Package,
  ShoppingCart,
  Boxes,
  GitGraph,
  Calculator,
  History,
  FileText,
  Users,
  Settings,
  Layers,
  SlidersHorizontal,
  ScanFace,
  Map,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ModuleKey } from './permissions';

export type ModuleColor = 'primary' | 'accent' | 'success' | 'warning' | 'danger';

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  color: ModuleColor;
}

export const MODULES: ModuleMeta[] = [
  { key: 'empresa', label: 'Empresa', href: '/empresa?tab=empresa', icon: Building2, description: 'Información corporativa y configuración del negocio', color: 'primary' },
  { key: 'sucursales', label: 'Sucursales', href: '/empresa?tab=sucursales', icon: Building2, description: 'Administración de sedes y datos operativos', color: 'accent' },
  { key: 'productos', label: 'Productos', href: '/empresa?tab=productos', icon: Package, description: 'Catálogo, categorías y variables de análisis', color: 'success' },
  { key: 'ventas', label: 'Ventas', href: '/ventas', icon: ShoppingCart, description: 'Registro y análisis de cantidades e importes', color: 'warning' },
  { key: 'inventario', label: 'Inventario', href: '/inventario', icon: Boxes, description: 'Existencias y movimientos de stock', color: 'danger' },
  { key: 'vectores', label: 'Vectores', href: '/analisis?tab=vectores', icon: GitGraph, description: 'Representación de información empresarial unidimensional', color: 'primary' },
  { key: 'matrices', label: 'Matrices', href: '/analisis?tab=matrices', icon: Calculator, description: 'Representación de información multidimensional', color: 'accent' },
  { key: 'operaciones', label: 'Operaciones', href: '/analisis?tab=operaciones', icon: Layers, description: 'Ejecución de cálculos de álgebra lineal', color: 'success' },
  { key: 'combinaciones', label: 'Combinaciones Lineales', href: '/analisis?tab=combinaciones-lineales', icon: SlidersHorizontal, description: 'Combinaciones ponderadas de vectores', color: 'warning' },
  { key: 'historial', label: 'Historial', href: '/historial', icon: History, description: 'Trazabilidad de cálculos y resultados', color: 'danger' },
  { key: 'reportes', label: 'Reportes', href: '/reportes', icon: FileText, description: 'Indicadores, gráficos y exportaciones', color: 'primary' },
  { key: 'geografia', label: 'Mapa de Ubicaciones', href: '/geografia', icon: Map, description: 'Ubicación de personas por departamento y provincia', color: 'warning' },
  { key: 'usuarios', label: 'Usuarios', href: '/usuarios', icon: Users, description: 'Gestión de usuarios y roles', color: 'accent' },
  { key: 'identidad', label: 'Identidad Facial', href: '/identidad', icon: ScanFace, description: 'Registro y verificación de tu rostro', color: 'success' },
  { key: 'configuracion', label: 'Configuración', href: '/configuracion', icon: Settings, description: 'Parámetros del sistema', color: 'success' },
];

export const MODULE_COLOR_CLASSES: Record<ModuleColor, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};
