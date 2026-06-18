import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import type { LoginFormData } from '../schemas/auth.schemas';

export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: (data: LoginFormData) => login(data),
  });
}
