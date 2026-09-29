import { useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Menu, ArrowLeft } from 'lucide-react';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { NotificationBell } from '../notifications/NotificationBell';
import { OnlineStatus } from './OnlineStatus';
import { useAuth } from '../../contexts/useAuth';

export function Header({
  onMenuClick,
  hasSidebar,
  sidebarExpanded = false,
}: {
  onMenuClick: () => void;
  hasSidebar: boolean;
  sidebarExpanded?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const showBack = !hasSidebar && location.pathname !== '/dashboard';

  return (
    <header
      className={clsx(
        'h-16 border-b border-border fixed top-0 left-0 right-0 z-30 flex items-center px-4 sm:px-6 transition-[padding] duration-300 print:hidden',
        hasSidebar && (sidebarExpanded ? 'lg:pl-72' : 'lg:pl-24')
      )}
      style={{ backgroundColor: 'var(--chrome-color, var(--color-primary))' }}
    >
      {hasSidebar && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 mr-2"
          aria-label="Abrir menú"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}
      {showBack && (
        <button
          onClick={() => navigate(-1)}
          className="p-2 mr-2 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors"
          aria-label="Retroceder"
          title="Retroceder"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      <div className="flex-1 flex items-center justify-between min-w-0">
        <h1 className="text-base sm:text-xl font-semibold text-white truncate">MatrixFlow Enterprise</h1>
        <div className="flex items-center gap-3 sm:gap-4">
          {user && !hasSidebar && (
            <span className="hidden md:block text-sm font-medium text-white truncate max-w-[180px]" title={user.name}>
              {user.name}
            </span>
          )}
          <NotificationBell />
          <OnlineStatus className="hidden sm:flex" />
          {user && (
            <span className={hasSidebar ? 'lg:hidden' : ''}>
              <ProfileAvatar
                size="sm"
                ringClassName="ring-2 ring-primary/20"
                dotBorderClassName="border-white"
              />
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
