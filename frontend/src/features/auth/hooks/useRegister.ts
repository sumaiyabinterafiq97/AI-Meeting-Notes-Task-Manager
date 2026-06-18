import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../hooks/useAuth';
import type { RegisterFormData } from '../schemas/auth.schemas';

export function useRegister() {
  const { register } = useAuth();

  return useMutation({
    mutationFn: (data: RegisterFormData) => register(data),
  });
}
