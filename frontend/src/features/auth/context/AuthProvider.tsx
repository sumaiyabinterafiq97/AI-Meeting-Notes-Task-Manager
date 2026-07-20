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

  const hydrateSession = useCallback(async () => {
    const { data: refreshData } = await authApi.refresh();
    setAccessToken(refreshData.accessToken);
    const { data: me } = await authApi.getMe();
    setUser(me);
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
        await hydrateSession();
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
  }, [clearSession, hydrateSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
      hydrateSession,
    }),
    [user, isInitializing, login, register, logout, hydrateSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
