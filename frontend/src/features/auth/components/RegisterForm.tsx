import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorAlert } from '@/components/common/ErrorAlert';
import { FormField } from '@/components/common/FormField';
import { getFieldAriaProps } from '@/components/common/form-field-aria';
import { ROUTES } from '@/lib/constants';
import { getApiErrorMessage } from '@/lib/api-errors';
import { registerSchema, type RegisterFormData } from '../schemas/auth.schemas';
import { useRegister } from '../hooks/useRegister';

export function RegisterForm() {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    try {
      await registerMutation.mutateAsync(data);
      navigate(ROUTES.WORKSPACES, { replace: true });
    } catch {
      // Error displayed via mutation state
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Get started with AI-powered meeting notes and tasks.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {registerMutation.isError && (
            <ErrorAlert
              message={getApiErrorMessage(registerMutation.error, 'Registration failed')}
            />
          )}

          <FormField id="displayName" label="Display name" error={errors.displayName?.message}>
            <Input
              id="displayName"
              autoComplete="name"
              placeholder="Alex Johnson"
              {...register('displayName')}
              {...getFieldAriaProps(errors.displayName?.message, 'displayName')}
            />
          </FormField>

          <FormField id="email" label="Email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...register('email')}
              {...getFieldAriaProps(errors.email?.message, 'email')}
            />
          </FormField>

          <FormField id="password" label="Password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              {...getFieldAriaProps(errors.password?.message, 'password')}
            />
          </FormField>

          <Button type="submit" className="w-full min-h-11" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
