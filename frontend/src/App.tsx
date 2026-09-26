import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initializeAuth } from './services/api';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Layout } from './components/layout/Layout';
import { LocationConsentModal } from './components/LocationConsentModal';
import { resolveModule, firstAllowedPath } from './lib/permissions';
import { hasConsent, LOCATION_CONSENT_EVENT } from './lib/locationConsent';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Empresa } from './pages/Empresa';
import { AnalisisMatematico } from './pages/AnalisisMatematico';
import { Sales } from './pages/Sales';
import { Inventory } from './pages/Inventory';
import { History } from './pages/History';
import { Reports } from './pages/Reports';
import { Users } from './pages/Users';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { Identity } from './pages/Identity';
import { GeoMap } from './pages/GeoMap';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

initializeAuth();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('accessToken');
  return token ? (
    <ModuleGuard>{children}</ModuleGuard>
  ) : (
    <Navigate to="/login" replace />
  );
};

const ModuleGuard = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-secondary text-sm">Cargando MatrixFlow…</div>
      </div>
    );
  }

  const module = resolveModule(location.pathname, location.search);
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (module && !can(module)) {
    return <Navigate to={firstAllowedPath(user.role)} replace />;
  }

  return <>{children}</>;
};

function LocationConsentGate() {
  const { user } = useAuth();
  const [decided, setDecided] = useState(() => hasConsent());

  useEffect(() => {
    const onChange = () => setDecided(hasConsent());
    window.addEventListener(LOCATION_CONSENT_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(LOCATION_CONSENT_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  return (
    <LocationConsentModal
      isOpen={Boolean(user) && !decided}
      onAccept={() => setDecided(true)}
      onDeny={() => setDecided(true)}
    />
  );
}

function AppRoutes() {
  return (
    <>
      <LocationConsentGate />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresa" element={<Empresa />} />
        <Route path="/analisis" element={<AnalisisMatematico />} />
        <Route path="/sucursales" element={<Navigate to="/empresa?tab=sucursales" replace />} />
        <Route path="/productos" element={<Navigate to="/empresa?tab=productos" replace />} />
        <Route path="/ventas" element={<Sales />} />
        <Route path="/inventario" element={<Inventory />} />
        <Route path="/vectores" element={<Navigate to="/analisis?tab=vectores" replace />} />
        <Route path="/matrices" element={<Navigate to="/analisis?tab=matrices" replace />} />
        <Route path="/operaciones" element={<Navigate to="/analisis?tab=operaciones" replace />} />
        <Route path="/combinaciones-lineales" element={<Navigate to="/analisis?tab=combinaciones-lineales" replace />} />
        <Route path="/historial" element={<History />} />
        <Route path="/reportes" element={<Reports />} />
        <Route path="/usuarios" element={<Users />} />
        <Route path="/identidad" element={<Identity />} />
        <Route path="/geografia" element={<GeoMap />} />
        <Route path="/configuracion" element={<Settings />} />
        <Route path="/perfil" element={<Profile />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;