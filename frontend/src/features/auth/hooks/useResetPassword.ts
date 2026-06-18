import { useMutation } from '@tanstack/react-query';
import { authApi } from '../services/auth-api';
import type { ResetPasswordFormData } from '../schemas/auth.schemas';

export function useResetPassword() {
  return useMutation({
    mutationFn: (data: Pick<ResetPasswordFormData, 'token' | 'password'>) =>
      authApi.resetPassword(data),
  });
}
