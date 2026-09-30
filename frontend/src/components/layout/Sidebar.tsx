import { NavLink, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Building2,
  ShoppingCart,
  Boxes,
  Calculator,
  History,
  FileText,
  Users,
  Settings,
  ScanFace,
  Map,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { useAuth } from '../../contexts/useAuth';
import { type ModuleKey } from '../../lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  module: ModuleKey;
}

const mainItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <Home className="w-5 h-5" />, module: 'dashboard' },
];

const moduleItems: NavItem[] = [
  { label: 'Empresa', href: '/empresa', icon: <Building2 className="w-5 h-5" />, module: 'empresa' },
  { label: 'Ventas', href: '/ventas', icon: <ShoppingCart className="w-5 h-5" />, module: 'ventas' },
  { label: 'Inventario', href: '/inventario', icon: <Boxes className="w-5 h-5" />, module: 'inventario' },
  { label: 'Análisis Matemático', href: '/analisis', icon: <Calculator className="w-5 h-5" />, module: 'vectores' },
  { label: 'Historial', href: '/historial', icon: <History className="w-5 h-5" />, module: 'historial' },
  { label: 'Reportes', href: '/reportes', icon: <FileText className="w-5 h-5" />, module: 'reportes' },
  { label: 'Usuarios', href: '/usuarios', icon: <Users className="w-5 h-5" />, module: 'usuarios' },
  { label: 'Configuración', href: '/configuracion', icon: <Settings className="w-5 h-5" />, module: 'configuracion' },
  { label: 'Mapa de Ubicaciones', href: '/geografia', icon: <Map className="w-5 h-5" />, module: 'geografia' },
  { label: 'Identidad Facial', href: '/identidad', icon: <ScanFace className="w-5 h-5" />, module: 'identidad' },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDesktop;
}

interface SidebarProps {
  isOpen: boolean;
  onNavigate?: () => void;
  onExpandedChange?: (expanded: boolean) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  analyst: 'Analista',
  operator: 'Operador',
  consulta: 'Consulta',
};

export function Sidebar({ isOpen, onNavigate, onExpandedChange }: SidebarProps) {
  const location = useLocation();
  const { can, user } = useAuth();
  const isDesktop = useIsDesktop();
  const [isHovered, setIsHovered] = useState(false);
  const expanded = !isDesktop || isHovered;

  useEffect(() => {
    onExpandedChange?.(expanded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const isItemAllowed = (item: NavItem) => {
    if (item.href === '/analisis') {
      return ['vectores', 'matrices', 'operaciones', 'combinaciones'].some(m => can(m as ModuleKey));
    }
    if (item.href === '/empresa') {
      return ['empresa', 'sucursales', 'productos'].some(m => can(m as ModuleKey));
    }
    return can(item.module);
  };

  const visibleModules = moduleItems.filter(isItemAllowed);

  const sectionLabel = (label: string, className?: string) => (
    <p
      className={clsx(
        'px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40',
        !expanded && 'sr-only',
        className
      )}
    >
      {label}
    </p>
  );

  const renderItem = (item: NavItem) => (
    <NavLink
      key={item.href}
      to={item.href}
      onClick={onNavigate}
      title={expanded ? undefined : item.label}
      className={() => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
        'text-white/80 hover:text-white hover:bg-white/10',
        isActive(item.href) && 'text-white bg-white/20'
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {expanded && <span className="font-medium truncate">{item.label}</span>}
    </NavLink>
  );

  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsHovered(false);
    }
  };

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen sidebar-gradient transition-all duration-300 z-50 flex flex-col w-64 print:hidden',
        expanded ? 'lg:w-64' : 'lg:w-16',
        isOpen || isDesktop ? 'translate-x-0' : '-translate-x-full'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={handleBlur}
      aria-label="Navegación principal"
    >
      <div className="flex items-center gap-2 h-16 px-4 border-b border-white/10">
        <NavLink
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 min-w-0"
          aria-label="MatrixFlow Home"
        >
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Calculator className="w-5 h-5 text-white" />
          </div>
          {expanded && <span className="font-bold text-white text-lg truncate">MatrixFlow</span>}
        </NavLink>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden" role="navigation" aria-label="Menú principal">
        {sectionLabel('Principal', 'pt-1')}
        {mainItems.map(renderItem)}

        {sectionLabel('Módulos', 'pt-4')}
        {visibleModules.map(renderItem)}
      </nav>

      <div className="p-3 border-t border-white/10 relative">
        <div className="flex items-center gap-3">
          <ProfileAvatar onClick={onNavigate} />
          {expanded && user && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate" title={user.name}>
                {user.name}
              </p>
              <p className="text-xs text-white/60 truncate">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

