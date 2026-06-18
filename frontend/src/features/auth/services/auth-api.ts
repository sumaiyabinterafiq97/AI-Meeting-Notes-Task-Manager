import { apiClient } from '@/lib/api-client';
import type { AuthResponse, User } from '@/types';
import type {
  ForgotPasswordFormData,
  LoginFormData,
  RegisterFormData,
  ResetPasswordFormData,
} from '../schemas/auth.schemas';

export interface RefreshResponse {
  accessToken: string;
}

export interface MessageResponse {
  message: string;
}

export const authApi = {
  register: (data: RegisterFormData) => apiClient.post<AuthResponse>('/auth/register', data),

  login: (data: LoginFormData) => apiClient.post<AuthResponse>('/auth/login', data),

  logout: () => apiClient.post<void>('/auth/logout'),

  refresh: () => apiClient.post<RefreshResponse>('/auth/refresh'),

  forgotPassword: (data: Pick<ForgotPasswordFormData, 'email'>) =>
    apiClient.post<MessageResponse>('/auth/forgot-password', data),

  resetPassword: (data: Pick<ResetPasswordFormData, 'token' | 'password'>) =>
    apiClient.post<MessageResponse>('/auth/reset-password', data),

  getMe: () => apiClient.get<User>('/auth/me'),
};
