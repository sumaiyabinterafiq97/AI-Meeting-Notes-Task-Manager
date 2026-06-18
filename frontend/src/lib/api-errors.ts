import type { AxiosError } from 'axios';
import type { ApiError } from '@/types';

interface ApiErrorResponse {
  error: ApiError;
}

export function getApiError(error: unknown): ApiError {
  if (isAxiosApiError(error)) {
    return error.response!.data.error;
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }

  return { code: 'UNKNOWN', message: 'An unexpected error occurred' };
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error == null) {
    return fallback;
  }

  return getApiError(error).message || fallback;
}

export function getFieldErrors(error: unknown): Record<string, string> {
  const apiError = getApiError(error);
  if (!apiError.details?.length) {
    return {};
  }

  return apiError.details.reduce<Record<string, string>>((acc, detail) => {
    acc[detail.field] = detail.message;
    return acc;
  }, {});
}

function isAxiosApiError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as AxiosError<ApiErrorResponse>).response?.data?.error === 'object'
  );
}
