import { Link, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
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
import { resetPasswordSchema, type ResetPasswordFormData } from '../schemas/auth.schemas';
import { useResetPassword } from '../hooks/useResetPassword';

export function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') ?? '';
  const resetPasswordMutation = useResetPassword();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token: tokenFromUrl },
  });

  useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = handleSubmit(async (data) => {
    await resetPasswordMutation.mutateAsync({
      token: data.token,
      password: data.password,
    });
  });

  if (!tokenFromUrl) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invalid reset link</CardTitle>
          <CardDescription>
            This password reset link is missing or invalid. Request a new one below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            to={ROUTES.FORGOT_PASSWORD}
            className="text-sm font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (resetPasswordMutation.isSuccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Password updated</CardTitle>
          <CardDescription>Your password has been reset. You can now sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to={ROUTES.LOGIN} className="text-sm font-medium text-primary hover:underline">
            Go to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {resetPasswordMutation.isError && (
            <ErrorAlert
              message={getApiErrorMessage(resetPasswordMutation.error, 'Password reset failed')}
            />
          )}

          <input type="hidden" {...register('token')} />

          <FormField id="password" label="New password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register('password')}
              {...getFieldAriaProps(errors.password?.message, 'password')}
            />
          </FormField>

          <Button
            type="submit"
            className="w-full min-h-11"
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? 'Updating…' : 'Update password'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link to={ROUTES.LOGIN} className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
