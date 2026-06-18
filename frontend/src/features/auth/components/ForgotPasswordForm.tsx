import { Link } from 'react-router-dom';
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
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../schemas/auth.schemas';
import { useForgotPassword } from '../hooks/useForgotPassword';

export function ForgotPasswordForm() {
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = handleSubmit(async (data) => {
    await forgotPasswordMutation.mutateAsync(data);
  });

  if (forgotPasswordMutation.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            If an account exists for that address, we&apos;ve sent password reset instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to={ROUTES.LOGIN}
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {forgotPasswordMutation.isError && (
            <ErrorAlert
              message={getApiErrorMessage(forgotPasswordMutation.error, 'Request failed')}
            />
          )}

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

          <Button
            type="submit"
            className="w-full min-h-11"
            disabled={forgotPasswordMutation.isPending}
          >
            {forgotPasswordMutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
