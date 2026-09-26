import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Sidebar, Header } from './Sidebar';
import { SmokeField } from '../auth/SmokeField';
import { readBgMotion, BG_MOTION_EVENT } from '../../lib/bgMotion';
import { useAuth } from '../../contexts/useAuth';

export function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [bgMotion, setBgMotion] = useState(readBgMotion);
  const { user } = useAuth();
  const hasSidebar = user?.role === 'admin';

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

      <main className={clsx('pt-16 transition-all duration-300 print:pt-0', hasSidebar && 'lg:ml-16 print:ml-0')}>
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
