import { useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import type { User, AuthResponse } from '../types';
import { authApi, clearTokens, setTokens } from '../services/api';
import { mockAuth } from '../services/mockApi';
import { can, type ModuleKey } from '../lib/permissions';
import { clearConsent, notifyConsentChanged } from '../lib/locationConsent';
import { readSecurity } from '../lib/systemPrefs';
import { AuthContext, type ProfilePatch } from './auth-context';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const PROFILE_KEY = 'mf_profile';

const readProfiles = (): Record<string, ProfilePatch> => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') as Record<string, ProfilePatch>;
  } catch {
    return {};
  }
};

const applyProfile = (target: User): User => {
  // el servidor es la fuente de verdad (nombre, rol, foto); el respaldo local
  // solo aporta la foto si el servidor aún no tiene una guardada
  const patch = readProfiles()[target.id] || {};
  return { ...target, avatar: target.avatar ?? patch.avatar ?? undefined };
};

const toMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string } | undefined;
    return data?.message || data?.detail || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(localStorage.getItem('accessToken')));

  const applySession = (data: AuthResponse) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(applyProfile(data.user));
  };

  const refreshUser = async () => {
    try {
      const meUser = USE_MOCK ? await mockAuth.me() : await authApi.me();
      setUser(applyProfile(meUser));
    } catch {
      setUser(null);
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem('accessToken')) {
      // Restauración de sesión al montar (localStorage -> API/mock)
      // eslint-disable-next-line react/set-state-in-effect
      void refreshUser();
    }
  }, []);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && localStorage.getItem('accessToken')) {
        refreshUser();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let lastActivity = Date.now();
    const touch = () => {
      lastActivity = Date.now();
    };
    const events: Array<keyof WindowEventMap> = [
      'mousemove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart',
    ];
    for (const eventName of events) window.addEventListener(eventName, touch, { passive: true });
    const timer = window.setInterval(() => {
      const security = readSecurity();
      if (!security.idleLock) {
        lastActivity = Date.now();
        return;
      }
      if (Date.now() - lastActivity >= security.sessionMinutes * 60000) {
        window.clearInterval(timer);
        if (!USE_MOCK) void authApi.logout().catch(() => undefined);
        clearTokens();
        setUser(null);
        window.location.href = '/login?motivo=inactividad';
      }
    }, 15000);
    return () => {
      for (const eventName of events) window.removeEventListener(eventName, touch);
      window.clearInterval(timer);
    };
  }, [userId]);

  const login = async (dni: string) => {
    try {
      const data = USE_MOCK ? await mockAuth.login({ dni }) : await authApi.login({ dni });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo iniciar sesión'));
    }
  };

  const loginWithFace = async (dni?: string, faceVector?: number[]) => {
    try {
      const data = USE_MOCK
        ? await mockAuth.loginWithFace({ dni })
        : await authApi.loginWithFace({ dni, faceVector });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo verificar el rostro'));
    }
  };

  const register = async (name: string, dni: string, faceVector?: number[] | null, facePoints?: number | null) => {
    try {
      const data = USE_MOCK
        ? await mockAuth.register({ name, dni })
        : await authApi.register({ name, dni, faceVector: faceVector ?? undefined, facePoints: facePoints ?? undefined });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo crear la cuenta'));
    }
  };

  const logout = () => {
    // best-effort: el backend purga la posición en RAM y apaga el rastreo
    if (!USE_MOCK) {
      void authApi.logout().catch(() => undefined);
    }
    clearConsent();
    notifyConsentChanged();
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (patch: ProfilePatch) => {
    if (!user) throw new Error('No hay una sesión activa');
    // persiste en el servidor (foto, nombre y rol viajan en la cuenta)
    let updated: User;
    try {
      const payload: { name?: string; role?: User['role']; avatar?: string | null } = {
        name: patch.name,
        role: patch.role,
      };
      if ('avatar' in patch) payload.avatar = patch.avatar ?? null;
      updated = USE_MOCK ? await mockAuth.updateMe(payload) : await authApi.updateMe(payload);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo guardar el perfil en el servidor'));
    }
    // respaldo local (compatibilidad con fotos antiguas)
    try {
      const profiles = readProfiles();
      profiles[user.id] = {
        name: updated.name,
        role: updated.role,
        avatar: updated.avatar ?? undefined,
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    } catch {
      // almacenamiento lleno: el cambio ya quedó guardado en el servidor
    }
    setUser(prev => (prev ? { ...prev, ...updated } : updated));
  };

  const canModule = (module: ModuleKey) => can(user?.role, module);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithFace, register, logout, refreshUser, updateProfile, can: canModule }}>
      {children}
    </AuthContext.Provider>
  );
}
