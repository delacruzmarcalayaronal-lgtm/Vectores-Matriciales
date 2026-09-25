import { useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import type { User, AuthResponse } from '../types';
import { authApi, clearTokens, setTokens } from '../services/api';
import { mockAuth } from '../services/mockApi';
import { can, type ModuleKey } from '../lib/permissions';
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

const applyProfile = (target: User): User => ({ ...target, ...(readProfiles()[target.id] || {}) });

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

  const login = async (dni: string) => {
    try {
      const data = USE_MOCK ? await mockAuth.login({ dni }) : await authApi.login({ dni });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo iniciar sesión'));
    }
  };

  const loginWithFace = async (dni?: string) => {
    try {
      const data = USE_MOCK
        ? await mockAuth.loginWithFace({ dni })
        : await authApi.loginWithFace({ dni });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo verificar el rostro'));
    }
  };

  const register = async (name: string, dni: string) => {
    try {
      const data = USE_MOCK
        ? await mockAuth.register({ name, dni })
        : await authApi.register({ name, dni });
      applySession(data);
      setIsLoading(false);
    } catch (error) {
      throw new Error(toMessage(error, 'No se pudo crear la cuenta'));
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
  };

  const updateProfile = async (patch: ProfilePatch) => {
    if (!user) throw new Error('No hay una sesión activa');
    const profiles = readProfiles();
    profiles[user.id] = { ...profiles[user.id], ...patch };
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profiles));
    } catch {
      throw new Error('No se pudo guardar: el almacenamiento del navegador está lleno');
    }
    setUser(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const canModule = (module: ModuleKey) => can(user?.role, module);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, loginWithFace, register, logout, refreshUser, updateProfile, can: canModule }}>
      {children}
    </AuthContext.Provider>
  );
}
