import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  History,
  Info,
  PackageMinus,
  ShieldAlert,
  ShoppingCart,
  Target,
  Trash2,
  CheckCheck,
} from 'lucide-react';
import type { AppNotification, NotificationType } from '../../types';
import { useAuth } from '../../contexts/useAuth';
import { useNotifications, useNotificationActions, useNotificationSync } from '../../hooks/useApi';

const TYPE_ICONS: Record<NotificationType, typeof Bell> = {
  stock: PackageMinus,
  target: Target,
  operation: History,
  system: Info,
  sales: ShoppingCart,
  security: ShieldAlert,
};

const timeAgo = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'ahora';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} d`;
};

export function NotificationBell() {
  const { user } = useAuth();
  const companyId = user?.companyId || '1';
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useNotifications(companyId);
  const actions = useNotificationActions(companyId);
  const sync = useNotificationSync(companyId);

  useEffect(() => {
    if (user) sync.mutate();
    // solo al montar: sincroniza condiciones del sistema (stock, metas, historial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = notifications.filter(n => !n.isDismissed);
  const unread = visible.filter(n => !n.isRead).length;

  const handleClick = (n: AppNotification) => {
    setOpen(false);
    if (!n.isRead) actions.read(n.id);
    navigate(n.link);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ''}`}
        onClick={() => setOpen(prev => !prev)}
        className={`relative p-2 rounded-lg border transition-colors ${
          open
            ? 'bg-white/25 border-white/40 text-white'
            : 'bg-white/15 border-transparent text-white hover:text-white hover:bg-white/25'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-text">Notificaciones</p>
              {visible.length > 0 && (
                <button
                  type="button"
                  onClick={() => actions.dismissAll()}
                  className="text-xs text-danger hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Borrar todas
                </button>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-0.5">
              <p className="text-xs text-secondary">
                {unread > 0 ? `${unread} sin leer` : 'Todo al día'}
              </p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => actions.readAll()}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-6 h-6 mx-auto text-secondary/50 mb-2" />
                <p className="text-sm text-secondary">No tienes notificaciones</p>
              </div>
            ) : (
              visible.slice(0, 20).map(n => {
                const Icon = TYPE_ICONS[n.type] || Info;
                return (
                  <div
                    key={n.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-surface-hover ${
                      !n.isRead && 'bg-primary/[0.04]'
                    }`}
                    onClick={() => handleClick(n)}
                  >
                    <span
                      className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        n.isRead ? 'bg-gray-100 text-secondary' : 'bg-primary/10 text-primary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text truncate">{n.title}</p>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-secondary line-clamp-2">{n.message}</p>
                      <p className="text-[11px] text-secondary/70 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Borrar notificación"
                      onClick={event => {
                        event.stopPropagation();
                        actions.dismiss(n.id);
                      }}
                      className="p-1.5 rounded-md text-secondary hover:text-danger hover:bg-danger/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
