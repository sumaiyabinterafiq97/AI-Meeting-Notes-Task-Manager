import { useCallback, useEffect, useMemo, useState } from 'react';
import { setAccessToken, setOnUnauthorized } from '@/lib/api-client';
import { authApi } from '../services/auth-api';
import type { LoginFormData, RegisterFormData } from '../schemas/auth.schemas';
import type { User } from '@/types';
import { AuthContext, type AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const establishSession = useCallback(async (accessToken: string, sessionUser: User) => {
    setAccessToken(accessToken);
    setUser(sessionUser);
  }, []);

  const login = useCallback(
    async (data: LoginFormData) => {
      const { data: response } = await authApi.login(data);
      await establishSession(response.accessToken, response.user);
    },
    [establishSession],
  );

  const register = useCallback(
    async (data: RegisterFormData) => {
      const { data: response } = await authApi.register(data);
      await establishSession(response.accessToken, response.user);
    },
    [establishSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearSession();
    });

    return () => setOnUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { data: refreshData } = await authApi.refresh();
        if (cancelled) return;

        setAccessToken(refreshData.accessToken);
        const { data: me } = await authApi.getMe();
        if (cancelled) return;

        setUser(me);
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsInitializing(false);
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, isInitializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
