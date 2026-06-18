import { createContext } from 'react';
import type { LoginFormData, RegisterFormData } from '../schemas/auth.schemas';
import type { User } from '@/types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (data: LoginFormData) => Promise<void>;
  register: (data: RegisterFormData) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
