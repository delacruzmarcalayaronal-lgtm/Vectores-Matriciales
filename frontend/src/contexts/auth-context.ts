import { createContext } from 'react';
import type { User } from '../types';
import type { ModuleKey } from '../lib/permissions';

export type ProfilePatch = Partial<Pick<User, 'name' | 'role' | 'avatar'>>;

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dni: string) => Promise<void>;
  loginWithFace: (dni?: string, faceVector?: number[]) => Promise<void>;
  register: (name: string, dni: string, faceVector?: number[] | null, facePoints?: number | null) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
  can: (module: ModuleKey) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
