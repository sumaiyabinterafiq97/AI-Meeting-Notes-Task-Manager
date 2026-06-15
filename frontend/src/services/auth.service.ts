import { apiClient } from '@/lib/api-client';
import type { AuthResponse } from '@/types';

export const authService = {
  register: (data: { email: string; password: string; displayName: string }) =>
    apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  logout: () => apiClient.post('/auth/logout'),
};
