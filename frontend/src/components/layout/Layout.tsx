import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { AlertTriangle } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SmokeField } from '../auth/SmokeField';
import { readBgMotion, BG_MOTION_EVENT } from '../../lib/bgMotion';
import { useAuth } from '../../contexts/useAuth';
import { LocationStatusBanner } from '../LocationStatusBanner';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import { readConsent, LOCATION_CONSENT_EVENT } from '../../lib/locationConsent';
import { readGeneral, PREFS_EVENT } from '../../lib/systemPrefs';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [bgMotion, setBgMotion] = useState(readBgMotion);
  const [consent, setConsent] = useState<'accepted' | 'denied' | null>(readConsent);
  const [generalPrefs, setGeneralPrefs] = useState(readGeneral);
  const { user } = useAuth();
  const hasSidebar = user?.role === 'admin';
  const { isTracking, permission, imprecise } = useLocationTracking(consent === 'accepted');

  useEffect(() => {
    const onChange = () => setGeneralPrefs(readGeneral());
    window.addEventListener(PREFS_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(PREFS_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setConsent(readConsent());
    window.addEventListener(LOCATION_CONSENT_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(LOCATION_CONSENT_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  useEffect(() => {
    const onChange = () => setBgMotion(readBgMotion());
    window.addEventListener(BG_MOTION_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(BG_MOTION_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isSidebarOpen]);

  return (
    <div className="relative min-h-screen bg-bg">
      {bgMotion.enabled && (
        <SmokeField density={bgMotion.density} speed={bgMotion.speed} interactive={bgMotion.interactive} />
      )}
      {hasSidebar && (
        <Sidebar
          isOpen={isSidebarOpen}
          onNavigate={() => setIsSidebarOpen(false)}
          onExpandedChange={setSidebarExpanded}
        />
      )}

      <Header
        onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
        hasSidebar={hasSidebar}
        sidebarExpanded={sidebarExpanded}
      />

      <main className={clsx('relative pt-16 transition-all duration-300 print:pt-0', hasSidebar && 'lg:ml-16 print:ml-0')}>
        {generalPrefs.maintenance && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-2.5 bg-warning/10 border-b border-warning/40 text-sm text-warning"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>Modo mantenimiento activo: la aplicación está en revisión y algunos cambios pueden demorarse.</span>
          </div>
        )}
        <LocationStatusBanner consent={consent} isTracking={isTracking} permission={permission} imprecise={imprecise} />
        <div className="p-4 sm:p-6 lg:p-8 print:p-0">
          <Outlet />
        </div>
      </main>

      {hasSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
