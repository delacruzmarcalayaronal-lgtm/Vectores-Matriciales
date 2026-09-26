import { ShieldAlert, MapPinOff, MapPinCheck, RefreshCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { clearConsent, notifyConsentChanged } from '../lib/locationConsent';

interface LocationStatusBannerProps {
  consent: 'accepted' | 'denied' | null;
  isTracking: boolean;
  permission: string;
}

export function LocationStatusBanner({ consent, isTracking, permission }: LocationStatusBannerProps) {
  if (!consent && permission !== 'denied') return null;

  const reactivate = () => {
    clearConsent();
    notifyConsentChanged();
    window.location.reload();
  };

  if (permission === 'denied') {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-danger/10 border-b border-danger/30 text-sm text-danger print:hidden"
      >
        <span className="flex items-center gap-2">
          <MapPinOff className="w-4 h-4 shrink-0" />
          Permiso de ubicación denegado por el navegador
        </span>
        <button
          onClick={reactivate}
          className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reactivar
        </button>
      </div>
    );
  }

  if (consent === 'denied') {
    return (
      <div
        className="flex items-center justify-between gap-3 px-4 py-2 bg-warning/10 border-b border-warning/30 text-sm text-warning print:hidden"
      >
        <span className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          Rastreo desactivado
        </span>
        <button
          onClick={reactivate}
          className="inline-flex items-center gap-1 font-medium underline hover:no-underline"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reactivar
        </button>
      </div>
    );
  }

  if (consent === 'accepted') {
    return (
      <div
        className={clsx(
          'flex items-center justify-between gap-3 px-4 py-2 border-b text-sm print:hidden',
          isTracking
            ? 'bg-success/10 border-success/30 text-success'
            : 'bg-surface-hover border-border text-secondary'
        )}
      >
        <span className="flex items-center gap-2">
          <MapPinCheck className="w-4 h-4 shrink-0" />
          {isTracking ? 'Ubicación activa' : 'Ubicación en espera…'}
        </span>
        {isTracking && <span className="text-xs opacity-80">cada 60 s</span>}
      </div>
    );
  }

  return null;
}
