import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/auth-api';
import type { ForgotPasswordFormData } from '../schemas/auth.schemas';

export function useForgotPassword() {
  return useMutation({
    mutationFn: (data: Pick<ForgotPasswordFormData, 'email'>) => authApi.forgotPassword(data),
  });
}
